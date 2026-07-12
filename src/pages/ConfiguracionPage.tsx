import { useEffect, useMemo, useState, type FormEvent } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import {
  generateTelegramLinkCodeRequest,
  meRequest,
  unlinkTelegramRequest,
  updateProfileRequest,
} from '../services/authService'

interface ProfileForm {
  name: string
  email: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ConfiguracionPage() {
  const { user, token, updateSession } = useAuth()

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    email: '',
  })
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [telegramError, setTelegramError] = useState('')
  const [telegramSuccess, setTelegramSuccess] = useState('')
  const [telegramLinkCode, setTelegramLinkCode] = useState('')
  const [telegramLinkExpiresAt, setTelegramLinkExpiresAt] = useState('')
  const [telegramBotUsername, setTelegramBotUsername] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isGeneratingTelegramCode, setIsGeneratingTelegramCode] = useState(false)
  const [isRefreshingTelegramStatus, setIsRefreshingTelegramStatus] =
    useState(false)
  const [isUnlinkingTelegram, setIsUnlinkingTelegram] = useState(false)

  useEffect(() => {
    if (!user) return

    setProfileForm({
      name: user.name,
      email: user.email,
    })
  }, [user])

  const formattedTelegramExpiration = useMemo(() => {
    if (!telegramLinkExpiresAt) return ''

    return new Date(telegramLinkExpiresAt).toLocaleString('es-AR')
  }, [telegramLinkExpiresAt])

  const clearTelegramFeedback = () => {
    setTelegramError('')
    setTelegramSuccess('')
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!token) {
      setProfileError('No hay sesion activa')
      return
    }

    const trimmedName = profileForm.name.trim()
    const normalizedEmail = profileForm.email.trim().toLowerCase()

    if (!trimmedName || !normalizedEmail) {
      setProfileError('Nombre y email son obligatorios')
      return
    }

    try {
      setIsSavingProfile(true)
      const response = await updateProfileRequest(token, {
        name: trimmedName,
        email: normalizedEmail,
      })

      updateSession(response.user, response.token)
      setProfileSuccess('Perfil actualizado correctamente')
    } catch (error) {
      if (error instanceof Error) {
        setProfileError(error.message)
      } else {
        setProfileError('No se pudo actualizar el perfil')
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!token) {
      setPasswordError('No hay sesion activa')
      return
    }

    const trimmedCurrentPassword = passwordForm.currentPassword.trim()
    const trimmedNewPassword = passwordForm.newPassword.trim()
    const trimmedConfirmPassword = passwordForm.confirmPassword.trim()

    if (
      !trimmedCurrentPassword ||
      !trimmedNewPassword ||
      !trimmedConfirmPassword
    ) {
      setPasswordError('Completa todos los campos de contrasena')
      return
    }

    if (trimmedNewPassword.length < 6) {
      setPasswordError('La nueva contrasena debe tener al menos 6 caracteres')
      return
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setPasswordError('Las nuevas contrasenas no coinciden')
      return
    }

    try {
      setIsSavingPassword(true)
      const response = await updateProfileRequest(token, {
        currentPassword: trimmedCurrentPassword,
        newPassword: trimmedNewPassword,
      })

      updateSession(response.user, response.token)
      setPasswordSuccess('Contrasena actualizada correctamente')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      if (error instanceof Error) {
        setPasswordError(error.message)
      } else {
        setPasswordError('No se pudo actualizar la contrasena')
      }
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleGenerateTelegramCode = async () => {
    clearTelegramFeedback()

    if (!token) {
      setTelegramError('No hay sesion activa')
      return
    }

    try {
      setIsGeneratingTelegramCode(true)
      const response = await generateTelegramLinkCodeRequest(token)
      setTelegramLinkCode(response.code)
      setTelegramLinkExpiresAt(response.expiresAt)
      setTelegramBotUsername(response.botUsername || '')
      setTelegramSuccess(
        'Codigo generado. Envia el comando /link al bot para vincular tu cuenta.'
      )
    } catch (error) {
      if (error instanceof Error) {
        setTelegramError(error.message)
      } else {
        setTelegramError('No se pudo generar el codigo de Telegram')
      }
    } finally {
      setIsGeneratingTelegramCode(false)
    }
  }

  const handleRefreshTelegramStatus = async () => {
    clearTelegramFeedback()

    if (!token) {
      setTelegramError('No hay sesion activa')
      return
    }

    try {
      setIsRefreshingTelegramStatus(true)
      const response = await meRequest(token)
      updateSession(response.user, token)
      setTelegramSuccess(
        response.user.telegramConnected
          ? 'Telegram ya esta vinculado a tu cuenta.'
          : 'Aun no detecté una vinculación activa.'
      )
    } catch (error) {
      if (error instanceof Error) {
        setTelegramError(error.message)
      } else {
        setTelegramError('No se pudo actualizar el estado de Telegram')
      }
    } finally {
      setIsRefreshingTelegramStatus(false)
    }
  }

  const handleUnlinkTelegram = async () => {
    clearTelegramFeedback()

    if (!token) {
      setTelegramError('No hay sesion activa')
      return
    }

    try {
      setIsUnlinkingTelegram(true)
      const response = await unlinkTelegramRequest(token)
      updateSession(response.user, response.token)
      setTelegramLinkCode('')
      setTelegramLinkExpiresAt('')
      setTelegramSuccess('Telegram fue desvinculado correctamente.')
    } catch (error) {
      if (error instanceof Error) {
        setTelegramError(error.message)
      } else {
        setTelegramError('No se pudo desvincular Telegram')
      }
    } finally {
      setIsUnlinkingTelegram(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configuracion</h1>
          <p className="text-slate-600">
            Actualiza tu informacion personal, tu seguridad y tus integraciones.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">
              Perfil
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Cambia tu nombre y tu email.
            </p>

            {profileError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="settings-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Nombre
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="settings-email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? 'Guardando...' : 'Guardar perfil'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">
              Seguridad
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Cambia tu contrasena usando la contrasena actual.
            </p>

            {passwordError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {passwordSuccess}
              </div>
            )}

            <form
              onSubmit={handlePasswordSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="current-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Contrasena actual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="new-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Nueva contrasena
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirm-new-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Confirmar nueva contrasena
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingPassword ? 'Actualizando...' : 'Cambiar contrasena'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Integracion con Telegram
              </h2>
              <p className="text-sm text-slate-500">
                Vincula tu cuenta para registrar movimientos enviando mensajes al bot.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                user?.telegramConnected
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {user?.telegramConnected ? 'Vinculado' : 'Sin vincular'}
            </span>
          </div>

          {telegramError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {telegramError}
            </div>
          )}

          {telegramSuccess && (
            <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {telegramSuccess}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-800">
                Vinculacion
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Genera un codigo en la app y envialo por Telegram con el comando
                <span className="font-medium text-slate-700"> /link CODIGO</span>.
              </p>

              {telegramLinkCode && (
                <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Codigo actual
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-[0.25em]">
                    {telegramLinkCode}
                  </p>
                  {formattedTelegramExpiration && (
                    <p className="mt-2 text-sm text-slate-300">
                      Expira: {formattedTelegramExpiration}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-300">
                    {telegramBotUsername
                      ? `Busca a @${telegramBotUsername} y envia /link ${telegramLinkCode}`
                      : `Envia /link ${telegramLinkCode} a tu bot de Telegram`}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateTelegramCode}
                  disabled={isGeneratingTelegramCode}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingTelegramCode
                    ? 'Generando...'
                    : 'Generar codigo'}
                </button>

                <button
                  type="button"
                  onClick={handleRefreshTelegramStatus}
                  disabled={isRefreshingTelegramStatus || !token}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshingTelegramStatus
                    ? 'Verificando...'
                    : 'Actualizar estado'}
                </button>

                {user?.telegramConnected && (
                  <button
                    type="button"
                    onClick={handleUnlinkTelegram}
                    disabled={isUnlinkingTelegram}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUnlinkingTelegram
                      ? 'Desvinculando...'
                      : 'Desvincular'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-800">
                Formatos de mensaje
              </h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Gasto:</span>{' '}
                  <code>gasto 2500 comida - Supermercado</code>
                </p>
                <p>
                  <span className="font-medium text-slate-800">
                    Gasto con fecha:
                  </span>{' '}
                  <code>gasto 2500 comida - Supermercado - 2026-07-12</code>
                </p>
                <p>
                  <span className="font-medium text-slate-800">Ingreso:</span>{' '}
                  <code>ingreso 120000 sueldo - Salario julio</code>
                </p>
                <p>
                  <span className="font-medium text-slate-800">
                    Ingreso con fecha:
                  </span>{' '}
                  <code>
                    ingreso 120000 sueldo - Salario julio fecha:2026-07-12
                  </code>
                </p>
                <p>
                  <span className="font-medium text-slate-800">Inversion:</span>{' '}
                  <code>inversion 30000 cedears - Compra mensual</code>
                </p>
                <p>
                  <span className="font-medium text-slate-800">Formato completo:</span>{' '}
                  <code>
                    gasto 2500 categoria:comida descripcion:super fecha:2026-07-12
                  </code>
                </p>
                <p className="text-xs text-slate-500">
                  La fecha es opcional. Si no la envias, el bot usa la fecha actual. La categoria debe existir en tu cuenta para ese tipo de movimiento.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
