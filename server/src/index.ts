import express from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma'
import authRoutes from './routes/auth.routes'

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    message: 'Backend de control de gastos funcionando',
  })
})

app.get('/api/health', async (_req, res) => {
  try {
    const userCount = await prisma.user.count()

    res.json({
      ok: true,
      message: 'API saludable',
      users: userCount,
    })
  } catch (error) {
    console.error('Error en /api/health:', error)

    res.status(500).json({
      ok: false,
      message: 'Error conectando con la base de datos',
    })
  }
})

app.use('/api/auth', authRoutes)

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`)
})