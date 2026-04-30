import type {
  CreateTransactionPayload,
  Transaction,
} from '../types/transaction'

const API_URL = 'http://localhost:4000/api'

interface TransactionsResponse {
  ok: boolean
  transactions: Transaction[]
}

interface CreateTransactionResponse {
  ok: boolean
  message: string
  transaction: Transaction
}

interface DeleteTransactionResponse {
  ok: boolean
  message: string
}

export async function getTransactionsRequest(
  token: string
): Promise<Transaction[]> {
  const response = await fetch(`${API_URL}/transactions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: TransactionsResponse = await response.json()

  if (!response.ok) {
    throw new Error('Error al obtener transacciones')
  }

  return data.transactions
}

export async function createTransactionRequest(
  token: string,
  payload: CreateTransactionPayload
): Promise<Transaction> {
  const response = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: CreateTransactionResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear transacción')
  }

  return data.transaction
}

export async function deleteTransactionRequest(
  token: string,
  transactionId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: DeleteTransactionResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar transacción')
  }
}