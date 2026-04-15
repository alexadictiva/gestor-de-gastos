import DashboardLayout from '../components/layout/DashboardLayout'
import type { Transaction } from '../types/transaction'

interface DashboardPageProps {
  transactions: Transaction[]
}

export default function DashboardPage({
  transactions,
}: DashboardPageProps) {
  const incomeTotal = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((acc, transaction) => acc + transaction.amount, 0)

  const expenseTotal = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((acc, transaction) => acc + transaction.amount, 0)

  const balanceTotal = incomeTotal - expenseTotal

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Balance total</p>
            <h2 className="text-2xl font-bold text-slate-800">
              ${balanceTotal}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Ingresos</p>
            <h2 className="text-2xl font-bold text-green-600">
              ${incomeTotal}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Gastos</p>
            <h2 className="text-2xl font-bold text-red-600">
              ${expenseTotal}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Ahorro</p>
            <h2 className="text-2xl font-bold text-blue-600">
              ${balanceTotal}
            </h2>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            Últimas transacciones
          </h3>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-2">Descripción</th>
                <th>Monto</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Fecha</th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-medium text-slate-600">
                        No hay transacciones aún
                      </p>
                      <p className="text-sm text-slate-400">
                        Agrega tu primera transacción para comenzar
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b last:border-b-0">
                    <td className="py-2">{transaction.description}</td>
                    <td>${transaction.amount}</td>
                    <td
                      className={
                        transaction.type === 'expense'
                          ? 'text-red-500'
                          : 'text-green-600'
                      }
                    >
                      {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                    </td>
                    <td>{transaction.category}</td>
                    <td>{transaction.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}