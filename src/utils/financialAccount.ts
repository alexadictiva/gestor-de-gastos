import type { FinancialAccount } from '../types/financialAccount'
import type { Transaction } from '../types/transaction'
import {
  isDebtPaymentTransaction,
} from './transactionMetrics'

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function compareText(leftValue: string, rightValue: string) {
  return leftValue.localeCompare(rightValue, 'es', {
    sensitivity: 'base',
  })
}

export function sortFinancialAccounts(items: FinancialAccount[]) {
  return [...items].sort((leftItem, rightItem) => {
    const byType = compareText(leftItem.type, rightItem.type)

    if (byType !== 0) {
      return byType
    }

    return compareText(leftItem.name, rightItem.name)
  })
}

export function transactionSupportsFinancialAccount(
  transaction: Pick<Transaction, 'type' | 'paymentMethod'>
) {
  if (transaction.type === 'income' || transaction.type === 'investments') {
    return true
  }

  return (
    transaction.type === 'expense' &&
    transaction.paymentMethod !== 'credit' &&
    transaction.paymentMethod !== 'loan'
  )
}

export function getTransactionFinancialAccountDelta(transaction: Transaction) {
  if (!transactionSupportsFinancialAccount(transaction)) {
    return 0
  }

  if (transaction.type === 'income') {
    return roundAmount(transaction.amount)
  }

  if (transaction.type === 'investments') {
    return roundAmount(-transaction.amount)
  }

  if (isDebtPaymentTransaction(transaction)) {
    return roundAmount(-transaction.amount)
  }

  if (transaction.reimbursementStatus === 'reimbursed') {
    return 0
  }

  return roundAmount(-transaction.amount)
}

export function buildFinancialAccountSummary(
  account: FinancialAccount,
  transactions: Transaction[]
) {
  const linkedTransactions = transactions.filter(
    (transaction) => transaction.financialAccountId === account.id
  )

  const netChange = roundAmount(
    linkedTransactions.reduce(
      (accumulator, transaction) =>
        accumulator + getTransactionFinancialAccountDelta(transaction),
      0
    )
  )
  const currentBalance = roundAmount(account.initialBalance + netChange)
  const inflowTotal = roundAmount(
    linkedTransactions.reduce((accumulator, transaction) => {
      const delta = getTransactionFinancialAccountDelta(transaction)

      return delta > 0 ? accumulator + delta : accumulator
    }, 0)
  )
  const outflowTotal = roundAmount(
    linkedTransactions.reduce((accumulator, transaction) => {
      const delta = getTransactionFinancialAccountDelta(transaction)

      return delta < 0 ? accumulator + Math.abs(delta) : accumulator
    }, 0)
  )

  return {
    ...account,
    linkedTransactions,
    linkedTransactionsCount: linkedTransactions.length,
    inflowTotal,
    outflowTotal,
    netChange,
    currentBalance,
  }
}

export function buildFinancialAccountsDashboardSummary(
  accounts: FinancialAccount[],
  transactions: Transaction[]
) {
  const accountSummaries = sortFinancialAccounts(accounts).map((account) =>
    buildFinancialAccountSummary(account, transactions)
  )
  const trackedLiquidityTotal = roundAmount(
    accountSummaries.reduce(
      (accumulator, account) => accumulator + account.currentBalance,
      0
    )
  )
  const unassignedTrackedTransactions = transactions.filter((transaction) => {
    const delta = getTransactionFinancialAccountDelta(transaction)

    return delta !== 0 && !transaction.financialAccountId
  })
  const unassignedTrackedNetTotal = roundAmount(
    unassignedTrackedTransactions.reduce(
      (accumulator, transaction) =>
        accumulator + getTransactionFinancialAccountDelta(transaction),
      0
    )
  )
  const negativeBalanceAccountsCount = accountSummaries.filter(
    (account) => account.currentBalance < 0
  ).length

  return {
    accountSummaries,
    trackedLiquidityTotal,
    unassignedTrackedTransactionsCount: unassignedTrackedTransactions.length,
    unassignedTrackedNetTotal,
    negativeBalanceAccountsCount,
  }
}
