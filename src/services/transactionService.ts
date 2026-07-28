import type {
  CreateTransactionPayload,
  Transaction,
  UpdateTransactionPayload,
} from '../types/transaction'
import type { ObligationAccount } from '../types/obligationAccount'
import { API_URL } from '../config/api'

interface TransactionsResponse {
  ok: boolean
  transactions: Transaction[]
}

interface CreateTransactionResponse {
  ok: boolean
  message: string
  transaction: Transaction
  linkedObligationAccount?: ObligationAccount | null
}

interface CreateTransactionResult {
  transaction: Transaction
  linkedObligationAccount?: ObligationAccount | null
}

interface UpdateTransactionResponse {
  ok: boolean
  message: string
  transaction: Transaction
}

interface DeleteTransactionResponse {
  ok: boolean
  message: string
  deletedLinkedObligationAccountId?: string | null
  updatedObligationAccount?: ObligationAccount | null
}

export async function updateTransactionRequest(
  token: string,
  transactionId: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: UpdateTransactionResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar transaccion')
  }

  return data.transaction
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
): Promise<CreateTransactionResult> {
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
    throw new Error(data.message || 'Error al crear transaccion')
  }

  return {
    transaction: data.transaction,
    linkedObligationAccount: data.linkedObligationAccount ?? null,
  }
}

export async function deleteTransactionRequest(
  token: string,
  transactionId: string
): Promise<{
  deletedLinkedObligationAccountId?: string | null
  updatedObligationAccount?: ObligationAccount | null
}> {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: DeleteTransactionResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar transaccion')
  }

  return {
    deletedLinkedObligationAccountId:
      data.deletedLinkedObligationAccountId ?? null,
    updatedObligationAccount: data.updatedObligationAccount ?? null,
  }
}
