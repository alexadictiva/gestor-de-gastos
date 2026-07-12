import nodemailer from 'nodemailer'

export type PasswordRecoveryDelivery = 'email' | 'console'

interface PasswordRecoveryEmailParams {
  to: string
  userName: string
  temporaryPassword: string
}

function getMailConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT ?? '587')
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim() || user

  if (!host || !from || !Number.isFinite(port)) {
    return null
  }

  return {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    from,
  }
}

export async function sendPasswordRecoveryEmail({
  to,
  userName,
  temporaryPassword,
}: PasswordRecoveryEmailParams): Promise<PasswordRecoveryDelivery> {
  const config = getMailConfig()

  if (!config) {
    console.info('Recuperacion de contrasena en modo consola:', {
      to,
      temporaryPassword,
    })

    return 'console'
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })

  await transporter.sendMail({
    from: config.from,
    to,
    subject: 'Recuperacion de contrasena - Control de Gastos',
    text: [
      `Hola ${userName},`,
      '',
      'Recibimos una solicitud para recuperar tu acceso.',
      `Tu contrasena temporal es: ${temporaryPassword}`,
      '',
      'Copia y pega esta contrasena para iniciar sesion.',
      'Te recomendamos cambiarla despues de ingresar.',
    ].join('\n'),
  })

  return 'email'
}
