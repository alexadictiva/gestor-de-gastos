import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  normalizeFinancialAccountType,
  type FinancialAccountType,
} from '../lib/financial-account-fields'
import {
  authMiddleware,
  type AuthRequest,
} from '../middlewares/auth.middleware'

const router = Router()

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function normalizeOptionalText(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  return trimmedValue ? trimmedValue : null
}

function parseInitialBalance(value: unknown) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return 0
  }

  const parsedValue = Number(trimmedValue)

  if (!Number.isFinite(parsedValue)) {
    return Number.NaN
  }

  return roundAmount(parsedValue)
}

function sortAccountsByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((leftItem, rightItem) =>
    leftItem.name.localeCompare(rightItem.name, 'es', {
      sensitivity: 'base',
    })
  )
}

function validateFinancialAccountInput(body: Record<string, unknown>) {
  const trimmedName = String(body.name ?? '').trim()
  const normalizedType = normalizeFinancialAccountType(String(body.type ?? ''))
  const initialBalance = parseInitialBalance(body.initialBalance)
  const notes = normalizeOptionalText(body.notes)

  if (!trimmedName || !normalizedType) {
    return {
      error: 'Debes completar el nombre y el tipo de cuenta',
    }
  }

  if (Number.isNaN(initialBalance)) {
    return {
      error: 'El saldo inicial debe ser un numero valido',
    }
  }

  return {
    data: {
      name: trimmedName,
      type: normalizedType satisfies FinancialAccountType,
      initialBalance,
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

    const accounts = sortAccountsByName(
      await prisma.financialAccount.findMany({
        where: {
          userId: req.user.userId,
        },
      })
    )

    return res.json({
      ok: true,
      accounts,
    })
  } catch (error) {
    console.error('Error obteniendo cuentas financieras:', error)

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

    const validation = validateFinancialAccountInput(req.body)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const existingAccount = await prisma.financialAccount.findFirst({
      where: {
        userId: req.user.userId,
        name: validation.data.name,
      },
    })

    if (existingAccount) {
      return res.status(400).json({
        ok: false,
        message: 'Ya tienes una cuenta con ese nombre',
      })
    }

    const account = await prisma.financialAccount.create({
      data: {
        ...validation.data,
        userId: req.user.userId,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Cuenta creada correctamente',
      account,
    })
  } catch (error) {
    console.error('Error creando cuenta financiera:', error)

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

    const existingAccount = await prisma.financialAccount.findFirst({
      where: {
        id: accountId,
        userId: req.user.userId,
      },
    })

    if (!existingAccount) {
      return res.status(404).json({
        ok: false,
        message: 'Cuenta no encontrada',
      })
    }

    const validation = validateFinancialAccountInput(req.body)

    if ('error' in validation) {
      return res.status(400).json({
        ok: false,
        message: validation.error,
      })
    }

    const duplicatedAccount = await prisma.financialAccount.findFirst({
      where: {
        userId: req.user.userId,
        name: validation.data.name,
        id: {
          not: accountId,
        },
      },
    })

    if (duplicatedAccount) {
      return res.status(400).json({
        ok: false,
        message: 'Ya tienes otra cuenta con ese nombre',
      })
    }

    const account = await prisma.financialAccount.update({
      where: {
        id: accountId,
      },
      data: validation.data,
    })

    return res.json({
      ok: true,
      message: 'Cuenta actualizada correctamente',
      account,
    })
  } catch (error) {
    console.error('Error actualizando cuenta financiera:', error)

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

    const existingAccount = await prisma.financialAccount.findFirst({
      where: {
        id: accountId,
        userId: req.user.userId,
      },
      include: {
        transactions: {
          select: {
            id: true,
          },
        },
        obligationPayments: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingAccount) {
      return res.status(404).json({
        ok: false,
        message: 'Cuenta no encontrada',
      })
    }

    if (
      existingAccount.transactions.length > 0 ||
      existingAccount.obligationPayments.length > 0
    ) {
      return res.status(400).json({
        ok: false,
        message:
          'No puedes eliminar una cuenta que ya tiene movimientos asociados. Reasigna o elimina esos movimientos primero.',
      })
    }

    await prisma.financialAccount.delete({
      where: {
        id: accountId,
      },
    })

    return res.json({
      ok: true,
      message: 'Cuenta eliminada correctamente',
      deletedAccountId: accountId,
    })
  } catch (error) {
    console.error('Error eliminando cuenta financiera:', error)

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    })
  }
})

export default router
