import { useEffect, useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h10A2.5 2.5 0 0 1 18 7.5V9H6.5A2.5 2.5 0 0 0 4 11.5v5A2.5 2.5 0 0 0 6.5 19H18v1.5A2.5 2.5 0 0 1 15.5 23h-10A2.5 2.5 0 0 1 3 20.5z" />
      <path d="M20 9h-9.5A2.5 2.5 0 0 0 8 11.5v5a2.5 2.5 0 0 0 2.5 2.5H20a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1Z" />
      <path d="M16.5 14h.01" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const isDesktopViewport = window.matchMedia('(min-width: 1024px)').matches

    document.body.style.overflow =
      !isDesktopViewport && isSidebarOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  return (
    <div className={`app-shell ${isSidebarOpen ? 'app-shell--sidebar-open' : ''}`}>
      <div
        className="app-sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="app-content">
        <header className="app-mobile-header">
          <div className="app-mobile-brand">
            <div className="app-mobile-brand-logo">
              <WalletIcon />
            </div>

            <div className="app-mobile-brand-copy">
              <p className="app-mobile-brand-title">Control de gastos</p>
              <p className="app-mobile-brand-subtitle">Panel administrativo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="app-mobile-menu-button"
            aria-label={isSidebarOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={isSidebarOpen}
          >
            <MenuIcon />
          </button>
        </header>

        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  )
}
