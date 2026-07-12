export type TransactionType = 'income' | 'expense' | 'investments'

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  date: string
  createdAt?: string
  updatedAt?: string
  userId?: string
}

export interface CreateTransactionPayload {
  description: string
  amount: number
  type: TransactionType
  category: string
  date: string
}

export interface UpdateTransactionPayload {
  description: string
  amount: number
  type: TransactionType
  category: string
  date: string
}
