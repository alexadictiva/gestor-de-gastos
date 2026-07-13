import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { user } = useAuth()

  return (
    <header className="app-header">
      <div>
        <p className="app-header-eyebrow">Control financiero personal</p>
        <h2 className="text-2xl font-semibold text-slate-800">
          Panel de control
        </h2>
        <p className="text-sm text-slate-500">
          Lleva tu liquidez, tus gastos y tus deudas en un solo lugar.
        </p>
      </div>

      <div className="app-header-user">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Sesion activa
        </p>
        <div className="mt-1 text-right">
          <p className="text-sm font-semibold text-slate-700">
            {user?.name}
          </p>
          <p className="text-xs text-slate-500">
            {user?.email}
          </p>
        </div>
      </div>
    </header>
  )
}
