import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware'

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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email y contraseña son obligatorios',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const trimmedPassword = String(password).trim()

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    })

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas',
      })
    }

    const isPasswordValid = await bcrypt.compare(
      trimmedPassword,
      user.password
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas',
      })
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      return res.status(500).json({
        ok: false,
        message: 'JWT_SECRET no está configurado',
      })
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      jwtSecret,
      {
        expiresIn,
      }
    )

    return res.json({
      ok: true,
      message: 'Login correcto',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Error en login:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado',
      })
    }

    return res.json({
      ok: true,
      user,
    })
  } catch (error) {
    console.error('Error en /me:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router