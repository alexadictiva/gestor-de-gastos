import { useEffect, useState, type FormEvent } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { updateProfileRequest } from '../services/authService'

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
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    if (!user) return

    setProfileForm({
      name: user.name,
      email: user.email,
    })
  }, [user])

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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configuracion</h1>
          <p className="text-slate-600">
            Actualiza tu informacion personal y la seguridad de tu cuenta.
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
      </div>
    </DashboardLayout>
  )
}
