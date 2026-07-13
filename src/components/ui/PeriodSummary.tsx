import { useEffect, useMemo, useState } from 'react'
import type { Category } from '../../types/category'
import DonutChart, { type DonutChartSegment } from './DonutChart'
import {
  getPaymentMethodLabel,
  getReimbursementStatusLabel,
} from '../../types/transaction'
import type { Transaction } from '../../types/transaction'
import {
  buildTransactionMetrics,
  getPaymentMethodTone,
  getReimbursementStatusTone,
  getTransactionTypeLabel,
  getTransactionTypeTone,
  isExpenseTransaction,
  isPersonalExpenseTransaction,
} from '../../utils/transactionMetrics'

type SummaryPeriod = 'weekly' | 'monthly'

interface PeriodSummaryProps {
  title: string
  description: string
  period: SummaryPeriod
  transactions: Transaction[]
  categories: Category[]
  isLoadingTransactions: boolean
}

interface SummaryRange {
  start: Date
  end: Date
}

const EXPENSE_FALLBACK_COLORS = [
  '#0f766e',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
]

const PAYMENT_METHOD_COLORS = {
  cash: '#16a34a',
  bank: '#0284c7',
  credit: '#7c3aed',
  not_specified: '#94a3b8',
} as const

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function parseTransactionDate(value: string) {
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])

  return new Date(year, month, day)
}

function getCurrentRange(period: SummaryPeriod): SummaryRange {
  return getRangeForReferenceDate(period, new Date())
}

function getRangeForReferenceDate(
  period: SummaryPeriod,
  referenceDate: Date
): SummaryRange {
  const baseDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )

  if (period === 'weekly') {
    const currentDay = baseDate.getDay()
    const differenceToMonday = currentDay === 0 ? -6 : 1 - currentDay
    const start = new Date(baseDate)

    start.setDate(baseDate.getDate() + differenceToMonday)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)

    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const end = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  return { start, end }
}

function shiftReferenceDate(
  period: SummaryPeriod,
  referenceDate: Date,
  delta: number
) {
  const nextReferenceDate = new Date(referenceDate)

  if (period === 'weekly') {
    nextReferenceDate.setDate(nextReferenceDate.getDate() + delta * 7)
    return nextReferenceDate
  }

  return new Date(
    nextReferenceDate.getFullYear(),
    nextReferenceDate.getMonth() + delta,
    1
  )
}

function formatMonthInputValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

function isSameRange(rangeA: SummaryRange, rangeB: SummaryRange) {
  return rangeA.start.getTime() === rangeB.start.getTime()
}

function buildCategorySegments(
  transactions: Transaction[],
  categories: Category[]
): DonutChartSegment[] {
  const groupedExpenses = new Map<string, number>()

  transactions.filter(isPersonalExpenseTransaction).forEach((transaction) => {
    const currentAmount = groupedExpenses.get(transaction.category) ?? 0
    groupedExpenses.set(transaction.category, currentAmount + transaction.amount)
  })

  const categoryColorMap = new Map(
    categories
      .filter((category) => category.type === 'expense')
      .map((category) => [category.name.toLowerCase(), category.color])
  )

  const sortedEntries = [...groupedExpenses.entries()].sort(
    (entryA, entryB) => entryB[1] - entryA[1]
  )

  const leadingEntries = sortedEntries.slice(0, 5)
  const remainingAmount = sortedEntries
    .slice(5)
    .reduce((accumulator, [, amount]) => accumulator + amount, 0)

  const segments = leadingEntries.map(([categoryName, amount], index) => ({
    label: categoryName,
    value: amount,
    color:
      categoryColorMap.get(categoryName.toLowerCase()) ??
      EXPENSE_FALLBACK_COLORS[index % EXPENSE_FALLBACK_COLORS.length],
  }))

  if (remainingAmount > 0) {
    segments.push({
      label: 'Otros',
      value: remainingAmount,
      color: '#94a3b8',
    })
  }

  return segments
}

function buildPaymentMethodSegments(transactions: Transaction[]) {
  const groupedPayments = new Map<string, number>()

  transactions.filter(isExpenseTransaction).forEach((transaction) => {
    const currentAmount = groupedPayments.get(transaction.paymentMethod) ?? 0
    groupedPayments.set(
      transaction.paymentMethod,
      currentAmount + transaction.amount
    )
  })

  return [...groupedPayments.entries()]
    .sort((entryA, entryB) => entryB[1] - entryA[1])
    .map(([paymentMethod, amount]) => ({
      label: getPaymentMethodLabel(
        paymentMethod as Transaction['paymentMethod']
      ),
      value: amount,
      color:
        PAYMENT_METHOD_COLORS[
          paymentMethod as keyof typeof PAYMENT_METHOD_COLORS
        ] ?? PAYMENT_METHOD_COLORS.not_specified,
    }))
}

function getPeriodLabel(period: SummaryPeriod, range: SummaryRange) {
  if (period === 'weekly') {
    return `${formatDateLabel(range.start)} - ${formatDateLabel(range.end)}`
  }

  return range.start.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
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
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

export default function PeriodSummary({
  title,
  description,
  period,
  transactions,
  categories,
  isLoadingTransactions,
}: PeriodSummaryProps) {
  const currentRange = useMemo(() => getCurrentRange(period), [period])
  const [referenceDate, setReferenceDate] = useState(() => new Date())

  useEffect(() => {
    setReferenceDate(new Date())
  }, [period])

  const range = useMemo(
    () => getRangeForReferenceDate(period, referenceDate),
    [period, referenceDate]
  )
  const isCurrentRange = isSameRange(range, currentRange)
  const canGoToNextPeriod = !isCurrentRange
  const selectedMonthValue = formatMonthInputValue(range.start)
  const maxMonthValue = formatMonthInputValue(currentRange.start)

  const periodTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => {
          const parsedDate = parseTransactionDate(transaction.date)

          if (!parsedDate) {
            return false
          }

          return parsedDate >= range.start && parsedDate <= range.end
        })
        .sort((transactionA, transactionB) => {
          const dateA = parseTransactionDate(transactionA.date)?.getTime() ?? 0
          const dateB = parseTransactionDate(transactionB.date)?.getTime() ?? 0

          return dateB - dateA
        }),
    [range.end, range.start, transactions]
  )

  const {
    incomeTotal,
    personalExpenseTotal,
    reimbursablePendingTotal,
    reimbursableRecoveredTotal,
    totalExpenseOutflow,
    investmentsTotal,
    personalBalanceTotal,
  } = buildTransactionMetrics(periodTransactions)

  const expenseRatio =
    incomeTotal > 0 ? personalExpenseTotal / incomeTotal : null
  const expenseLimit = incomeTotal * 0.3
  const expenseAlertDifference = Math.max(expenseLimit - personalExpenseTotal, 0)

  const movementSegments = useMemo<DonutChartSegment[]>(
    () => [
      {
        label: 'Ingresos',
        value: incomeTotal,
        color: '#16a34a',
      },
      {
        label: 'Gastos personales',
        value: personalExpenseTotal,
        color: '#dc2626',
      },
      {
        label: 'Por cobrar',
        value: reimbursablePendingTotal,
        color: '#d97706',
      },
      {
        label: 'Reembolsables cobrados',
        value: reimbursableRecoveredTotal,
        color: '#059669',
      },
      {
        label: 'Inversiones',
        value: investmentsTotal,
        color: '#7c3aed',
      },
    ],
    [
      incomeTotal,
      personalExpenseTotal,
      reimbursablePendingTotal,
      reimbursableRecoveredTotal,
      investmentsTotal,
    ]
  )

  const categorySegments = useMemo(
    () => buildCategorySegments(periodTransactions, categories),
    [categories, periodTransactions]
  )

  const paymentMethodSegments = useMemo(
    () => buildPaymentMethodSegments(periodTransactions),
    [periodTransactions]
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="mt-2 text-slate-600">{description}</p>
          </div>

          <div className="flex flex-col items-start gap-3 xl:items-end">
            <div className="inline-flex w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Periodo seleccionado: {getPeriodLabel(period, range)}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {period === 'monthly' && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Mes</span>
                  <input
                    type="month"
                    value={selectedMonthValue}
                    max={maxMonthValue}
                    onChange={(event) => {
                      const [year, month] = event.target.value
                        .split('-')
                        .map(Number)

                      if (!year || !month) {
                        return
                      }

                      setReferenceDate(new Date(year, month - 1, 1))
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                  />
                </label>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setReferenceDate((prev) =>
                      shiftReferenceDate(period, prev, -1)
                    )
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {period === 'monthly' ? 'Mes anterior' : 'Semana anterior'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReferenceDate((prev) =>
                      shiftReferenceDate(period, prev, 1)
                    )
                  }
                  disabled={!canGoToNextPeriod}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {period === 'monthly' ? 'Mes siguiente' : 'Semana siguiente'}
                </button>

                {!isCurrentRange && (
                  <button
                    type="button"
                    onClick={() => setReferenceDate(new Date())}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Volver al actual
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoadingTransactions ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            Cargando resumen...
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Estamos preparando tus metricas del periodo.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Balance personal"
              value={formatCurrency(personalBalanceTotal)}
              tone="text-slate-800"
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
            <StatCard
              label="Salida total"
              value={formatCurrency(totalExpenseOutflow)}
              tone="text-sky-600"
            />
            <StatCard
              label="Movimientos"
              value={periodTransactions.length.toLocaleString('es-AR')}
              tone="text-slate-700"
            />
          </section>

          {expenseRatio !== null && expenseRatio < 0.3 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Alerta de gasto
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-900">
                Tus gastos personales estan por debajo del 30% de tus ingresos en este periodo.
              </p>
              <p className="mt-2 text-sm text-amber-800">
                Llevas {formatCurrency(personalExpenseTotal)} de gasto personal sobre{' '}
                {formatCurrency(incomeTotal)}, lo que representa{' '}
                {(expenseRatio * 100).toFixed(1)}% del ingreso. Todavia tienes un
                margen de {formatCurrency(expenseAlertDifference)} antes de llegar al
                30%.
              </p>
            </section>
          )}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <DonutChart
              title="Distribucion general"
              subtitle="Separa ingresos, gastos personales, reembolsables e inversiones del periodo seleccionado."
              segments={movementSegments}
              centerLabel="Total"
              centerValue={formatCurrency(
                incomeTotal +
                  personalExpenseTotal +
                  reimbursablePendingTotal +
                  reimbursableRecoveredTotal +
                  investmentsTotal
              )}
              emptyMessage="Todavia no hay movimientos en este periodo."
              formatValue={formatCurrency}
            />

            <DonutChart
              title="Gastos personales por categoria"
              subtitle="Muestra donde se concentran solo tus gastos personales."
              segments={categorySegments}
              centerLabel="Personales"
              centerValue={formatCurrency(personalExpenseTotal)}
              emptyMessage="No hay gastos personales registrados en este periodo."
              formatValue={formatCurrency}
            />

            <DonutChart
              title="Gastos por medio de pago"
              subtitle="Incluye gastos personales y reembolsables segun como los pagaste."
              segments={paymentMethodSegments}
              centerLabel="Salidas"
              centerValue={formatCurrency(totalExpenseOutflow)}
              emptyMessage="No hay gastos cargados para mostrar el medio de pago."
              formatValue={formatCurrency}
            />
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Movimientos del periodo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Detalle de todas las transacciones incluidas en el periodo seleccionado.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="py-3">Descripcion</th>
                    <th className="py-3">Categoria</th>
                    <th className="py-3">Tipo</th>
                    <th className="py-3">Monto</th>
                    <th className="py-3">Medio de pago</th>
                    <th className="py-3">Reembolso</th>
                    <th className="py-3">Fecha</th>
                  </tr>
                </thead>

                <tbody>
                  {periodTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="font-medium text-slate-600">
                            No hay transacciones en este periodo
                          </p>
                          <p className="text-sm text-slate-400">
                            Cuando registres movimientos, apareceran aqui automaticamente.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    periodTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-3 text-slate-800">
                          {transaction.description}
                        </td>
                        <td className="py-3 text-slate-600">
                          {transaction.category}
                        </td>
                        <td
                          className={`py-3 font-medium ${getTransactionTypeTone(transaction.type)}`}
                        >
                          {getTransactionTypeLabel(transaction.type)}
                        </td>
                        <td className="py-3 text-slate-800">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentMethodTone(transaction.paymentMethod)}`}
                          >
                            {getPaymentMethodLabel(transaction.paymentMethod)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getReimbursementStatusTone(transaction.reimbursementStatus)}`}
                          >
                            {getReimbursementStatusLabel(
                              transaction.reimbursementStatus
                            )}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">
                          {transaction.date.slice(0, 10)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
