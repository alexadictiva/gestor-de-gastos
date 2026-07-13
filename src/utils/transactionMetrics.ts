import type {
  PaymentMethod,
  ReimbursementStatus,
  Transaction,
  TransactionType,
} from '../types/transaction'

export function isExpenseTransaction(transaction: Transaction) {
  return transaction.type === 'expense'
}

export function isPersonalExpenseTransaction(transaction: Transaction) {
  return (
    transaction.type === 'expense' &&
    transaction.reimbursementStatus === 'not_applicable'
  )
}

export function isPendingReimbursableTransaction(transaction: Transaction) {
  return (
    transaction.type === 'expense' && transaction.reimbursementStatus === 'pending'
  )
}

export function isReimbursedTransaction(transaction: Transaction) {
  return (
    transaction.type === 'expense' &&
    transaction.reimbursementStatus === 'reimbursed'
  )
}

export function getTransactionTypeLabel(type: TransactionType) {
  switch (type) {
    case 'expense':
      return 'Gasto'
    case 'income':
      return 'Ingreso'
    default:
      return 'Inversion'
  }
}

export function getTransactionTypeTone(type: TransactionType) {
  switch (type) {
    case 'expense':
      return 'text-red-500'
    case 'income':
      return 'text-green-600'
    default:
      return 'text-violet-600'
  }
}

export function getPaymentMethodTone(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case 'cash':
      return 'bg-emerald-100 text-emerald-700'
    case 'bank':
      return 'bg-sky-100 text-sky-700'
    case 'credit':
      return 'bg-violet-100 text-violet-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function getReimbursementStatusTone(
  reimbursementStatus: ReimbursementStatus
) {
  switch (reimbursementStatus) {
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'reimbursed':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function buildTransactionMetrics(transactions: Transaction[]) {
  const incomeTotal = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const personalExpenseTotal = transactions
    .filter(isPersonalExpenseTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const reimbursablePendingTotal = transactions
    .filter(isPendingReimbursableTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const reimbursableRecoveredTotal = transactions
    .filter(isReimbursedTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const totalExpenseOutflow =
    personalExpenseTotal +
    reimbursablePendingTotal +
    reimbursableRecoveredTotal

  const investmentsTotal = transactions
    .filter((transaction) => transaction.type === 'investments')
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const personalBalanceTotal =
    incomeTotal - personalExpenseTotal - investmentsTotal

  return {
    incomeTotal,
    personalExpenseTotal,
    reimbursablePendingTotal,
    reimbursableRecoveredTotal,
    totalExpenseOutflow,
    investmentsTotal,
    personalBalanceTotal,
  }
}
