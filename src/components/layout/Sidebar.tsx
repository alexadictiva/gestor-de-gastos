import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/transacciones', label: 'Transacciones' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/configuracion', label: 'Configuracion' },
  { to: '/resumen-semanal', label: 'Resumen semanal' },
  { to: '/resumen-mensual', label: 'Resumen mensual' },
]

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 bg-slate-900 p-4 text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Control de gastos</h1>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-4 py-3 transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
