import type {
  CreateObligationAccountPayload,
  CreateObligationPayload,
  CreateObligationPaymentPayload,
  ObligationAccount,
  UpdateObligationPayload,
  UpdateObligationAccountPayload,
} from '../types/obligationAccount'

const API_URL = 'http://localhost:4000/api'

interface ObligationAccountsResponse {
  ok: boolean
  accounts: ObligationAccount[]
}

interface ObligationAccountResponse {
  ok: boolean
  message: string
  account: ObligationAccount
}

interface DeleteAccountResponse {
  ok: boolean
  message: string
  deletedAccountId: string
}

export async function getObligationAccountsRequest(
  token: string
): Promise<ObligationAccount[]> {
  const response = await fetch(`${API_URL}/obligation-accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: ObligationAccountsResponse = await response.json()

  if (!response.ok) {
    throw new Error('Error al obtener tarjetas y prestamos')
  }

  return data.accounts
}

export async function createObligationAccountRequest(
  token: string,
  payload: CreateObligationAccountPayload
): Promise<ObligationAccount> {
  const response = await fetch(`${API_URL}/obligation-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear la cuenta')
  }

  return data.account
}

export async function updateObligationAccountRequest(
  token: string,
  accountId: string,
  payload: UpdateObligationAccountPayload
): Promise<ObligationAccount> {
  const response = await fetch(`${API_URL}/obligation-accounts/${accountId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar la cuenta')
  }

  return data.account
}

export async function deleteObligationAccountRequest(
  token: string,
  accountId: string
): Promise<string> {
  const response = await fetch(`${API_URL}/obligation-accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: DeleteAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar la cuenta')
  }

  return data.deletedAccountId
}

export async function createObligationRequest(
  token: string,
  accountId: string,
  payload: CreateObligationPayload
): Promise<ObligationAccount> {
  const response = await fetch(
    `${API_URL}/obligation-accounts/${accountId}/obligations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear la obligacion')
  }

  return data.account
}

export async function updateObligationRequest(
  token: string,
  obligationId: string,
  payload: UpdateObligationPayload
): Promise<ObligationAccount> {
  const response = await fetch(
    `${API_URL}/obligation-accounts/obligations/${obligationId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar la obligacion')
  }

  return data.account
}

export async function deleteObligationRequest(
  token: string,
  obligationId: string
): Promise<ObligationAccount> {
  const response = await fetch(
    `${API_URL}/obligation-accounts/obligations/${obligationId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar la obligacion')
  }

  return data.account
}

export async function createObligationPaymentRequest(
  token: string,
  obligationId: string,
  payload: CreateObligationPaymentPayload
): Promise<ObligationAccount> {
  const response = await fetch(
    `${API_URL}/obligation-accounts/obligations/${obligationId}/payments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al registrar el abono')
  }

  return data.account
}

export async function deleteObligationPaymentRequest(
  token: string,
  paymentId: string
): Promise<ObligationAccount> {
  const response = await fetch(
    `${API_URL}/obligation-accounts/payments/${paymentId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data: ObligationAccountResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar el abono')
  }

  return data.account
}
