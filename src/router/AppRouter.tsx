import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Dispatch, SetStateAction } from 'react'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import TransaccionesPage from '../pages/TransaccionesPage'
import CategoriasPage from '../pages/CategoriasPage'
import ResumenSemanalPage from '../pages/ResumenSemanalPage'
import ResumenMensualPage from '../pages/ResumenMensualPage'
import ConfiguracionPage from '../pages/ConfiguracionPage'
import type { Transaction } from '../types/transaction'
import type { Category } from '../types/category'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import RegisterPage from '../pages/RegisterPage'

interface AppRouterProps {
  transactions: Transaction[]
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  isLoadingTransactions: boolean
  categories: Category[]
  setCategories: Dispatch<SetStateAction<Category[]>>
  isLoadingCategories: boolean
}

export default function AppRouter({
  transactions,
  setTransactions,
  isLoadingTransactions,
  categories,
  setCategories,
  isLoadingCategories,
}: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage 
              transactions={transactions} 
              isLoadingTransactions={isLoadingTransactions} />
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
                isLoadingTransactions={isLoadingTransactions}
                categories={categories}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categorias"
          element={
            <ProtectedRoute>
              <CategoriasPage
                categories={categories}
                setCategories={setCategories}
                isLoadingCategories={isLoadingCategories}
                setTransactions={setTransactions}
              />
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

        <Route
          path="/configuracion"
          element={
            <ProtectedRoute>
              <ConfiguracionPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
