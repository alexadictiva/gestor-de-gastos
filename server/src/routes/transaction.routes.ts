import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  authMiddleware,
  type AuthRequest,
} from '../middlewares/auth.middleware'

const router = Router()

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

    const { description, amount, type, category, date } = req.body

    if (!description || !amount || !type || !category || !date) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos son obligatorios',
      })
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        ok: false,
        message: 'El tipo de transacción no es válido',
      })
    }

    const parsedAmount = Number(amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'El monto debe ser mayor a cero',
      })
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`)

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        ok: false,
        message: 'La fecha no es válida',
      })
    }

    const transaction = await prisma.transaction.create({
      data: {
        description: String(description).trim(),
        amount: parsedAmount,
        type,
        category: String(category).trim(),
        date: parsedDate,
        userId: req.user.userId,
      },
    })

    const categoryExists = await prisma.category.findFirst({
      where: {
        userId: req.user.userId,
        name: String(category).trim(),
        type,
      },
    })

    if (!categoryExists) {
      return res.status(400).json({
        ok: false,
        message: 'La categoría seleccionada no es válida',
      })
    }

    return res.status(201).json({
      ok: true,
      message: 'Transacción creada correctamente',
      transaction,
    })

    
  } catch (error) {
    console.error('Error creando transacción:', error)

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
        message: 'ID de transacción inválido',
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
        message: 'Transacción no encontrada',
      })
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    })

    return res.json({
      ok: true,
      message: 'Transacción eliminada correctamente',
    })
  } catch (error) {
    console.error('Error eliminando transacción:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router