import { Router } from 'express'
import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware'
import { sendPasswordRecoveryEmail } from '../lib/mailer'
import { getTelegramIntegrationStatus } from '../lib/telegram'

const router = Router()
const authUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  telegramChatId: true,
} as const

interface AuthUserRecord {
  id: string
  name: string
  email: string
  createdAt: Date
  telegramChatId: string | null
}

function generateTemporaryPassword(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

  return Array.from({ length }, () =>
    alphabet[randomInt(0, alphabet.length)]
  ).join('')
}

function generateTelegramLinkCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  return Array.from({ length }, () =>
    alphabet[randomInt(0, alphabet.length)]
  ).join('')
}

function createAuthToken(userId: string, email: string) {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET no configurado')
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

  return jwt.sign(
    {
      userId,
      email,
    },
    jwtSecret,
    {
      expiresIn,
    }
  )
}

function serializeAuthUser(user: AuthUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    telegramConnected: Boolean(user.telegramChatId),
  }
}

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
      select: authUserSelect,
    })

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado correctamente',
      user: serializeAuthUser(newUser),
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
      user: serializeAuthUser(user),
    })
  } catch (error) {
    console.error('Error en login:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: 'El email es obligatorio',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    if (!normalizedEmail) {
      return res.status(400).json({
        ok: false,
        message: 'El email no puede estar vacio',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    })

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'No existe un usuario con ese email',
      })
    }

    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)
    const delivery = await sendPasswordRecoveryEmail({
      to: user.email,
      userName: user.name,
      temporaryPassword,
    })

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    })

    return res.json({
      ok: true,
      message:
        delivery === 'email'
          ? 'Se envio una contrasena temporal a tu email'
          : 'SMTP no configurado: la contrasena temporal se mostro en la consola del backend',
      delivery,
    })
  } catch (error) {
    console.error('Error en forgot-password:', error)

    return res.status(500).json({
      ok: false,
      message: 'No se pudo recuperar la contrasena',
    })
  }
})

router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado',
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
    })

    if (!existingUser) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado',
      })
    }

    const trimmedName = String(req.body.name ?? '').trim()
    const normalizedEmail = String(req.body.email ?? '').trim().toLowerCase()
    const currentPassword = String(req.body.currentPassword ?? '').trim()
    const newPassword = String(req.body.newPassword ?? '').trim()

    const shouldUpdateProfile = Boolean(trimmedName || normalizedEmail)
    const shouldUpdatePassword = Boolean(currentPassword || newPassword)

    if (!shouldUpdateProfile && !shouldUpdatePassword) {
      return res.status(400).json({
        ok: false,
        message: 'No hay cambios para actualizar',
      })
    }

    if (shouldUpdateProfile) {
      if (!trimmedName || !normalizedEmail) {
        return res.status(400).json({
          ok: false,
          message: 'Nombre y email son obligatorios',
        })
      }

      const duplicatedUser = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id: existingUser.id,
          },
        },
      })

      if (duplicatedUser) {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe un usuario con ese email',
        })
      }
    }

    if (shouldUpdatePassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          ok: false,
          message: 'Debes completar la contrasena actual y la nueva',
        })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          message: 'La nueva contrasena debe tener al menos 6 caracteres',
        })
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        existingUser.password
      )

      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          ok: false,
          message: 'La contrasena actual es incorrecta',
        })
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        ...(shouldUpdateProfile
          ? {
              name: trimmedName,
              email: normalizedEmail,
            }
          : {}),
        ...(shouldUpdatePassword
          ? {
              password: await bcrypt.hash(newPassword, 10),
            }
          : {}),
      },
      select: authUserSelect,
    })

    const token = createAuthToken(updatedUser.id, updatedUser.email)

    return res.json({
      ok: true,
      message: shouldUpdatePassword
        ? 'Cuenta actualizada correctamente'
        : 'Perfil actualizado correctamente',
      token,
      user: serializeAuthUser(updatedUser),
    })
  } catch (error) {
    console.error('Error en /profile:', error)

    return res.status(500).json({
      ok: false,
      message: 'No se pudo actualizar la cuenta',
    })
  }
})

router.get(
  '/telegram/status',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          message: 'Usuario no autenticado',
        })
      }

      const status = getTelegramIntegrationStatus()

      return res.json({
        ok: true,
        configured: status.configured,
        botUsername: status.botUsername,
        message: status.message,
      })
    } catch (error) {
      console.error('Error en /telegram/status:', error)

      return res.status(500).json({
        ok: false,
        message: 'No se pudo obtener el estado de Telegram',
      })
    }
  }
)

router.post(
  '/telegram/link-code',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          message: 'Usuario no autenticado',
        })
      }

      const status = getTelegramIntegrationStatus()

      if (!status.configured) {
        return res.status(503).json({
          ok: false,
          message: 'Telegram no esta configurado en el backend',
          configured: false,
          botUsername: status.botUsername,
          details: status.message,
        })
      }

      const currentUser = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

      if (!currentUser) {
        return res.status(404).json({
          ok: false,
          message: 'Usuario no encontrado',
        })
      }

      const code = generateTelegramLinkCode()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await prisma.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          telegramLinkCode: code,
          telegramLinkCodeExpiresAt: expiresAt,
        },
      })

      return res.json({
        ok: true,
        message: 'Codigo generado correctamente',
        code,
        expiresAt: expiresAt.toISOString(),
        botUsername: status.botUsername,
      })
    } catch (error) {
      console.error('Error en /telegram/link-code:', error)

      return res.status(500).json({
        ok: false,
        message: 'No se pudo generar el codigo de vinculacion',
      })
    }
  }
)

router.delete(
  '/telegram/link',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          message: 'Usuario no autenticado',
        })
      }

      const currentUser = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

      if (!currentUser) {
        return res.status(404).json({
          ok: false,
          message: 'Usuario no encontrado',
        })
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          telegramChatId: null,
          telegramLinkCode: null,
          telegramLinkCodeExpiresAt: null,
        },
        select: authUserSelect,
      })

      const token = createAuthToken(updatedUser.id, updatedUser.email)

      return res.json({
        ok: true,
        message: 'Telegram desvinculado correctamente',
        token,
        user: serializeAuthUser(updatedUser),
      })
    } catch (error) {
      console.error('Error en /telegram/link:', error)

      return res.status(500).json({
        ok: false,
        message: 'No se pudo desvincular Telegram',
      })
    }
  }
)

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
      select: authUserSelect,
    })

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado',
      })
    }

    return res.json({
      ok: true,
      user: serializeAuthUser(user),
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
