import type {
  Obligation,
  ObligationAccount,
  ObligationAccountType,
  ObligationPayment,
} from '../types/obligationAccount'

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function isSameMonth(date: Date, referenceDate: Date) {
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  )
}

export function formatReferenceMonth(referenceMonth?: string | null) {
  if (!referenceMonth) {
    return null
  }

  const [year, month] = referenceMonth.split('-').map(Number)

  if (!year || !month) {
    return referenceMonth
  }

  return new Date(year, month - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
}

export function buildObligationFinancials(obligation: Obligation) {
  const totalAmount = roundAmount(
    obligation.principalAmount + obligation.interestAmount
  )
  const paidAmount = roundAmount(
    obligation.payments.reduce(
      (accumulator, payment) => accumulator + payment.amount,
      0
    )
  )
  const remainingAmount = roundAmount(Math.max(totalAmount - paidAmount, 0))

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
  }
}

export function buildAccountFinancials(account: ObligationAccount) {
  const totals = account.obligations.map(buildObligationFinancials)

  const totalAmount = roundAmount(
    totals.reduce((accumulator, current) => accumulator + current.totalAmount, 0)
  )
  const paidAmount = roundAmount(
    totals.reduce((accumulator, current) => accumulator + current.paidAmount, 0)
  )
  const remainingAmount = roundAmount(
    totals.reduce(
      (accumulator, current) => accumulator + current.remainingAmount,
      0
    )
  )
  const openObligationsCount = account.obligations.filter(
    (obligation) => buildObligationFinancials(obligation).remainingAmount > 0.01
  ).length

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
    openObligationsCount,
  }
}

export function sortObligationAccounts(accounts: ObligationAccount[]) {
  return [...accounts].sort((accountA, accountB) => {
    const createdAtA = new Date(accountA.createdAt ?? '').getTime()
    const createdAtB = new Date(accountB.createdAt ?? '').getTime()

    if (Number.isFinite(createdAtA) && Number.isFinite(createdAtB)) {
      return createdAtB - createdAtA
    }

    return accountA.name.localeCompare(accountB.name, 'es')
  })
}

export function getUpcomingOpenObligations(accounts: ObligationAccount[]) {
  return accounts
    .flatMap((account) =>
      account.obligations
        .filter(
          (obligation) => buildObligationFinancials(obligation).remainingAmount > 0.01
        )
        .map((obligation) => ({
          account,
          obligation,
          remainingAmount: buildObligationFinancials(obligation).remainingAmount,
        }))
    )
    .sort(
      (itemA, itemB) =>
        new Date(itemA.obligation.dueDate).getTime() -
        new Date(itemB.obligation.dueDate).getTime()
    )
}

export function buildObligationDashboardSummary(
  accounts: ObligationAccount[],
  referenceDate = new Date()
) {
  const openObligations = getUpcomingOpenObligations(accounts)
  const allPayments = accounts.flatMap((account) =>
    account.obligations.flatMap((obligation) =>
      obligation.payments.map((payment) => ({
        accountType: account.type,
        payment,
      }))
    )
  )

  const creditCardOutstandingTotal = roundAmount(
    openObligations
      .filter((item) => item.account.type === 'credit_card')
      .reduce((accumulator, item) => accumulator + item.remainingAmount, 0)
  )

  const loanPayableOutstandingTotal = roundAmount(
    openObligations
      .filter((item) => item.account.type === 'loan_payable')
      .reduce((accumulator, item) => accumulator + item.remainingAmount, 0)
  )

  const loanReceivableOutstandingTotal = roundAmount(
    openObligations
      .filter((item) => item.account.type === 'loan_receivable')
      .reduce((accumulator, item) => accumulator + item.remainingAmount, 0)
  )

  const payablePaymentsThisMonthTotal = roundAmount(
    allPayments
      .filter(
        ({ accountType, payment }) =>
          accountType !== 'loan_receivable' &&
          isSameMonth(new Date(payment.paymentDate), referenceDate)
      )
      .reduce(
        (accumulator, current) => accumulator + current.payment.amount,
        0
      )
  )

  const receivableCollectionsThisMonthTotal = roundAmount(
    allPayments
      .filter(
        ({ accountType, payment }) =>
          accountType === 'loan_receivable' &&
          isSameMonth(new Date(payment.paymentDate), referenceDate)
      )
      .reduce(
        (accumulator, current) => accumulator + current.payment.amount,
        0
      )
  )

  return {
    creditCardOutstandingTotal,
    loanPayableOutstandingTotal,
    loanReceivableOutstandingTotal,
    payablePaymentsThisMonthTotal,
    receivableCollectionsThisMonthTotal,
    openObligationsCount: openObligations.length,
    upcomingOpenObligations: openObligations,
  }
}

export function getObligationAccountTone(type: ObligationAccountType) {
  switch (type) {
    case 'credit_card':
      return 'bg-violet-100 text-violet-700'
    case 'loan_payable':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-emerald-100 text-emerald-700'
  }
}

export function getObligationStatusTone(
  obligation: Obligation,
  accountType: ObligationAccountType
) {
  const { remainingAmount } = buildObligationFinancials(obligation)

  if (remainingAmount <= 0.01) {
    return accountType === 'loan_receivable'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-700'
  }

  return accountType === 'loan_receivable'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
}

export function findObligationByPaymentId(
  accounts: ObligationAccount[],
  paymentId: string
) {
  for (const account of accounts) {
    for (const obligation of account.obligations) {
      const payment = obligation.payments.find(
        (currentPayment) => currentPayment.id === paymentId
      )

      if (payment) {
        return {
          account,
          obligation,
          payment,
        }
      }
    }
  }

  return null
}

export function buildPaymentActivityLabel(
  accountType: ObligationAccountType,
  payment: ObligationPayment
) {
  const dateLabel = payment.paymentDate.slice(0, 10)

  return accountType === 'loan_receivable'
    ? `Cobro parcial del ${dateLabel}`
    : `Abono registrado el ${dateLabel}`
}
