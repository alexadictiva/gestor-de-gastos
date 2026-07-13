import DashboardLayout from '../components/layout/DashboardLayout'
import PeriodSummary from '../components/ui/PeriodSummary'
import type { Category } from '../types/category'
import type { Transaction } from '../types/transaction'

interface ResumenSemanalPageProps {
  transactions: Transaction[]
  categories: Category[]
  isLoadingTransactions: boolean
}

export default function ResumenSemanalPage({
  transactions,
  categories,
  isLoadingTransactions,
}: ResumenSemanalPageProps) {
  return (
    <DashboardLayout>
      <PeriodSummary
        title="Resumen semanal"
        description="Consulta tu desempeno de la semana actual con distribucion por tipo, categorias de gasto y detalle de movimientos."
        period="weekly"
        transactions={transactions}
        categories={categories}
        isLoadingTransactions={isLoadingTransactions}
      />
    </DashboardLayout>
  )
}
