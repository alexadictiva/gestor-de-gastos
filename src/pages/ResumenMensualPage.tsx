import DashboardLayout from '../components/layout/DashboardLayout'
import PeriodSummary from '../components/ui/PeriodSummary'
import type { Category } from '../types/category'
import type { Transaction } from '../types/transaction'

interface ResumenMensualPageProps {
  transactions: Transaction[]
  categories: Category[]
  isLoadingTransactions: boolean
}

export default function ResumenMensualPage({
  transactions,
  categories,
  isLoadingTransactions,
}: ResumenMensualPageProps) {
  return (
    <DashboardLayout>
      <PeriodSummary
        title="Resumen mensual"
        description="Visualiza el comportamiento del mes actual con graficos de dona, control de gasto y detalle completo de tus movimientos."
        period="monthly"
        transactions={transactions}
        categories={categories}
        isLoadingTransactions={isLoadingTransactions}
      />
    </DashboardLayout>
  )
}
