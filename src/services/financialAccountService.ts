import type {
  CreateFinancialAccountPayload,
  FinancialAccount,
  UpdateFinancialAccountPayload,
} from '../types/financialAccount'

const API_URL = 'http://localhost:4000/api'

interface FinancialAccountsResponse {
  ok: boolean
  accounts: FinancialAccount[]
}

interface FinancialAccountResponse {
  ok: boolean
  message: string
  account: FinancialAccount
}

interface DeleteFinancialAccountResponse {
  ok: boolean
  message: string
  deletedAccountId: string
}

export async function getFinancialAccountsRequest(
  token: string
): Promise<FinancialAccount[]> {
  const response = await fetch(`${API_URL}/financial-accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: FinancialAccountsResponse = await response.json()

  if (!response.ok) {
    throw new Error('Error al obtener cuentas')
  }

  return data.accounts
}

export async function createFinancialAccountRequest(
  token: string,
  payload: CreateFinancialAccountPayload
): Promise<FinancialAccount> {
  const response = await fetch(`${API_URL}/financial-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: FinancialAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear la cuenta')
  }

  return data.account
}

export async function updateFinancialAccountRequest(
  token: string,
  accountId: string,
  payload: UpdateFinancialAccountPayload
): Promise<FinancialAccount> {
  const response = await fetch(`${API_URL}/financial-accounts/${accountId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: FinancialAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar la cuenta')
  }

  return data.account
}

export async function deleteFinancialAccountRequest(
  token: string,
  accountId: string
): Promise<string> {
  const response = await fetch(`${API_URL}/financial-accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: DeleteFinancialAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar la cuenta')
  }

  return data.deletedAccountId
}
