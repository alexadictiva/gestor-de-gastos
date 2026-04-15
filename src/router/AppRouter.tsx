import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import TransaccionesPage from '../pages/TransaccionesPage'
import CategoriasPage from '../pages/CategoriasPage'
import ResumenSemanalPage from '../pages/ResumenSemanalPage'
import ResumenMensualPage from '../pages/ResumenMensualPage'
import type { Transaction } from '../types/transaction'
import type { Dispatch, SetStateAction } from 'react'

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
          element={<DashboardPage transactions={transactions} />}
        />
        <Route
          path="/transacciones"
          element={
            <TransaccionesPage
              transactions={transactions}
              setTransactions={setTransactions}
            />
          }
        />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/resumen-semanal" element={<ResumenSemanalPage />} />
        <Route path="/resumen-mensual" element={<ResumenMensualPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}