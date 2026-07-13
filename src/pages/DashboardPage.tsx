import DashboardLayout from '../components/layout/DashboardLayout'
import VoiceAssistant from '../components/ui/VoiceAssistant'
import {
  getPaymentMethodLabel,
  getReimbursementStatusLabel,
} from '../types/transaction'
import type { Transaction } from '../types/transaction'
import {
  buildTransactionMetrics,
  getPaymentMethodTone,
  getReimbursementStatusTone,
  getTransactionTypeLabel,
  getTransactionTypeTone,
} from '../utils/transactionMetrics'

interface DashboardPageProps {
  transactions: Transaction[]
  isLoadingTransactions: boolean
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

export default function DashboardPage({
  transactions,
  isLoadingTransactions,
}: DashboardPageProps) {
  const {
    incomeTotal,
    personalExpenseTotal,
    reimbursablePendingTotal,
    reimbursableRecoveredTotal,
    investmentsTotal,
    personalBalanceTotal,
  } = buildTransactionMetrics(transactions)

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Balance personal</p>
            <h2 className="text-2xl font-bold text-slate-800">
              {formatCurrency(personalBalanceTotal)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Ingresos</p>
            <h2 className="text-2xl font-bold text-green-600">
              {formatCurrency(incomeTotal)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Gastos personales</p>
            <h2 className="text-2xl font-bold text-red-600">
              {formatCurrency(personalExpenseTotal)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Por cobrar</p>
            <h2 className="text-2xl font-bold text-amber-600">
              {formatCurrency(reimbursablePendingTotal)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Reembolsables cobrados</p>
            <h2 className="text-2xl font-bold text-emerald-600">
              {formatCurrency(reimbursableRecoveredTotal)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Inversiones</p>
            <h2 className="text-2xl font-bold text-violet-600">
              {formatCurrency(investmentsTotal)}
            </h2>
          </div>
        </div>

        <VoiceAssistant
          balanceTotal={personalBalanceTotal}
          incomeTotal={incomeTotal}
          expenseTotal={personalExpenseTotal}
          investmentsTotal={investmentsTotal}
          reimbursablePendingTotal={reimbursablePendingTotal}
        />

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            Ultimas transacciones
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="py-2">Descripcion</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Categoria</th>
                  <th className="py-2">Medio de pago</th>
                  <th className="py-2">Reembolso</th>
                  <th className="py-2">Fecha</th>
                </tr>
              </thead>

              <tbody>
                {isLoadingTransactions ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Cargando transacciones...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium text-slate-600">
                          No hay transacciones aun
                        </p>
                        <p className="text-sm text-slate-400">
                          Agrega tu primera transaccion para comenzar
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-b-0">
                      <td className="py-2">{transaction.description}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td className={getTransactionTypeTone(transaction.type)}>
                        {getTransactionTypeLabel(transaction.type)}
                      </td>
                      <td>{transaction.category}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentMethodTone(transaction.paymentMethod)}`}
                        >
                          {getPaymentMethodLabel(transaction.paymentMethod)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getReimbursementStatusTone(transaction.reimbursementStatus)}`}
                        >
                          {getReimbursementStatusLabel(
                            transaction.reimbursementStatus
                          )}
                        </span>
                      </td>
                      <td>{transaction.date.slice(0, 10)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
