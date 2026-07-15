import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  normalizePaymentMethod,
  normalizeReimbursementStatus,
  normalizeTransactionType,
  type PaymentMethod,
  type ReimbursementStatus,
  type TransactionType,
} from '../lib/transaction-fields'
import {
  authMiddleware,
  type AuthRequest,
} from '../middlewares/auth.middleware'

const router = Router()

type LinkedObligationAccountType = 'credit_card' | 'loan_payable'

interface ValidatedTransactionInput {
  description: string
  amount: number
  type: TransactionType
  category: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  date: Date
  financialAccountId: string | null
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

function buildTransactionInclude() {
  return {
    financialAccount: true,
  }
}

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function parseTransactionDate(value: unknown) {
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

function parseOptionalBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  const normalizedValue = String(value ?? '').trim().toLowerCase()

  if (!normalizedValue) {
    return null
  }

  if (
    normalizedValue === 'true' ||
    normalizedValue === '1' ||
    normalizedValue === 'si' ||
    normalizedValue === 'yes'
  ) {
    return true
  }

  if (
    normalizedValue === 'false' ||
    normalizedValue === '0' ||
    normalizedValue === 'no'
  ) {
    return false
  }

  return null
}

function normalizeOptionalText(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  return trimmedValue ? trimmedValue : null
}

function isFinancingPaymentMethod(paymentMethod: PaymentMethod) {
  return paymentMethod === 'credit' || paymentMethod === 'loan'
}

function supportsFinancialAccountSelection(transaction: {
  type: TransactionType
  paymentMethod: PaymentMethod
}) {
  if (transaction.type === 'income' || transaction.type === 'investments') {
    return true
  }

  return !isFinancingPaymentMethod(transaction.paymentMethod)
}

async function validateOptionalFinancialAccountId(
  rawValue: unknown,
  userId: string,
  transaction: {
    type: TransactionType
    paymentMethod: PaymentMethod
  }
) {
  const trimmedValue = String(rawValue ?? '').trim()

  if (!trimmedValue) {
    return {
      data: null,
    }
  }

  if (!supportsFinancialAccountSelection(transaction)) {
    return {
      error:
        'Solo puedes asociar una cuenta cuando el movimiento impacta tu liquidez hoy',
    }
  }

  const selectedAccount = await prisma.financialAccount.findFirst({
    where: {
      id: trimmedValue,
      userId,
    },
  })

  if (!selectedAccount) {
    return {
      error: 'La cuenta seleccionada no es valida',
    }
  }

  return {
    data: selectedAccount.id,
  }
}

function buildLinkedAccountType(
  transaction: ValidatedTransactionInput
): LinkedObligationAccountType {
  if (
    transaction.type === 'income' ||
    transaction.paymentMethod === 'loan'
  ) {
    return 'loan_payable'
  }

  return 'credit_card'
}

function canCreateLinkedObligationAccount(transaction: ValidatedTransactionInput) {
  return (
    transaction.type === 'income' ||
    (transaction.type === 'expense' &&
      isFinancingPaymentMethod(transaction.paymentMethod))
  )
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

function splitAmountAcrossInstallments(
  totalAmount: number,
  installmentCount: number
) {
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

async function validateTransactionInput(
  body: Record<string, unknown>,
  userId: string,
  existingTransaction?: {
    paymentMethod: PaymentMethod
    reimbursementStatus: ReimbursementStatus
  }
) {
  const {
    description,
    amount,
    type,
    category,
    date,
    paymentMethod,
    reimbursementStatus,
  } = body

  const trimmedDescription = String(description ?? '').trim()
  const trimmedCategory = String(category ?? '').trim()
  const normalizedType = normalizeTransactionType(String(type ?? '').trim())
  const rawPaymentMethod = String(paymentMethod ?? '').trim()
  const rawReimbursementStatus = String(reimbursementStatus ?? '').trim()
  const normalizedPaymentMethod = normalizePaymentMethod(rawPaymentMethod)
  const normalizedReimbursementStatus =
    normalizeReimbursementStatus(rawReimbursementStatus)
  const nextPaymentMethod =
    normalizedType === 'expense'
      ? normalizedPaymentMethod ??
        existingTransaction?.paymentMethod ??
        'not_specified'
      : 'not_specified'

  if (
    !trimmedDescription ||
    amount === undefined ||
    amount === null ||
    !normalizedType ||
    !trimmedCategory ||
    !date
  ) {
    return {
      error: 'Todos los campos son obligatorios',
    }
  }

  const parsedAmount = Number(amount)

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return {
      error: 'El monto debe ser mayor a cero',
    }
  }

  const parsedDate = parseTransactionDate(date)

  if (!parsedDate) {
    return {
      error: 'La fecha no es valida',
    }
  }

  const selectedCategory = await prisma.category.findFirst({
    where: {
      userId,
      name: trimmedCategory,
      type: normalizedType,
    },
  })

  if (!selectedCategory) {
    return {
      error: 'La categoria seleccionada no es valida',
    }
  }

  if (rawPaymentMethod && !normalizedPaymentMethod) {
    return {
      error: 'El medio de pago no es valido',
    }
  }

  if (rawReimbursementStatus && !normalizedReimbursementStatus) {
    return {
      error: 'El estado de reembolso no es valido',
    }
  }

  const financialAccountValidation = await validateOptionalFinancialAccountId(
    body.financialAccountId,
    userId,
    {
      type: normalizedType,
      paymentMethod: nextPaymentMethod,
    }
  )

  if ('error' in financialAccountValidation) {
    return {
      error: financialAccountValidation.error,
    }
  }

  return {
    data: {
      description: trimmedDescription,
      amount: roundAmount(parsedAmount),
      type: normalizedType,
      category: trimmedCategory,
      paymentMethod:
        nextPaymentMethod,
      reimbursementStatus:
        normalizedType === 'expense'
          ? normalizedReimbursementStatus ??
            existingTransaction?.reimbursementStatus ??
            'not_applicable'
          : 'not_applicable',
      date: parsedDate,
      financialAccountId: financialAccountValidation.data,
    } satisfies ValidatedTransactionInput,
  }
}

function validateLinkedObligationInput(
  body: Record<string, unknown>,
  transaction: ValidatedTransactionInput
) {
  const requestedLinkedAccount = parseOptionalBoolean(
    body.createLinkedObligationAccount
  )

  if (
    body.createLinkedObligationAccount !== undefined &&
    requestedLinkedAccount === null
  ) {
    return {
      error: 'El indicador de vinculacion con Tarjetas y Prestamos no es valido',
    }
  }

  if (!requestedLinkedAccount) {
    return {
      data: null,
    }
  }

  if (!canCreateLinkedObligationAccount(transaction)) {
    return {
      error:
        'Solo puedes vincular a Tarjetas y Prestamos un ingreso que represente un prestamo recibido o un gasto pagado con tarjeta o prestamo',
    }
  }

  const installmentCount = parseOptionalPositiveInteger(
    body.linkedObligationInstallmentCount
  )

  if (Number.isNaN(installmentCount) || installmentCount === null) {
    return {
      error: 'La cantidad de cuotas debe ser un numero entero mayor a cero',
    }
  }

  const firstDueDate = parseTransactionDate(body.linkedObligationFirstDueDate)

  if (!firstDueDate) {
    return {
      error: 'La fecha de la primera cuota no es valida',
    }
  }

  return {
    data: {
      name:
        normalizeOptionalText(body.linkedObligationAccountName) ??
        transaction.description,
      type: buildLinkedAccountType(transaction),
      installmentCount,
      firstDueDate,
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

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.userId,
      },
      include: buildTransactionInclude(),
      orderBy: {
        date: 'desc',
      },
    })

    return res.json({
      ok: true,
      transactions,
    })
  } catch (error) {
    console.error('Error obteniendo transacciones:', error)

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

    const userId = req.user.userId
    const validation = await validateTransactionInput(req.body, userId)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const linkedValidation = validateLinkedObligationInput(
      req.body,
      validation.data
    )

    if ('error' in linkedValidation) {
      return res.status(400).json({
        ok: false,
        message: linkedValidation.error,
      })
    }

    const transactionResult = await prisma.$transaction(
      async (transactionClient) => {
        let linkedObligationAccount = null

        if (linkedValidation.data) {
          const createdAccount = await transactionClient.obligationAccount.create({
            data: {
              name: linkedValidation.data.name,
              type: linkedValidation.data.type,
              loanTotalAmount: validation.data.amount,
              installmentCount: linkedValidation.data.installmentCount,
              loanFirstDueDate: linkedValidation.data.firstDueDate,
              notes: `Generada automaticamente desde el ${validation.data.type === 'income' ? 'ingreso' : 'gasto'} "${validation.data.description}" del ${validation.data.date.toISOString().slice(0, 10)}`,
              userId,
            },
          })

          const installmentAmounts = splitAmountAcrossInstallments(
            validation.data.amount,
            linkedValidation.data.installmentCount
          )

          await transactionClient.obligation.createMany({
            data: installmentAmounts.map((installmentAmount, installmentIndex) => {
              const dueDate = buildInstallmentDueDate(
                linkedValidation.data.firstDueDate,
                installmentIndex
              )

              return {
                title: `${validation.data.description} - Cuota ${installmentIndex + 1} de ${linkedValidation.data.installmentCount}`,
                referenceMonth: buildReferenceMonthFromDate(dueDate),
                principalAmount: roundAmount(installmentAmount),
                interestAmount: 0,
                minimumPayment: null,
                dueDate,
                status: 'open',
                notes: `Generada automaticamente desde la transaccion ${validation.data.description}`,
                accountId: createdAccount.id,
              }
            }),
          })

          linkedObligationAccount = await transactionClient.obligationAccount.findFirst(
            {
              where: {
                id: createdAccount.id,
                userId,
              },
              include: buildObligationAccountInclude(),
            }
          )
        }

        const transaction = await transactionClient.transaction.create({
          data: {
            ...validation.data,
            userId,
            linkedObligationAccountId: linkedObligationAccount?.id ?? null,
          },
          include: buildTransactionInclude(),
        })

        return {
          transaction,
          linkedObligationAccount,
        }
      }
    )

    return res.status(201).json({
      ok: true,
      message: 'Transaccion creada correctamente',
      transaction: transactionResult.transaction,
      linkedObligationAccount: transactionResult.linkedObligationAccount,
    })
  } catch (error) {
    console.error('Error creando transaccion:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const userId = req.user.userId
    const transactionId = req.params.id

    if (typeof transactionId !== 'string' || !transactionId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de transaccion invalido',
      })
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    })

    if (!transaction) {
      return res.status(404).json({
        ok: false,
        message: 'Transaccion no encontrada',
      })
    }

    const deletedLinkedObligationAccountId =
      transaction.linkedObligationAccountId ?? null
    const linkedObligationPaymentId =
      transaction.linkedObligationPaymentId ?? null

    let updatedObligationAccount = null

    await prisma.$transaction(async (transactionClient) => {
      if (linkedObligationPaymentId) {
        const linkedPayment = await transactionClient.obligationPayment.findUnique({
          where: {
            id: linkedObligationPaymentId,
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

        if (
          !linkedPayment ||
          linkedPayment.obligation.account.userId !== userId
        ) {
          await transactionClient.transaction.delete({
            where: {
              id: transactionId,
            },
          })
          return
        }

        const remainingPayments = linkedPayment.obligation.payments.filter(
          (currentPayment) => currentPayment.id !== linkedObligationPaymentId
        )
        const { nextStatus } = buildObligationTotals({
          principalAmount: linkedPayment.obligation.principalAmount,
          interestAmount: linkedPayment.obligation.interestAmount,
          payments: remainingPayments,
        })

        await transactionClient.transaction.delete({
          where: {
            id: transactionId,
          },
        })
        await transactionClient.obligationPayment.delete({
          where: {
            id: linkedObligationPaymentId,
          },
        })
        await transactionClient.obligation.update({
          where: {
            id: linkedPayment.obligationId,
          },
          data: {
            status: nextStatus,
          },
        })

        updatedObligationAccount = await transactionClient.obligationAccount.findFirst(
          {
            where: {
              id: linkedPayment.obligation.accountId,
              userId,
            },
            include: buildObligationAccountInclude(),
          }
        )
        return
      }

      await transactionClient.transaction.delete({
        where: {
          id: transactionId,
        },
      })

      if (!deletedLinkedObligationAccountId) {
        return
      }

      const linkedAccount = await transactionClient.obligationAccount.findFirst({
        where: {
          id: deletedLinkedObligationAccountId,
          userId,
        },
      })

      if (linkedAccount) {
        const paymentIds = (
          await transactionClient.obligation.findMany({
            where: {
              accountId: linkedAccount.id,
            },
            select: {
              payments: {
                select: {
                  id: true,
                },
              },
            },
          })
        ).flatMap((obligation) =>
          obligation.payments.map((payment) => payment.id)
        )

        if (paymentIds.length > 0) {
          await transactionClient.transaction.deleteMany({
            where: {
              userId,
              linkedObligationPaymentId: {
                in: paymentIds,
              },
            },
          })
        }

        await transactionClient.obligationAccount.delete({
          where: {
            id: linkedAccount.id,
          },
        })
      }
    })

    return res.json({
      ok: true,
      message: 'Transaccion eliminada correctamente',
      deletedLinkedObligationAccountId,
      updatedObligationAccount,
    })
  } catch (error) {
    console.error('Error eliminando transaccion:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const transactionId = req.params.id

    if (typeof transactionId !== 'string' || !transactionId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de transaccion invalido',
      })
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.userId,
      },
    })

    if (!existingTransaction) {
      return res.status(404).json({
        ok: false,
        message: 'Transaccion no encontrada',
      })
    }

    if (
      existingTransaction.linkedObligationAccountId ||
      existingTransaction.linkedObligationPaymentId
    ) {
      return res.status(400).json({
        ok: false,
        message:
          'Esta transaccion esta vinculada a Tarjetas y Prestamos y debe editarse desde ese modulo',
      })
    }

    const requestedLinkedAccount = parseOptionalBoolean(
      req.body.createLinkedObligationAccount
    )

    if (
      req.body.createLinkedObligationAccount !== undefined &&
      requestedLinkedAccount === null
    ) {
      return res.status(400).json({
        ok: false,
        message: 'El indicador de vinculacion con Tarjetas y Prestamos no es valido',
      })
    }

    if (requestedLinkedAccount) {
      return res.status(400).json({
        ok: false,
        message:
          'Por ahora la vinculacion con Tarjetas y Prestamos solo puede crearse al registrar una transaccion nueva',
      })
    }

    const validation = await validateTransactionInput(req.body, req.user.userId, {
      paymentMethod: existingTransaction.paymentMethod as PaymentMethod,
      reimbursementStatus:
        existingTransaction.reimbursementStatus as ReimbursementStatus,
    })

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const transaction = await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: validation.data,
      include: buildTransactionInclude(),
    })

    return res.json({
      ok: true,
      message: 'Transaccion actualizada correctamente',
      transaction,
    })
  } catch (error) {
    console.error('Error actualizando transaccion:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router
