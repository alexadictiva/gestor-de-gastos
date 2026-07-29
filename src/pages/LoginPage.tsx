import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/layout/Modal'
import { forgotPasswordRequest } from '../services/authService'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Cargando...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email y contraseña son obligatorios')
      return
    }

    try {
      setIsSubmitting(true)
      await login(email, password)
      navigate('/dashboard')
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al iniciar sesión')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const openRecoveryModal = () => {
    setRecoveryEmail(email.trim().toLowerCase())
    setRecoveryMessage('')
    setRecoveryError('')
    setIsRecoveryModalOpen(true)
  }

  const closeRecoveryModal = () => {
    setRecoveryMessage('')
    setRecoveryError('')
    setIsRecoveryModalOpen(false)
  }

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRecoveryMessage('')
    setRecoveryError('')

    const normalizedRecoveryEmail = recoveryEmail.trim().toLowerCase()

    if (!normalizedRecoveryEmail) {
      setRecoveryError('Debes ingresar tu email')
      return
    }

    try {
      setIsRecoveringPassword(true)
      const response = await forgotPasswordRequest({
        email: normalizedRecoveryEmail,
      })
      setRecoveryMessage(response.message)
    } catch (error) {
      if (error instanceof Error) {
        setRecoveryError(error.message)
      } else {
        setRecoveryError('No se pudo recuperar la contrasena')
      }
    } finally {
      setIsRecoveringPassword(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Control de gastos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inicia sesión para acceder al panel
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
              placeholder="alex@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
              placeholder="Tu contraseña"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openRecoveryModal}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
            >
              Recuperar contrasena
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link
            to="/registro"
            className="font-medium text-slate-800 hover:underline"
        >
            Regístrate
        </Link>
      </p>

      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={closeRecoveryModal}
        title="Recuperar contrasena"
      >
        <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Confirma tu email para enviarte una contrasena temporal.
          </p>

          {recoveryError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {recoveryError}
            </div>
          )}

          {recoveryMessage && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {recoveryMessage}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="recovery-email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="recovery-email"
              type="email"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
              placeholder="alex@example.com"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeRecoveryModal}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar
            </button>

            <button
              type="submit"
              disabled={isRecoveringPassword}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRecoveringPassword ? 'Enviando...' : 'Enviar contrasena'}
            </button>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  )
}
