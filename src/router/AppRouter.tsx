import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Dispatch, SetStateAction } from 'react'
import DashboardPage from '../pages/DashboardPage'
import CuentasPage from '../pages/CuentasPage'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import TransaccionesPage from '../pages/TransaccionesPage'
import CategoriasPage from '../pages/CategoriasPage'
import ResumenSemanalPage from '../pages/ResumenSemanalPage'
import ResumenMensualPage from '../pages/ResumenMensualPage'
import ConfiguracionPage from '../pages/ConfiguracionPage'
import type { Transaction } from '../types/transaction'
import type { Category } from '../types/category'
import type { FinancialAccount } from '../types/financialAccount'
import type { ObligationAccount } from '../types/obligationAccount'
import type { PlannedMovement } from '../types/plannedMovement'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import RegisterPage from '../pages/RegisterPage'
import ProyeccionPage from '../pages/ProyeccionPage'
import TarjetasPrestamosPage from '../pages/TarjetasPrestamosPage'

interface AppRouterProps {
  transactions: Transaction[]
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  isLoadingTransactions: boolean
  categories: Category[]
  setCategories: Dispatch<SetStateAction<Category[]>>
  isLoadingCategories: boolean
  financialAccounts: FinancialAccount[]
  setFinancialAccounts: Dispatch<SetStateAction<FinancialAccount[]>>
  isLoadingFinancialAccounts: boolean
  obligationAccounts: ObligationAccount[]
  setObligationAccounts: Dispatch<SetStateAction<ObligationAccount[]>>
  isLoadingObligationAccounts: boolean
  plannedMovements: PlannedMovement[]
  setPlannedMovements: Dispatch<SetStateAction<PlannedMovement[]>>
  isLoadingPlannedMovements: boolean
}

export default function AppRouter({
  transactions,
  setTransactions,
  isLoadingTransactions,
  categories,
  setCategories,
  isLoadingCategories,
  financialAccounts,
  setFinancialAccounts,
  isLoadingFinancialAccounts,
  obligationAccounts,
  setObligationAccounts,
  isLoadingObligationAccounts,
  plannedMovements,
  setPlannedMovements,
  isLoadingPlannedMovements,
}: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage 
              transactions={transactions} 
              categories={categories}
              financialAccounts={financialAccounts}
              obligationAccounts={obligationAccounts}
              plannedMovements={plannedMovements}
              isLoadingTransactions={isLoadingTransactions}
              isLoadingFinancialAccounts={isLoadingFinancialAccounts}
              isLoadingObligationAccounts={isLoadingObligationAccounts}
              isLoadingPlannedMovements={isLoadingPlannedMovements} />
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
                financialAccounts={financialAccounts}
                obligationAccounts={obligationAccounts}
                setObligationAccounts={setObligationAccounts}
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
              <ResumenSemanalPage
                transactions={transactions}
                categories={categories}
                isLoadingTransactions={isLoadingTransactions}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resumen-mensual"
          element={
            <ProtectedRoute>
              <ResumenMensualPage
                transactions={transactions}
                categories={categories}
                isLoadingTransactions={isLoadingTransactions}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cuentas"
          element={
            <ProtectedRoute>
              <CuentasPage
                financialAccounts={financialAccounts}
                setFinancialAccounts={setFinancialAccounts}
                transactions={transactions}
                isLoadingFinancialAccounts={isLoadingFinancialAccounts}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tarjetas-prestamos"
          element={
            <ProtectedRoute>
              <TarjetasPrestamosPage
                financialAccounts={financialAccounts}
                obligationAccounts={obligationAccounts}
                setObligationAccounts={setObligationAccounts}
                isLoadingObligationAccounts={isLoadingObligationAccounts}
                setTransactions={setTransactions}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/proyeccion"
          element={
            <ProtectedRoute>
              <ProyeccionPage
                plannedMovements={plannedMovements}
                setPlannedMovements={setPlannedMovements}
                isLoadingPlannedMovements={isLoadingPlannedMovements}
                setTransactions={setTransactions}
              />
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
