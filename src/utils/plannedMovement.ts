import type { PlannedMovement } from '../types/plannedMovement'

export function parseMonthKey(monthKey: string) {
  const match = monthKey.trim().match(/^(\d{4})-(\d{2})$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (!year || !month || month < 1 || month > 12) {
    return null
  }

  return {
    year,
    month,
  }
}

export function buildMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function getNextMonthKey(referenceDate = new Date()) {
  const nextMonthDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1
  )

  return buildMonthKey(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth() + 1
  )
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const parsedMonth = parseMonthKey(monthKey)

  if (!parsedMonth) {
    return monthKey
  }

  const shiftedDate = new Date(parsedMonth.year, parsedMonth.month - 1 + delta, 1)

  return buildMonthKey(shiftedDate.getFullYear(), shiftedDate.getMonth() + 1)
}

export function formatMonthLabel(monthKey: string) {
  const parsedMonth = parseMonthKey(monthKey)

  if (!parsedMonth) {
    return monthKey
  }

  return new Date(parsedMonth.year, parsedMonth.month - 1, 1).toLocaleDateString(
    'es-AR',
    {
      month: 'long',
      year: 'numeric',
    }
  )
}

export function getMonthRange(monthKey: string) {
  const parsedMonth = parseMonthKey(monthKey)

  if (!parsedMonth) {
    return null
  }

  const start = new Date(parsedMonth.year, parsedMonth.month - 1, 1)
  const end = new Date(parsedMonth.year, parsedMonth.month, 0, 23, 59, 59, 999)

  return {
    start,
    end,
  }
}

export function filterPlannedMovementsByMonth(
  plannedMovements: PlannedMovement[],
  monthKey: string
) {
  const range = getMonthRange(monthKey)

  if (!range) {
    return []
  }

  return plannedMovements
    .filter((plannedMovement) => {
      const dueDate = new Date(plannedMovement.dueDate)

      return dueDate >= range.start && dueDate <= range.end
    })
    .sort(
      (plannedMovementA, plannedMovementB) =>
        new Date(plannedMovementA.dueDate).getTime() -
        new Date(plannedMovementB.dueDate).getTime()
    )
}

export function getPendingPlannedMovements(
  plannedMovements: PlannedMovement[]
) {
  return plannedMovements.filter(
    (plannedMovement) => plannedMovement.status === 'pending'
  )
}

export function buildPlannedMovementMetrics(plannedMovements: PlannedMovement[]) {
  const pendingPlannedMovements = getPendingPlannedMovements(plannedMovements)

  const projectedIncomeTotal = pendingPlannedMovements
    .filter((plannedMovement) => plannedMovement.type === 'income')
    .reduce(
      (accumulator, plannedMovement) => accumulator + plannedMovement.amount,
      0
    )

  const projectedExpenseTotal = pendingPlannedMovements
    .filter((plannedMovement) => plannedMovement.type === 'expense')
    .reduce(
      (accumulator, plannedMovement) => accumulator + plannedMovement.amount,
      0
    )

  const recurringItemsCount = pendingPlannedMovements.filter(
    (plannedMovement) => plannedMovement.isRecurring
  ).length

  return {
    projectedIncomeTotal,
    projectedExpenseTotal,
    projectedBalanceTotal: projectedIncomeTotal - projectedExpenseTotal,
    recurringItemsCount,
  }
}
