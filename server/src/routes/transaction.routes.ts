import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  normalizePaymentMethod,
  normalizeReimbursementStatus,
  normalizeTransactionType,
} from '../lib/transaction-fields'
import {
  authMiddleware,
  type AuthRequest,
} from '../middlewares/auth.middleware'

const router = Router()

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

async function validateTransactionInput(
  body: Record<string, unknown>,
  userId: string,
  existingTransaction?: {
    paymentMethod: string
    reimbursementStatus: string
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

  return {
    data: {
      description: trimmedDescription,
      amount: parsedAmount,
      type: normalizedType,
      category: trimmedCategory,
      paymentMethod:
        normalizedType === 'expense'
          ? normalizedPaymentMethod ??
            existingTransaction?.paymentMethod ??
            'not_specified'
          : 'not_specified',
      reimbursementStatus:
        normalizedType === 'expense'
          ? normalizedReimbursementStatus ??
            existingTransaction?.reimbursementStatus ??
            'not_applicable'
          : 'not_applicable',
      date: parsedDate,
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

    const validation = await validateTransactionInput(
      req.body,
      req.user.userId
    )

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...validation.data,
        userId: req.user.userId,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Transaccion creada correctamente',
      transaction,
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
        userId: req.user.userId,
      },
    })

    if (!transaction) {
      return res.status(404).json({
        ok: false,
        message: 'Transaccion no encontrada',
      })
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    })

    return res.json({
      ok: true,
      message: 'Transaccion eliminada correctamente',
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

    const validation = await validateTransactionInput(
      req.body,
      req.user.userId,
      {
        paymentMethod: existingTransaction.paymentMethod,
        reimbursementStatus: existingTransaction.reimbursementStatus,
      }
    )

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
