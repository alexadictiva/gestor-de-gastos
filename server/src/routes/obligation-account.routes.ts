import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  normalizePaymentMethod,
  type PaymentMethod,
} from '../lib/transaction-fields'
import {
  authMiddleware,
  type AuthRequest,
} from '../middlewares/auth.middleware'

const router = Router()
const REFERENCE_MONTH_PATTERN = /^\d{4}-\d{2}$/
const ALLOWED_ACCOUNT_TYPES = [
  'credit_card',
  'loan_payable',
  'loan_receivable',
] as const

type ObligationAccountType = (typeof ALLOWED_ACCOUNT_TYPES)[number]
type LinkedPaymentTransactionType = 'expense' | 'income'

function isLoanAccountType(type: ObligationAccountType) {
  return type === 'loan_payable' || type === 'loan_receivable'
}

function supportsInstallmentPlanType(type: ObligationAccountType) {
  return type === 'credit_card' || isLoanAccountType(type)
}

function buildObligationAccountInclude() {
  return {
    obligations: {
      orderBy: [
        {
          dueDate: 'asc' as const,
        },
        {
          createdAt: 'asc' as const,
        },
      ],
      include: {
        payments: {
          orderBy: [
            {
              paymentDate: 'desc' as const,
            },
            {
              createdAt: 'desc' as const,
            },
          ],
        },
      },
    },
  }
}

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function parseDate(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return null
  }

  const parsedDate = new Date(`${trimmedValue}T00:00:00.000Z`)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

function normalizeAccountType(rawValue: string): ObligationAccountType | null {
  const normalizedValue = rawValue.trim().toLowerCase()

  if (
    ALLOWED_ACCOUNT_TYPES.includes(
      normalizedValue as ObligationAccountType
    )
  ) {
    return normalizedValue as ObligationAccountType
  }

  return null
}

function parseOptionalPositiveNumber(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return null
  }

  const parsedValue = Number(trimmedValue)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return Number.NaN
  }

  return roundAmount(parsedValue)
}

function parseOptionalMonthDay(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return null
  }

  const parsedValue = Number(trimmedValue)

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 31
  ) {
    return Number.NaN
  }

  return parsedValue
}

function parseOptionalPositiveInteger(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return null
  }

  const parsedValue = Number(trimmedValue)

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return Number.NaN
  }

  return parsedValue
}

function normalizeOptionalText(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  return trimmedValue ? trimmedValue : null
}

function getPaymentCategory(accountType: ObligationAccountType) {
  switch (accountType) {
    case 'credit_card':
      return 'pagos de deuda'
    case 'loan_payable':
      return 'pagos de deuda'
    default:
      return 'cobros de deuda'
  }
}

function buildLinkedPaymentTransactionType(
  accountType: ObligationAccountType
): LinkedPaymentTransactionType {
  return accountType === 'loan_receivable' ? 'income' : 'expense'
}

function buildLinkedPaymentTransactionDescription(
  accountName: string,
  obligationTitle: string,
  accountType: ObligationAccountType
) {
  const normalizedDetail = obligationTitle.startsWith(`${accountName} - `)
    ? obligationTitle
    : `${accountName} - ${obligationTitle}`

  return accountType === 'loan_receivable'
    ? `Cobro de deuda: ${normalizedDetail}`
    : `Pago de deuda: ${normalizedDetail}`
}

function buildReferenceMonthFromDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function buildInstallmentDueDate(sourceDate: Date, installmentIndex: number) {
  const sourceDay = sourceDate.getUTCDate()
  const targetYear = sourceDate.getUTCFullYear()
  const targetMonthIndex = sourceDate.getUTCMonth() + installmentIndex
  const targetMonthStart = new Date(Date.UTC(targetYear, targetMonthIndex, 1))
  const safeYear = targetMonthStart.getUTCFullYear()
  const safeMonthIndex = targetMonthStart.getUTCMonth()
  const lastDayOfMonth = new Date(
    Date.UTC(safeYear, safeMonthIndex + 1, 0)
  ).getUTCDate()
  const safeDay = Math.min(sourceDay, lastDayOfMonth)

  return new Date(Date.UTC(safeYear, safeMonthIndex, safeDay))
}

function splitAmountAcrossInstallments(totalAmount: number, installmentCount: number) {
  const totalCents = Math.round(totalAmount * 100)
  const baseInstallmentCents = Math.floor(totalCents / installmentCount)
  let remainderCents = totalCents - baseInstallmentCents * installmentCount

  return Array.from({ length: installmentCount }, () => {
    const currentInstallmentCents =
      baseInstallmentCents + (remainderCents > 0 ? 1 : 0)

    if (remainderCents > 0) {
      remainderCents -= 1
    }

    return currentInstallmentCents / 100
  })
}

function buildObligationTotals(obligation: {
  principalAmount: number
  interestAmount: number
  payments: Array<{ amount: number }>
}) {
  const totalAmount = roundAmount(
    obligation.principalAmount + obligation.interestAmount
  )
  const paidAmount = roundAmount(
    obligation.payments.reduce(
      (accumulator, payment) => accumulator + payment.amount,
      0
    )
  )
  const remainingAmount = roundAmount(Math.max(totalAmount - paidAmount, 0))

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
    nextStatus: remainingAmount <= 0.01 ? 'settled' : 'open',
  }
}

async function getAccountWithDetails(accountId: string, userId: string) {
  return prisma.obligationAccount.findFirst({
    where: {
      id: accountId,
      userId,
    },
    include: buildObligationAccountInclude(),
  })
}

function validateAccountInput(body: Record<string, unknown>) {
  const trimmedName = String(body.name ?? '').trim()
  const normalizedType = normalizeAccountType(String(body.type ?? ''))
  const creditLimit = parseOptionalPositiveNumber(body.creditLimit)
  const closingDay = parseOptionalMonthDay(body.closingDay)
  const dueDay = parseOptionalMonthDay(body.dueDay)
  const loanTotalAmount = parseOptionalPositiveNumber(body.loanTotalAmount)
  const installmentCount = parseOptionalPositiveInteger(body.installmentCount)
  const loanFirstDueDate = parseDate(body.loanFirstDueDate)
  const notes = normalizeOptionalText(body.notes)

  if (!trimmedName || !normalizedType) {
    return {
      error: 'Debes completar el nombre y el tipo de cuenta',
    }
  }

  if (Number.isNaN(creditLimit)) {
    return {
      error: 'El limite de credito debe ser mayor a cero',
    }
  }

  if (Number.isNaN(closingDay) || Number.isNaN(dueDay)) {
    return {
      error: 'Los dias de cierre y vencimiento deben estar entre 1 y 31',
    }
  }

  if (Number.isNaN(loanTotalAmount)) {
    return {
      error: 'El monto total del prestamo debe ser mayor a cero',
    }
  }

  if (Number.isNaN(installmentCount)) {
    return {
      error: 'La cantidad de cuotas debe ser un numero entero mayor a cero',
    }
  }

  if (
    body.loanFirstDueDate !== undefined &&
    body.loanFirstDueDate !== null &&
    String(body.loanFirstDueDate).trim() &&
    !loanFirstDueDate
  ) {
    return {
      error: 'La fecha de la primera cuota no es valida',
    }
  }

  if (
    isLoanAccountType(normalizedType) &&
    (loanTotalAmount === null ||
      installmentCount === null ||
      loanFirstDueDate === null)
  ) {
    return {
      error:
        'Debes completar el monto total, la cantidad de cuotas y la fecha de la primera cuota para un prestamo',
    }
  }

  const hasSomeInstallmentPlanFields =
    loanTotalAmount !== null ||
    installmentCount !== null ||
    loanFirstDueDate !== null
  const hasAllInstallmentPlanFields =
    loanTotalAmount !== null &&
    installmentCount !== null &&
    loanFirstDueDate !== null

  if (
    normalizedType === 'credit_card' &&
    hasSomeInstallmentPlanFields &&
    !hasAllInstallmentPlanFields
  ) {
    return {
      error:
        'Si la cuenta de tarjeta representa una compra financiada, debes completar monto total, cuotas y primera cuota',
    }
  }

  return {
    data: {
      name: trimmedName,
      type: normalizedType,
      creditLimit: normalizedType === 'credit_card' ? creditLimit : null,
      closingDay: normalizedType === 'credit_card' ? closingDay : null,
      dueDay: normalizedType === 'credit_card' ? dueDay : null,
      loanTotalAmount: supportsInstallmentPlanType(normalizedType)
        ? loanTotalAmount
        : null,
      installmentCount: supportsInstallmentPlanType(normalizedType)
        ? installmentCount
        : null,
      loanFirstDueDate: supportsInstallmentPlanType(normalizedType)
        ? loanFirstDueDate
        : null,
      notes,
    },
  }
}

async function deleteLinkedTransactionsForPaymentIds(
  paymentIds: string[],
  userId: string,
  transactionClient: Pick<typeof prisma, 'transaction'> = prisma
) {
  if (paymentIds.length === 0) {
    return []
  }

  const linkedTransactions = await transactionClient.transaction.findMany({
    where: {
      userId,
      linkedObligationPaymentId: {
        in: paymentIds,
      },
    },
    select: {
      id: true,
    },
  })

  if (linkedTransactions.length === 0) {
    return []
  }

  await transactionClient.transaction.deleteMany({
    where: {
      id: {
        in: linkedTransactions.map((transaction) => transaction.id),
      },
    },
  })

  return linkedTransactions.map((transaction) => transaction.id)
}

function validateObligationInput(body: Record<string, unknown>) {
  const trimmedTitle = String(body.title ?? '').trim()
  const principalAmount = Number(body.principalAmount)
  const rawInterestAmount = String(body.interestAmount ?? '').trim()
  const interestAmount = rawInterestAmount ? Number(rawInterestAmount) : 0
  const minimumPayment = parseOptionalPositiveNumber(body.minimumPayment)
  const dueDate = parseDate(body.dueDate)
  const rawReferenceMonth = String(body.referenceMonth ?? '').trim()
  const notes = normalizeOptionalText(body.notes)

  if (!trimmedTitle || body.principalAmount === undefined || body.principalAmount === null || !body.dueDate) {
    return {
      error: 'Debes completar titulo, monto principal y fecha de vencimiento',
    }
  }

  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    return {
      error: 'El monto principal debe ser mayor a cero',
    }
  }

  if (!Number.isFinite(interestAmount) || interestAmount < 0) {
    return {
      error: 'Los intereses no pueden ser negativos',
    }
  }

  if (Number.isNaN(minimumPayment)) {
    return {
      error: 'El pago minimo debe ser mayor a cero',
    }
  }

  if (rawReferenceMonth && !REFERENCE_MONTH_PATTERN.test(rawReferenceMonth)) {
    return {
      error: 'El mes de referencia debe tener formato YYYY-MM',
    }
  }

  if (!dueDate) {
    return {
      error: 'La fecha de vencimiento no es valida',
    }
  }

  const totalAmount = roundAmount(principalAmount + interestAmount)

  if (minimumPayment !== null && minimumPayment > totalAmount) {
    return {
      error: 'El pago minimo no puede superar el total de la obligacion',
    }
  }

  return {
    data: {
      title: trimmedTitle,
      referenceMonth: rawReferenceMonth || null,
      principalAmount: roundAmount(principalAmount),
      interestAmount: roundAmount(interestAmount),
      minimumPayment,
      dueDate,
      status: 'open',
      notes,
    },
  }
}

function validatePaymentInput(
  body: Record<string, unknown>,
  maxAllowedAmount: number
) {
  const paymentAmount = Number(body.amount)
  const paymentDate = parseDate(body.paymentDate)
  const rawPaymentMethod = String(body.paymentMethod ?? '').trim()
  const paymentMethod = normalizePaymentMethod(rawPaymentMethod)
  const notes = normalizeOptionalText(body.notes)

  if (
    body.amount === undefined ||
    body.amount === null ||
    !body.paymentDate ||
    !rawPaymentMethod
  ) {
    return {
      error: 'Debes completar el monto, la fecha y el medio del movimiento',
    }
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return {
      error: 'El abono debe ser mayor a cero',
    }
  }

  if (!paymentDate) {
    return {
      error: 'La fecha del abono no es valida',
    }
  }

  if (!paymentMethod || paymentMethod === 'not_specified') {
    return {
      error: 'Debes indicar un medio de pago o cobro valido',
    }
  }

  if (paymentAmount > maxAllowedAmount + 0.01) {
    return {
      error: 'El abono no puede superar el saldo pendiente',
    }
  }

  return {
    data: {
      amount: roundAmount(paymentAmount),
      paymentDate,
      paymentMethod,
      notes,
    },
  }
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const accounts = await prisma.obligationAccount.findMany({
      where: {
        userId: req.user.userId,
      },
      include: buildObligationAccountInclude(),
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    })

    return res.json({
      ok: true,
      accounts,
    })
  } catch (error) {
    console.error('Error obteniendo cuentas de obligaciones:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const validation = validateAccountInput(req.body)
    const userId = req.user.userId

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const createdAccount = await prisma.$transaction(async (transactionClient) => {
      const account = await transactionClient.obligationAccount.create({
        data: {
          ...validation.data,
          userId,
        },
      })

      if (
        validation.data.loanTotalAmount &&
        validation.data.installmentCount &&
        validation.data.loanFirstDueDate
      ) {
        const installmentAmounts = splitAmountAcrossInstallments(
          validation.data.loanTotalAmount,
          validation.data.installmentCount
        )

        await transactionClient.obligation.createMany({
          data: installmentAmounts.map((installmentAmount, installmentIndex) => {
            const dueDate = buildInstallmentDueDate(
              validation.data.loanFirstDueDate as Date,
              installmentIndex
            )

            return {
              title: `Cuota ${installmentIndex + 1} de ${validation.data.installmentCount}`,
              referenceMonth: buildReferenceMonthFromDate(dueDate),
              principalAmount: roundAmount(installmentAmount),
              interestAmount: 0,
              minimumPayment: null,
              dueDate,
              status: 'open',
              notes: `Generada automaticamente desde la cuenta ${validation.data.name}`,
              accountId: account.id,
            }
          }),
        })
      }

      return account
    })

    const account = await getAccountWithDetails(createdAccount.id, userId)

    return res.status(201).json({
      ok: true,
      message: 'Cuenta creada correctamente',
      account,
    })
  } catch (error) {
    console.error('Error creando cuenta de obligaciones:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.put('/:accountId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const accountId = req.params.accountId

    if (typeof accountId !== 'string' || !accountId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de cuenta invalido',
      })
    }

    const existingAccount = await prisma.obligationAccount.findUnique({
      where: {
        id: accountId,
      },
      include: {
        obligations: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingAccount || existingAccount.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Cuenta no encontrada',
      })
    }

    const validation = validateAccountInput(req.body)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    if (
      existingAccount.obligations.length > 0 &&
      validation.data.type !== existingAccount.type
    ) {
      return res.status(400).json({
        ok: false,
        message:
          'No puedes cambiar el tipo de una cuenta que ya tiene obligaciones cargadas',
      })
    }

    await prisma.obligationAccount.update({
      where: {
        id: accountId,
      },
      data: validation.data,
    })

    const account = await getAccountWithDetails(accountId, req.user.userId)

    return res.json({
      ok: true,
      message: 'Cuenta actualizada correctamente',
      account,
    })
  } catch (error) {
    console.error('Error actualizando cuenta de obligaciones:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/:accountId/obligations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const accountId = req.params.accountId

    if (typeof accountId !== 'string' || !accountId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de cuenta invalido',
      })
    }

    const account = await prisma.obligationAccount.findUnique({
      where: {
        id: accountId,
      },
      include: {
        obligations: {
          select: {
            payments: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    if (!account || account.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Cuenta no encontrada',
      })
    }

    const validation = validateObligationInput(req.body)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    await prisma.obligation.create({
      data: {
        ...validation.data,
        accountId,
      },
    })

    const updatedAccount = await getAccountWithDetails(accountId, req.user.userId)

    return res.status(201).json({
      ok: true,
      message: 'Obligacion creada correctamente',
      account: updatedAccount,
    })
  } catch (error) {
    console.error('Error creando obligacion:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.put('/obligations/:obligationId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const obligationId = req.params.obligationId

    if (typeof obligationId !== 'string' || !obligationId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de obligacion invalido',
      })
    }

    const existingObligation = await prisma.obligation.findUnique({
      where: {
        id: obligationId,
      },
      include: {
        account: true,
        payments: true,
      },
    })

    if (!existingObligation || existingObligation.account.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Obligacion no encontrada',
      })
    }

    const validation = validateObligationInput(req.body)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const paidAmount = roundAmount(
      existingObligation.payments.reduce(
        (accumulator, payment) => accumulator + payment.amount,
        0
      )
    )
    const nextTotalAmount = roundAmount(
      validation.data.principalAmount + validation.data.interestAmount
    )
    const nextStatus = paidAmount >= nextTotalAmount - 0.01 ? 'settled' : 'open'

    await prisma.obligation.update({
      where: {
        id: obligationId,
      },
      data: {
        ...validation.data,
        status: nextStatus,
      },
    })

    const updatedAccount = await getAccountWithDetails(
      existingObligation.accountId,
      req.user.userId
    )

    return res.json({
      ok: true,
      message: 'Obligacion actualizada correctamente',
      account: updatedAccount,
    })
  } catch (error) {
    console.error('Error actualizando obligacion:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/obligations/:obligationId/payments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const obligationId = req.params.obligationId

    if (typeof obligationId !== 'string' || !obligationId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de obligacion invalido',
      })
    }

    const obligation = await prisma.obligation.findUnique({
      where: {
        id: obligationId,
      },
      include: {
        account: true,
        payments: true,
      },
    })

    if (!obligation || obligation.account.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Obligacion no encontrada',
      })
    }

    const userId = req.user.userId

    const { remainingAmount, totalAmount, paidAmount } =
      buildObligationTotals(obligation)

    if (remainingAmount <= 0.01) {
      return res.status(400).json({
        ok: false,
        message: 'La obligacion ya esta saldada',
      })
    }

    const validation = validatePaymentInput(req.body, remainingAmount)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const nextPaidAmount = roundAmount(paidAmount + validation.data.amount)
    const nextRemainingAmount = roundAmount(
      Math.max(totalAmount - nextPaidAmount, 0)
    )

    const linkedTransaction = await prisma.$transaction(
      async (transactionClient) => {
        const payment = await transactionClient.obligationPayment.create({
          data: {
            ...validation.data,
            obligationId,
          },
        })

        await transactionClient.obligation.update({
          where: {
            id: obligationId,
          },
          data: {
            status: nextRemainingAmount <= 0.01 ? 'settled' : 'open',
          },
        })

        return transactionClient.transaction.create({
          data: {
            description: buildLinkedPaymentTransactionDescription(
              obligation.account.name,
              obligation.title,
              obligation.account.type as ObligationAccountType
            ),
            amount: validation.data.amount,
            type: buildLinkedPaymentTransactionType(
              obligation.account.type as ObligationAccountType
            ),
            category: getPaymentCategory(
              obligation.account.type as ObligationAccountType
            ),
            paymentMethod: validation.data.paymentMethod,
            reimbursementStatus: 'not_applicable',
            date: validation.data.paymentDate,
            userId,
            linkedObligationPaymentId: payment.id,
          },
        })
      }
    )

    const updatedAccount = await getAccountWithDetails(
      obligation.accountId,
      userId
    )

    return res.status(201).json({
      ok: true,
      message: 'Abono registrado correctamente',
      account: updatedAccount,
      linkedTransaction,
    })
  } catch (error) {
    console.error('Error creando abono:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.delete('/payments/:paymentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const paymentId = req.params.paymentId

    if (typeof paymentId !== 'string' || !paymentId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de abono invalido',
      })
    }

    const payment = await prisma.obligationPayment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        obligation: {
          include: {
            account: true,
            payments: true,
          },
        },
      },
    })

    if (!payment || payment.obligation.account.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Abono no encontrado',
      })
    }

    const userId = req.user.userId

    const remainingPayments = payment.obligation.payments.filter(
      (currentPayment) => currentPayment.id !== paymentId
    )
    const { nextStatus } = buildObligationTotals({
      principalAmount: payment.obligation.principalAmount,
      interestAmount: payment.obligation.interestAmount,
      payments: remainingPayments,
    })

    const deletedLinkedTransactionIds = await prisma.$transaction(
      async (transactionClient) => {
        const linkedTransactionIds = await deleteLinkedTransactionsForPaymentIds(
          [paymentId],
          userId,
          transactionClient
        )

        await transactionClient.obligationPayment.delete({
          where: {
            id: paymentId,
          },
        })
        await transactionClient.obligation.update({
          where: {
            id: payment.obligationId,
          },
          data: {
            status: nextStatus,
          },
        })

        return linkedTransactionIds
      }
    )

    const updatedAccount = await getAccountWithDetails(
      payment.obligation.accountId,
      userId
    )

    return res.json({
      ok: true,
      message: 'Abono eliminado correctamente',
      account: updatedAccount,
      deletedLinkedTransactionIds,
    })
  } catch (error) {
    console.error('Error eliminando abono:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.delete('/obligations/:obligationId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const obligationId = req.params.obligationId

    if (typeof obligationId !== 'string' || !obligationId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de obligacion invalido',
      })
    }

    const obligation = await prisma.obligation.findUnique({
      where: {
        id: obligationId,
      },
      include: {
        account: true,
        payments: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!obligation || obligation.account.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Obligacion no encontrada',
      })
    }

    const userId = req.user.userId

    const deletedLinkedTransactionIds = await prisma.$transaction(async (transactionClient) => {
      const linkedTransactionIds = await deleteLinkedTransactionsForPaymentIds(
        obligation.payments.map((payment) => payment.id),
        userId,
        transactionClient
      )

      await transactionClient.obligation.delete({
        where: {
          id: obligationId,
        },
      })

      return linkedTransactionIds
    })

    const updatedAccount = await getAccountWithDetails(
      obligation.accountId,
      userId
    )

    return res.json({
      ok: true,
      message: 'Obligacion eliminada correctamente',
      account: updatedAccount,
      deletedLinkedTransactionIds,
    })
  } catch (error) {
    console.error('Error eliminando obligacion:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.delete('/:accountId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const accountId = req.params.accountId

    if (typeof accountId !== 'string' || !accountId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de cuenta invalido',
      })
    }

    const account = await prisma.obligationAccount.findUnique({
      where: {
        id: accountId,
      },
      include: {
        obligations: {
          select: {
            payments: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    if (!account || account.userId !== req.user.userId) {
      return res.status(404).json({
        ok: false,
        message: 'Cuenta no encontrada',
      })
    }

    const userId = req.user.userId

    const deletedLinkedTransactionIds = await prisma.$transaction(async (transactionClient) => {
      const accountLinkedTransactions = await transactionClient.transaction.findMany({
        where: {
          userId,
          linkedObligationAccountId: accountId,
        },
        select: {
          id: true,
        },
      })

      await transactionClient.transaction.deleteMany({
        where: {
          userId,
          linkedObligationAccountId: accountId,
        },
      })

      const paymentLinkedTransactionIds = await deleteLinkedTransactionsForPaymentIds(
        account.obligations.flatMap((obligation) =>
          obligation.payments.map((payment) => payment.id)
        ),
        userId,
        transactionClient
      )

      await transactionClient.obligationAccount.delete({
        where: {
          id: accountId,
        },
      })

      return [
        ...accountLinkedTransactions.map((transaction) => transaction.id),
        ...paymentLinkedTransactionIds,
      ]
    })

    return res.json({
      ok: true,
      message: 'Cuenta eliminada correctamente',
      deletedAccountId: accountId,
      deletedLinkedTransactionIds,
    })
  } catch (error) {
    console.error('Error eliminando cuenta:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router
