import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'


interface JwtPayload {
  userId: string
  email: string
}

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      ok: false,
      message: 'Token no enviado',
    })
  }

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({
      ok: false,
      message: 'Formato de token inválido',
    })
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload

    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Token inválido o expirado' + error,
    })
  }
}