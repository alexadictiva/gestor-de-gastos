import type { ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type IconProps = {
  className?: string
}

interface SidebarNavItem {
  to: string
  label: string
  icon: ComponentType<IconProps>
  end?: boolean
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function WalletIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h10A2.5 2.5 0 0 1 18 7.5V9H6.5A2.5 2.5 0 0 0 4 11.5v5A2.5 2.5 0 0 0 6.5 19H18v1.5A2.5 2.5 0 0 1 15.5 23h-10A2.5 2.5 0 0 1 3 20.5z" />
      <path d="M20 9h-9.5A2.5 2.5 0 0 0 8 11.5v5a2.5 2.5 0 0 0 2.5 2.5H20a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1Z" />
      <path d="M16.5 14h.01" />
    </svg>
  )
}

function DashboardIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="14" y="10" width="7" height="11" rx="1.5" />
      <rect x="3" y="13" width="7" height="8" rx="1.5" />
    </svg>
  )
}

function ReceiptIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3h9l4 4v14l-2-1.5L15 21l-3-1.5L9 21l-3-1.5L4 21V5a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
    </svg>
  )
}

function TagIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10 11 19l-8-8V4h7Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  )
}

function CreditCardIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6.5 14.5h4" />
    </svg>
  )
}

function CalendarIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  )
}

function BarChartIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-3" />
    </svg>
  )
}

function SettingsIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
      <path d="m19.4 15-.2.35a2 2 0 0 0 .2 2.3l.05.05a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.05-.05a2 2 0 0 0-2.3-.2l-.35.2a2 2 0 0 0-1 1.73V22a2 2 0 0 1-4 0v-.08a2 2 0 0 0-1-1.73l-.35-.2a2 2 0 0 0-2.3.2l-.05.05a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.05-.05a2 2 0 0 0 .2-2.3L2.6 15a2 2 0 0 0-1.73-1H.8a2 2 0 0 1 0-4h.08a2 2 0 0 0 1.73-1l.2-.35a2 2 0 0 0-.2-2.3l-.05-.05a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.05.05a2 2 0 0 0 2.3.2l.35-.2a2 2 0 0 0 1-1.73V2a2 2 0 0 1 4 0v.08a2 2 0 0 0 1 1.73l.35.2a2 2 0 0 0 2.3-.2l.05-.05a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.05.05a2 2 0 0 0-.2 2.3l.2.35a2 2 0 0 0 1.73 1H23a2 2 0 0 1 0 4h-.08a2 2 0 0 0-1.73 1Z" />
    </svg>
  )
}

function LogoutIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 16.5 19 12l-5-4.5" />
      <path d="M9 12h10" />
      <path d="M11 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

function CloseIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

const navItems: SidebarNavItem[] = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/transacciones', label: 'Transacciones', icon: ReceiptIcon },
  { to: '/categorias', label: 'Categorias', icon: TagIcon },
  {
    to: '/tarjetas-prestamos',
    label: 'Tarjetas y Prestamos',
    icon: CreditCardIcon,
  },
  { to: '/proyeccion', label: 'Proyeccion', icon: CalendarIcon },
  { to: '/resumen-semanal', label: 'Resumen semanal', icon: BarChartIcon },
  { to: '/resumen-mensual', label: 'Resumen mensual', icon: BarChartIcon },
] as const

function getUserInitials(name?: string | null) {
  if (!name) {
    return 'CG'
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'CG'
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login')
  }

  return (
    <aside className={`app-sidebar ${isOpen ? 'app-sidebar--open' : ''}`}>
      <div className="app-sidebar-brand">
        <div className="app-sidebar-logo">
          <WalletIcon className="h-5 w-5" />
        </div>

        <div className="app-sidebar-brand-copy">
          <p className="app-sidebar-brand-title">Control de gastos</p>
          <p className="app-sidebar-brand-subtitle">Panel administrativo</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="app-sidebar-close"
          aria-label="Cerrar menu"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="app-sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `app-nav-link ${isActive ? 'app-nav-link--active' : ''}`
              }
            >
              <Icon className="app-nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-user-card">
          <div className="app-user-avatar">
            {getUserInitials(user?.name)}
          </div>

          <div>
            <p className="app-user-name">{user?.name ?? 'Usuario'}</p>
            <p className="app-user-email">{user?.email ?? 'Sin email'}</p>
          </div>
        </div>

        <NavLink
          to="/configuracion"
          onClick={onClose}
          className={({ isActive }) =>
            `app-sidebar-action ${isActive ? 'app-nav-link--active' : ''}`
          }
        >
          <SettingsIcon className="app-nav-icon" />
          <span>Configuracion</span>
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="app-sidebar-action app-sidebar-action--danger"
        >
          <LogoutIcon className="app-nav-icon" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  )
}
