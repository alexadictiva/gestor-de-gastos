import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Dispatch, SetStateAction } from 'react'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import TransaccionesPage from '../pages/TransaccionesPage'
import CategoriasPage from '../pages/CategoriasPage'
import ResumenSemanalPage from '../pages/ResumenSemanalPage'
import ResumenMensualPage from '../pages/ResumenMensualPage'
import type { Transaction } from '../types/transaction'
import ProtectedRoute from '../components/auth/ProtectedRoute'

interface AppRouterProps {
  transactions: Transaction[]
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}

export default function AppRouter({
  transactions,
  setTransactions,
}: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage transactions={transactions} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transacciones"
          element={
            <ProtectedRoute>
              <TransaccionesPage
                transactions={transactions}
                setTransactions={setTransactions}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categorias"
          element={
            <ProtectedRoute>
              <CategoriasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resumen-semanal"
          element={
            <ProtectedRoute>
              <ResumenSemanalPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resumen-mensual"
          element={
            <ProtectedRoute>
              <ResumenMensualPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}