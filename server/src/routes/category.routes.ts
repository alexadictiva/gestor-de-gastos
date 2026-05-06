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

    const categories = await prisma.category.findMany({
      where: {
        userId: req.user.userId,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return res.json({
      ok: true,
      categories,
    })
  } catch (error) {
    console.error('Error obteniendo categorías:', error)

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

    const { name, type, color } = req.body

    if (!name || !type) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre y tipo son obligatorios',
      })
    }

    const trimmedName = String(name).trim()
    const normalizedType = String(type).trim()

    if (!trimmedName) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre de la categoría no puede estar vacío',
      })
    }

    if (normalizedType !== 'income' && normalizedType !== 'expense') {
      return res.status(400).json({
        ok: false,
        message: 'El tipo de categoría no es válido',
      })
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: req.user.userId,
        name: trimmedName,
        type: normalizedType,
      },
    })

    if (existingCategory) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe una categoría con ese nombre y tipo',
      })
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        type: normalizedType,
        color: color || '#64748b',
        userId: req.user.userId,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Categoría creada correctamente',
      category,
    })
  } catch (error) {
    console.error('Error creando categoría:', error)

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

    const categoryId = req.params.id

    if (typeof categoryId !== 'string' || !categoryId.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'ID de categoría inválido',
      })
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: req.user.userId,
      },
    })

    if (!category) {
      return res.status(404).json({
        ok: false,
        message: 'Categoría no encontrada',
      })
    }

    await prisma.category.delete({
      where: {
        id: categoryId,
      },
    })

    return res.json({
      ok: true,
      message: 'Categoría eliminada correctamente',
    })
  } catch (error) {
    console.error('Error eliminando categoría:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router