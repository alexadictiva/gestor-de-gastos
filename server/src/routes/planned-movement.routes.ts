import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  normalizePaymentMethod,
  normalizeTransactionType,
} from '../lib/transaction-fields'
import {
  authMiddleware,
  type AuthRequest,
} from '../middlewares/auth.middleware'

const router = Router()
const MONTH_PATTERN = /^\d{4}-\d{2}$/
const ALLOWED_PLANNED_MOVEMENT_STATUSES = ['pending', 'completed'] as const

type PlannedMovementStatus = (typeof ALLOWED_PLANNED_MOVEMENT_STATUSES)[number]

function parseMonthKey(value: string) {
  const trimmedValue = value.trim()

  if (!MONTH_PATTERN.test(trimmedValue)) {
    return null
  }

  const [year, month] = trimmedValue.split('-').map(Number)

  if (!year || !month || month < 1 || month > 12) {
    return null
  }

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  return {
    year,
    month,
    start,
    end,
  }
}

function parseDueDate(value: unknown) {
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

function normalizePlannedMovementType(rawValue: string) {
  const normalizedType = normalizeTransactionType(rawValue)

  if (normalizedType === 'income' || normalizedType === 'expense') {
    return normalizedType
  }

  return null
}

function normalizePlannedMovementStatus(
  rawValue: string
): PlannedMovementStatus | null {
  const normalizedValue = rawValue.trim().toLowerCase()

  if (
    ALLOWED_PLANNED_MOVEMENT_STATUSES.includes(
      normalizedValue as PlannedMovementStatus
    )
  ) {
    return normalizedValue as PlannedMovementStatus
  }

  if (
    normalizedValue === 'pagado' ||
    normalizedValue === 'cobrado' ||
    normalizedValue === 'completado'
  ) {
    return 'completed'
  }

  if (normalizedValue === 'pendiente') {
    return 'pending'
  }

  return null
}

function buildRecurringDuplicateKey(item: {
  title: string
  type: string
  category: string
}) {
  return [
    item.type.trim().toLowerCase(),
    item.title.trim().toLowerCase(),
    item.category.trim().toLowerCase(),
  ].join('::')
}

function buildDuplicatedDueDate(sourceDueDate: Date, target: { year: number; month: number }) {
  const sourceDay = sourceDueDate.getUTCDate()
  const lastDayOfMonth = new Date(Date.UTC(target.year, target.month, 0)).getUTCDate()
  const safeDay = Math.min(sourceDay, lastDayOfMonth)

  return new Date(Date.UTC(target.year, target.month - 1, safeDay))
}

function getCompletionMessage(type: string, status: PlannedMovementStatus) {
  if (status === 'pending') {
    return 'Movimiento proyectado marcado como pendiente'
  }

  return type === 'expense'
    ? 'Movimiento proyectado marcado como pagado'
    : 'Movimiento proyectado marcado como cobrado'
}

async function validatePlannedMovementInput(
  body: Record<string, unknown>,
  existingPlannedMovement?: {
    paymentMethod: string
  }
) {
  const {
    title,
    amount,
    type,
    category,
    paymentMethod,
    dueDate,
    isRecurring,
  } = body

  const trimmedTitle = String(title ?? '').trim()
  const trimmedCategory = String(category ?? '').trim()
  const normalizedType = normalizePlannedMovementType(String(type ?? '').trim())
  const rawPaymentMethod = String(paymentMethod ?? '').trim()
  const normalizedPaymentMethod = normalizePaymentMethod(rawPaymentMethod)
  const parsedDueDate = parseDueDate(dueDate)
  const parsedAmount = Number(amount)
  const normalizedRecurring =
    typeof isRecurring === 'boolean'
      ? isRecurring
      : String(isRecurring ?? '').trim().toLowerCase() === 'true'

  if (
    !trimmedTitle ||
    amount === undefined ||
    amount === null ||
    !normalizedType ||
    !trimmedCategory ||
    !dueDate
  ) {
    return {
      error: 'Todos los campos son obligatorios',
    }
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return {
      error: 'El monto debe ser mayor a cero',
    }
  }

  if (!parsedDueDate) {
    return {
      error: 'La fecha no es valida',
    }
  }

  if (rawPaymentMethod && !normalizedPaymentMethod) {
    return {
      error: 'El medio de pago no es valido',
    }
  }

  return {
    data: {
      title: trimmedTitle,
      amount: parsedAmount,
      type: normalizedType,
      category: trimmedCategory,
      paymentMethod:
        normalizedType === 'expense'
          ? normalizedPaymentMethod ??
            existingPlannedMovement?.paymentMethod ??
            'not_specified'
          : 'not_specified',
      dueDate: parsedDueDate,
      isRecurring: normalizedRecurring,
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

    const rawMonth = String(req.query.month ?? '').trim()
    const parsedMonth = rawMonth ? parseMonthKey(rawMonth) : null

    if (rawMonth && !parsedMonth) {
      return res.status(400).json({
        ok: false,
        message: 'El mes solicitado no es valido',
      })
    }

    const plannedMovements = await prisma.plannedMovement.findMany({
      where: {
        userId: req.user.userId,
        ...(parsedMonth
          ? {
              dueDate: {
                gte: parsedMonth.start,
                lte: parsedMonth.end,
              },
            }
          : {}),
      },
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    })

    return res.json({
      ok: true,
      plannedMovements,
    })
  } catch (error) {
    console.error('Error obteniendo planned movements:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/duplicate-recurring', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const rawTargetMonth = String(req.body?.targetMonth ?? '').trim()
    const targetMonth = parseMonthKey(rawTargetMonth)
    const userId = req.user.userId

    if (!targetMonth) {
      return res.status(400).json({
        ok: false,
        message: 'Debes enviar un mes valido en formato YYYY-MM',
      })
    }

    const previousMonth = parseMonthKey(
      `${targetMonth.month === 1 ? targetMonth.year - 1 : targetMonth.year}-${String(targetMonth.month === 1 ? 12 : targetMonth.month - 1).padStart(2, '0')}`
    )

    if (!previousMonth) {
      return res.status(400).json({
        ok: false,
        message: 'No se pudo calcular el mes anterior',
      })
    }

    const [sourceRecurringItems, targetItems] = await Promise.all([
      prisma.plannedMovement.findMany({
        where: {
          userId,
          isRecurring: true,
          dueDate: {
            gte: previousMonth.start,
            lte: previousMonth.end,
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      }),
      prisma.plannedMovement.findMany({
        where: {
          userId,
          dueDate: {
            gte: targetMonth.start,
            lte: targetMonth.end,
          },
        },
      }),
    ])

    if (sourceRecurringItems.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'No hay movimientos recurrentes en el mes anterior para duplicar',
      })
    }

    const targetKeys = new Set(
      targetItems.map((item) => buildRecurringDuplicateKey(item))
    )

    const itemsToCreate = sourceRecurringItems
      .filter((item) => !targetKeys.has(buildRecurringDuplicateKey(item)))
      .map((item) => ({
        title: item.title,
        amount: item.amount,
        type: item.type,
        category: item.category,
        paymentMethod: item.paymentMethod,
        dueDate: buildDuplicatedDueDate(item.dueDate, targetMonth),
        isRecurring: item.isRecurring,
        userId,
      }))

    if (itemsToCreate.length > 0) {
      await prisma.plannedMovement.createMany({
        data: itemsToCreate,
      })
    }

    const plannedMovements = await prisma.plannedMovement.findMany({
      where: {
        userId,
        dueDate: {
          gte: targetMonth.start,
          lte: targetMonth.end,
        },
      },
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    })

    return res.json({
      ok: true,
      message:
        itemsToCreate.length > 0
          ? `Se duplicaron ${itemsToCreate.length} movimiento(s) recurrente(s)`
          : 'No habia movimientos nuevos para duplicar',
      createdCount: itemsToCreate.length,
      skippedCount: sourceRecurringItems.length - itemsToCreate.length,
      plannedMovements,
    })
  } catch (error) {
    console.error('Error duplicando recurrentes:', error)

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

    const validation = await validatePlannedMovementInput(req.body)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const plannedMovement = await prisma.plannedMovement.create({
      data: {
        ...validation.data,
        userId: req.user.userId,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Movimiento proyectado creado correctamente',
      plannedMovement,
    })
  } catch (error) {
    console.error('Error creando planned movement:', error)

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

    const plannedMovementId = req.params.id

    if (typeof plannedMovementId !== 'string' || !plannedMovementId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de movimiento proyectado invalido',
      })
    }

    const existingPlannedMovement = await prisma.plannedMovement.findFirst({
      where: {
        id: plannedMovementId,
        userId: req.user.userId,
      },
    })

    if (!existingPlannedMovement) {
      return res.status(404).json({
        ok: false,
        message: 'Movimiento proyectado no encontrado',
      })
    }

    if (existingPlannedMovement.linkedTransactionId) {
      return res.status(400).json({
        ok: false,
        message:
          'Este movimiento ya fue convertido en una transaccion real y ya no puede editarse desde proyeccion',
      })
    }

    const validation = await validatePlannedMovementInput(req.body, {
      paymentMethod: existingPlannedMovement.paymentMethod,
    })

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const plannedMovement = await prisma.plannedMovement.update({
      where: {
        id: plannedMovementId,
      },
      data: validation.data,
    })

    return res.json({
      ok: true,
      message: 'Movimiento proyectado actualizado correctamente',
      plannedMovement,
    })
  } catch (error) {
    console.error('Error actualizando planned movement:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const plannedMovementId = req.params.id

    if (typeof plannedMovementId !== 'string' || !plannedMovementId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de movimiento proyectado invalido',
      })
    }

    const normalizedStatus = normalizePlannedMovementStatus(
      String(req.body?.status ?? '')
    )

    if (!normalizedStatus) {
      return res.status(400).json({
        ok: false,
        message: 'El estado enviado no es valido',
      })
    }

    const existingPlannedMovement = await prisma.plannedMovement.findFirst({
      where: {
        id: plannedMovementId,
        userId: req.user.userId,
      },
    })

    if (!existingPlannedMovement) {
      return res.status(404).json({
        ok: false,
        message: 'Movimiento proyectado no encontrado',
      })
    }

    if (
      normalizedStatus === 'pending' &&
      existingPlannedMovement.linkedTransactionId
    ) {
      return res.status(400).json({
        ok: false,
        message:
          'Este movimiento ya fue convertido en una transaccion real y no puede volver a pendiente',
      })
    }

    const plannedMovement = await prisma.plannedMovement.update({
      where: {
        id: plannedMovementId,
      },
      data: {
        status: normalizedStatus,
        completedAt:
          normalizedStatus === 'completed'
            ? existingPlannedMovement.completedAt ?? new Date()
            : null,
      },
    })

    return res.json({
      ok: true,
      message: getCompletionMessage(existingPlannedMovement.type, normalizedStatus),
      plannedMovement,
    })
  } catch (error) {
    console.error('Error actualizando estado de planned movement:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/:id/convert', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const plannedMovementId = req.params.id

    if (typeof plannedMovementId !== 'string' || !plannedMovementId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de movimiento proyectado invalido',
      })
    }

    const existingPlannedMovement = await prisma.plannedMovement.findFirst({
      where: {
        id: plannedMovementId,
        userId: req.user.userId,
      },
    })

    if (!existingPlannedMovement) {
      return res.status(404).json({
        ok: false,
        message: 'Movimiento proyectado no encontrado',
      })
    }

    if (existingPlannedMovement.linkedTransactionId) {
      return res.status(400).json({
        ok: false,
        message: 'Este movimiento proyectado ya fue convertido en una transaccion real',
      })
    }

    const selectedCategory = await prisma.category.findFirst({
      where: {
        userId: req.user.userId,
        name: existingPlannedMovement.category,
        type: existingPlannedMovement.type,
      },
    })

    if (!selectedCategory) {
      return res.status(400).json({
        ok: false,
        message:
          'La categoria del movimiento proyectado ya no existe para este tipo. Editalo antes de convertirlo.',
      })
    }

    const completionDate = new Date()

    const result = await prisma.$transaction(async (transactionClient) => {
      const transaction = await transactionClient.transaction.create({
        data: {
          description: existingPlannedMovement.title,
          amount: existingPlannedMovement.amount,
          type: existingPlannedMovement.type,
          category: existingPlannedMovement.category,
          paymentMethod:
            existingPlannedMovement.type === 'expense'
              ? existingPlannedMovement.paymentMethod
              : 'not_specified',
          reimbursementStatus: 'not_applicable',
          date: existingPlannedMovement.dueDate,
          userId: req.user!.userId,
        },
      })

      const plannedMovement = await transactionClient.plannedMovement.update({
        where: {
          id: plannedMovementId,
        },
        data: {
          status: 'completed',
          completedAt: completionDate,
          linkedTransactionId: transaction.id,
        },
      })

      return {
        plannedMovement,
        transaction,
      }
    })

    return res.status(201).json({
      ok: true,
      message: 'Movimiento proyectado convertido en transaccion real',
      plannedMovement: result.plannedMovement,
      transaction: result.transaction,
    })
  } catch (error) {
    console.error('Error convirtiendo planned movement:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/:id/revert-conversion', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const plannedMovementId = req.params.id

    if (typeof plannedMovementId !== 'string' || !plannedMovementId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de movimiento proyectado invalido',
      })
    }

    const existingPlannedMovement = await prisma.plannedMovement.findFirst({
      where: {
        id: plannedMovementId,
        userId: req.user.userId,
      },
    })

    if (!existingPlannedMovement) {
      return res.status(404).json({
        ok: false,
        message: 'Movimiento proyectado no encontrado',
      })
    }

    if (!existingPlannedMovement.linkedTransactionId) {
      return res.status(400).json({
        ok: false,
        message: 'Este movimiento proyectado todavia no fue pasado a real',
      })
    }

    const linkedTransaction = await prisma.transaction.findFirst({
      where: {
        id: existingPlannedMovement.linkedTransactionId,
        userId: req.user.userId,
      },
    })

    if (
      linkedTransaction &&
      (linkedTransaction.linkedObligationAccountId ||
        linkedTransaction.linkedObligationPaymentId)
    ) {
      return res.status(400).json({
        ok: false,
        message:
          'La transaccion vinculada ya tiene relaciones adicionales y no puede revertirse desde Proyeccion',
      })
    }

    const result = await prisma.$transaction(async (transactionClient) => {
      if (linkedTransaction) {
        await transactionClient.transaction.delete({
          where: {
            id: linkedTransaction.id,
          },
        })
      }

      const plannedMovement = await transactionClient.plannedMovement.update({
        where: {
          id: plannedMovementId,
        },
        data: {
          status: 'pending',
          completedAt: null,
          linkedTransactionId: null,
        },
      })

      return {
        plannedMovement,
        deletedTransactionId: linkedTransaction?.id ?? null,
      }
    })

    return res.json({
      ok: true,
      message:
        'Se deshizo el paso a real. Ahora puedes corregir la proyeccion nuevamente.',
      plannedMovement: result.plannedMovement,
      deletedTransactionId: result.deletedTransactionId,
    })
  } catch (error) {
    console.error('Error revirtiendo conversion de planned movement:', error)

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

    const plannedMovementId = req.params.id

    if (typeof plannedMovementId !== 'string' || !plannedMovementId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de movimiento proyectado invalido',
      })
    }

    const plannedMovement = await prisma.plannedMovement.findFirst({
      where: {
        id: plannedMovementId,
        userId: req.user.userId,
      },
    })

    if (!plannedMovement) {
      return res.status(404).json({
        ok: false,
        message: 'Movimiento proyectado no encontrado',
      })
    }

    if (plannedMovement.linkedTransactionId) {
      return res.status(400).json({
        ok: false,
        message:
          'Este movimiento ya fue convertido en una transaccion real y no puede eliminarse desde proyeccion',
      })
    }

    await prisma.plannedMovement.delete({
      where: {
        id: plannedMovementId,
      },
    })

    return res.json({
      ok: true,
      message: 'Movimiento proyectado eliminado correctamente',
    })
  } catch (error) {
    console.error('Error eliminando planned movement:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router
