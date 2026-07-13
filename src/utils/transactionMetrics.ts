import type {
  PaymentMethod,
  ReimbursementStatus,
  Transaction,
  TransactionType,
} from '../types/transaction'

export function isExpenseTransaction(transaction: Transaction) {
  return transaction.type === 'expense' && !isDebtPaymentTransaction(transaction)
}

export function isDebtSettlementTransaction(transaction: Transaction) {
  return Boolean(transaction.linkedObligationPaymentId)
}

export function isDebtPaymentTransaction(transaction: Transaction) {
  return (
    isDebtSettlementTransaction(transaction) && transaction.type === 'expense'
  )
}

export function isDebtCollectionTransaction(transaction: Transaction) {
  return (
    isDebtSettlementTransaction(transaction) && transaction.type === 'income'
  )
}

export function isOperationalIncomeTransaction(transaction: Transaction) {
  return transaction.type === 'income' && !isDebtCollectionTransaction(transaction)
}

export function isOperationalExpenseTransaction(transaction: Transaction) {
  return transaction.type === 'expense' && !isDebtPaymentTransaction(transaction)
}

export function isDeferredExpenseTransaction(transaction: Transaction) {
  return (
    isOperationalExpenseTransaction(transaction) &&
    (transaction.paymentMethod === 'credit' || transaction.paymentMethod === 'loan')
  )
}

export function isImmediateExpenseTransaction(transaction: Transaction) {
  return (
    isOperationalExpenseTransaction(transaction) &&
    !isDeferredExpenseTransaction(transaction)
  )
}

export function isPersonalExpenseTransaction(transaction: Transaction) {
  return (
    isOperationalExpenseTransaction(transaction) &&
    transaction.reimbursementStatus === 'not_applicable'
  )
}

export function isImmediatePersonalExpenseTransaction(transaction: Transaction) {
  return (
    isImmediateExpenseTransaction(transaction) &&
    transaction.reimbursementStatus === 'not_applicable'
  )
}

export function isFinancedPersonalExpenseTransaction(transaction: Transaction) {
  return (
    isDeferredExpenseTransaction(transaction) &&
    transaction.reimbursementStatus === 'not_applicable'
  )
}

export function isPendingReimbursableTransaction(transaction: Transaction) {
  return (
    isOperationalExpenseTransaction(transaction) &&
    transaction.reimbursementStatus === 'pending'
  )
}

export function isImmediatePendingReimbursableTransaction(
  transaction: Transaction
) {
  return (
    isImmediateExpenseTransaction(transaction) &&
    transaction.reimbursementStatus === 'pending'
  )
}

export function isReimbursedTransaction(transaction: Transaction) {
  return (
    isOperationalExpenseTransaction(transaction) &&
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

export function getTransactionDisplayLabel(transaction: Transaction) {
  if (isDebtPaymentTransaction(transaction)) {
    return 'Pago de deuda'
  }

  if (isDebtCollectionTransaction(transaction)) {
    return 'Cobro de deuda'
  }

  return getTransactionTypeLabel(transaction.type)
}

export function getTransactionDisplayTone(transaction: Transaction) {
  if (isDebtPaymentTransaction(transaction)) {
    return 'text-sky-600'
  }

  if (isDebtCollectionTransaction(transaction)) {
    return 'text-emerald-600'
  }

  return getTransactionTypeTone(transaction.type)
}

export function getTransactionAmountTone(transaction: Transaction) {
  if (isDebtPaymentTransaction(transaction)) {
    return 'text-red-600'
  }

  if (isDebtCollectionTransaction(transaction)) {
    return 'text-green-600'
  }

  switch (transaction.type) {
    case 'expense':
      return 'text-red-600'
    case 'income':
      return 'text-green-600'
    default:
      return 'text-violet-600'
  }
}

export function getSignedTransactionAmountLabel(transaction: Transaction) {
  const sign = transaction.type === 'income' ? '+' : '-'

  return `${sign}$${transaction.amount.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

export function getPaymentMethodTone(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case 'cash':
      return 'bg-emerald-100 text-emerald-700'
    case 'bank':
      return 'bg-sky-100 text-sky-700'
    case 'credit':
      return 'bg-violet-100 text-violet-700'
    case 'loan':
      return 'bg-amber-100 text-amber-700'
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
    .filter(isOperationalIncomeTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const debtCollectionTotal = transactions
    .filter(isDebtCollectionTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const personalExpenseTotal = transactions
    .filter(isPersonalExpenseTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const immediatePersonalExpenseTotal = transactions
    .filter(isImmediatePersonalExpenseTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const financedPersonalExpenseTotal = transactions
    .filter(isFinancedPersonalExpenseTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const reimbursablePendingTotal = transactions
    .filter(isPendingReimbursableTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const immediateReimbursablePendingTotal = transactions
    .filter(isImmediatePendingReimbursableTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const reimbursableRecoveredTotal = transactions
    .filter(isReimbursedTransaction)
    .reduce((accumulator, transaction) => accumulator + transaction.amount, 0)

  const debtPaymentTotal = transactions
    .filter(isDebtPaymentTransaction)
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

  const availableLiquidityTotal =
    incomeTotal +
    debtCollectionTotal +
    reimbursableRecoveredTotal -
    immediatePersonalExpenseTotal -
    immediateReimbursablePendingTotal -
    debtPaymentTotal -
    investmentsTotal

  return {
    incomeTotal,
    debtCollectionTotal,
    personalExpenseTotal,
    immediatePersonalExpenseTotal,
    financedPersonalExpenseTotal,
    reimbursablePendingTotal,
    immediateReimbursablePendingTotal,
    reimbursableRecoveredTotal,
    debtPaymentTotal,
    totalExpenseOutflow,
    investmentsTotal,
    personalBalanceTotal,
    availableLiquidityTotal,
  }
}
