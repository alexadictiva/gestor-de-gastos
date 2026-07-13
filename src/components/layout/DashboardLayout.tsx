import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="app-shell flex min-h-screen flex-1">
      <Sidebar />

      <div className="app-content">
        <Header />

        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  )
}
