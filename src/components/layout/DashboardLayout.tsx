import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

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
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  )
}
