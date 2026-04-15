import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre, email y contraseña son obligatorios',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const trimmedName = String(name).trim()
    const trimmedPassword = String(password).trim()

    if (!trimmedName || !normalizedEmail || !trimmedPassword) {
      return res.status(400).json({
        ok: false,
        message: 'Los campos no pueden estar vacíos',
      })
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña debe tener al menos 6 caracteres',
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    })

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un usuario con ese email',
      })
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10)

    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado correctamente',
      user: newUser,
    })
  } catch (error) {
    console.error('Error en register:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router