import DashboardLayout from '../components/layout/DashboardLayout'
import VoiceAssistant from '../components/ui/VoiceAssistant'
import type { Category } from '../types/category'
import { getObligationAccountTypeLabel } from '../types/obligationAccount'
import type { ObligationAccount } from '../types/obligationAccount'
import type { PlannedMovement } from '../types/plannedMovement'
import type { Transaction } from '../types/transaction'
import {
  buildObligationDashboardSummary,
} from '../utils/obligationAccount'
import {
  buildPlannedMovementMetrics,
  filterPlannedMovementsByMonth,
  getNextMonthKey,
  getPendingPlannedMovements,
} from '../utils/plannedMovement'
import {
  buildTransactionMetrics,
  getPaymentMethodTone,
  isExpenseTransaction,
} from '../utils/transactionMetrics'
import { getPaymentMethodLabel } from '../types/transaction'

interface DashboardPageProps {
  transactions: Transaction[]
  categories: Category[]
  obligationAccounts: ObligationAccount[]
  plannedMovements: PlannedMovement[]
  isLoadingTransactions: boolean
  isLoadingObligationAccounts: boolean
  isLoadingPlannedMovements: boolean
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className={`mt-2 text-2xl font-bold ${tone}`}>{value}</h2>
    </div>
  )
}

export default function DashboardPage({
  transactions,
  categories,
  obligationAccounts,
  plannedMovements,
  isLoadingTransactions,
  isLoadingObligationAccounts,
  isLoadingPlannedMovements,
}: DashboardPageProps) {
  const {
    incomeTotal,
    debtCollectionTotal,
    personalExpenseTotal,
    financedPersonalExpenseTotal,
    reimbursablePendingTotal,
    reimbursableRecoveredTotal,
    debtPaymentTotal,
    investmentsTotal,
    personalBalanceTotal,
    availableLiquidityTotal,
  } = buildTransactionMetrics(transactions)

  const nextMonthItems = filterPlannedMovementsByMonth(
    plannedMovements,
    getNextMonthKey()
  )
  const pendingNextMonthItems = getPendingPlannedMovements(nextMonthItems)

  const {
    projectedIncomeTotal,
    projectedExpenseTotal,
    projectedBalanceTotal,
    recurringItemsCount,
  } = buildPlannedMovementMetrics(nextMonthItems)

  const {
    creditCardOutstandingTotal,
    loanPayableOutstandingTotal,
    loanReceivableOutstandingTotal,
    payablePaymentsThisMonthTotal,
    receivableCollectionsThisMonthTotal,
    upcomingOpenObligations,
  } = buildObligationDashboardSummary(obligationAccounts)

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-600">
            Revisa tu liquidez, tus consumos y el estado general de tu economia.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Liquidez disponible"
            value={formatCurrency(availableLiquidityTotal)}
            tone={
              availableLiquidityTotal >= 0 ? 'text-slate-800' : 'text-red-600'
            }
          />
          <StatCard
            label="Balance operativo"
            value={formatCurrency(personalBalanceTotal)}
            tone={
              personalBalanceTotal >= 0 ? 'text-slate-800' : 'text-red-600'
            }
          />
          <StatCard
            label="Ingresos"
            value={formatCurrency(incomeTotal)}
            tone="text-green-600"
          />
          <StatCard
            label="Gastos personales"
            value={formatCurrency(personalExpenseTotal)}
            tone="text-red-600"
          />
          <StatCard
            label="Consumo financiado"
            value={formatCurrency(financedPersonalExpenseTotal)}
            tone="text-amber-600"
          />
          <StatCard
            label="Pagos de deuda"
            value={formatCurrency(debtPaymentTotal)}
            tone="text-sky-600"
          />
          <StatCard
            label="Cobros de deuda"
            value={formatCurrency(debtCollectionTotal)}
            tone="text-emerald-600"
          />
          <StatCard
            label="Por cobrar"
            value={formatCurrency(reimbursablePendingTotal)}
            tone="text-amber-600"
          />
          <StatCard
            label="Reembolsables cobrados"
            value={formatCurrency(reimbursableRecoveredTotal)}
            tone="text-emerald-600"
          />
          <StatCard
            label="Inversiones"
            value={formatCurrency(investmentsTotal)}
            tone="text-violet-600"
          />
        </div>

        <VoiceAssistant
          availableLiquidityTotal={availableLiquidityTotal}
          operatingBalanceTotal={personalBalanceTotal}
          incomeTotal={incomeTotal}
          expenseTotal={personalExpenseTotal}
          financedExpenseTotal={financedPersonalExpenseTotal}
          investmentsTotal={investmentsTotal}
          reimbursablePendingTotal={reimbursablePendingTotal}
        />

        <section className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">
              Panorama general
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Resumen de lo que ya tienes cargado en la app.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard
                label="Transacciones reales"
                value={
                  isLoadingTransactions
                    ? 'Cargando...'
                    : transactions.length.toLocaleString('es-AR')
                }
                tone="text-slate-800"
              />
              <StatCard
                label="Categorias creadas"
                value={categories.length.toLocaleString('es-AR')}
                tone="text-sky-600"
              />
              <StatCard
                label="Gastos reembolsables activos"
                value={
                  transactions
                    .filter(
                      (transaction) =>
                        transaction.reimbursementStatus === 'pending'
                    )
                    .length.toLocaleString('es-AR')
                }
                tone="text-amber-600"
              />
              <StatCard
                label="Medios de pago usados"
                value={
                  new Set(
                    transactions
                      .filter(
                        (transaction) =>
                          isExpenseTransaction(transaction) &&
                          transaction.paymentMethod !== 'not_specified'
                      )
                      .map((transaction) => transaction.paymentMethod)
                  ).size.toLocaleString('es-AR')
                }
                tone="text-violet-600"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">
              Tarjetas y prestamos
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Saldos pendientes, cobros esperados y actividad del mes.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard
                label="Tarjetas pendientes"
                value={
                  isLoadingObligationAccounts
                    ? 'Cargando...'
                    : formatCurrency(creditCardOutstandingTotal)
                }
                tone="text-violet-600"
              />
              <StatCard
                label="Prestamos por pagar"
                value={
                  isLoadingObligationAccounts
                    ? 'Cargando...'
                    : formatCurrency(loanPayableOutstandingTotal)
                }
                tone="text-red-600"
              />
              <StatCard
                label="Prestamos por cobrar"
                value={
                  isLoadingObligationAccounts
                    ? 'Cargando...'
                    : formatCurrency(loanReceivableOutstandingTotal)
                }
                tone="text-emerald-600"
              />
              <StatCard
                label="Abonado este mes"
                value={
                  isLoadingObligationAccounts
                    ? 'Cargando...'
                    : formatCurrency(payablePaymentsThisMonthTotal)
                }
                tone="text-sky-600"
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">
                Cobrado este mes: {' '}
                <span className="font-semibold text-slate-800">
                  {isLoadingObligationAccounts
                    ? 'Cargando...'
                    : formatCurrency(receivableCollectionsThisMonthTotal)}
                </span>
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Proximos vencimientos
              </h4>

              {isLoadingObligationAccounts ? (
                <p className="mt-3 text-sm text-slate-500">
                  Cargando obligaciones...
                </p>
              ) : upcomingOpenObligations.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No tienes deudas ni prestamos abiertos.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {upcomingOpenObligations.slice(0, 4).map((item) => (
                    <div
                      key={item.obligation.id}
                      className="rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {item.obligation.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {item.account.name} · {getObligationAccountTypeLabel(item.account.type)}
                          </p>
                        </div>

                        <span className="font-semibold text-slate-800">
                          {formatCurrency(item.remainingAmount)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Vence el {item.obligation.dueDate.slice(0, 10)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">
              Proyeccion del proximo mes
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Compromisos y cobros esperados de tu siguiente mes calendario.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard
                label="Ingresos proyectados"
                value={
                  isLoadingPlannedMovements
                    ? 'Cargando...'
                    : formatCurrency(projectedIncomeTotal)
                }
                tone="text-green-600"
              />
              <StatCard
                label="Gastos proyectados"
                value={
                  isLoadingPlannedMovements
                    ? 'Cargando...'
                    : formatCurrency(projectedExpenseTotal)
                }
                tone="text-red-600"
              />
              <StatCard
                label="Saldo proyectado"
                value={
                  isLoadingPlannedMovements
                    ? 'Cargando...'
                    : formatCurrency(projectedBalanceTotal)
                }
                tone={
                  projectedBalanceTotal >= 0 ? 'text-slate-800' : 'text-red-600'
                }
              />
              <StatCard
                label="Items recurrentes"
                value={
                  isLoadingPlannedMovements
                    ? 'Cargando...'
                    : recurringItemsCount.toLocaleString('es-AR')
                }
                tone="text-sky-600"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Proximos compromisos
              </h4>

              {isLoadingPlannedMovements ? (
                <p className="mt-3 text-sm text-slate-500">
                  Cargando movimientos proyectados...
                </p>
              ) : pendingNextMonthItems.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No tienes compromisos pendientes para el proximo mes.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {pendingNextMonthItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-500">
                          {item.category} · {item.dueDate.slice(0, 10)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            item.type === 'expense'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {item.type === 'expense' ? 'Gasto' : 'Ingreso'}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentMethodTone(item.paymentMethod)}`}
                        >
                          {getPaymentMethodLabel(item.paymentMethod)}
                        </span>

                        <span className="font-semibold text-slate-800">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {pendingNextMonthItems.length > 5 && (
                    <p className="text-xs text-slate-500">
                      Hay {pendingNextMonthItems.length - 5} compromiso(s) mas en la
                      pantalla de Proyeccion.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
