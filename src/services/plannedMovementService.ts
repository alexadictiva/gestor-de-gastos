import type {
  CreatePlannedMovementPayload,
  PlannedMovement,
  PlannedMovementStatus,
  UpdatePlannedMovementPayload,
} from '../types/plannedMovement'
import type { Transaction } from '../types/transaction'

const API_URL = 'http://localhost:4000/api'

interface PlannedMovementsResponse {
  ok: boolean
  plannedMovements: PlannedMovement[]
}

interface PlannedMovementResponse {
  ok: boolean
  message: string
  plannedMovement: PlannedMovement
}

interface DeletePlannedMovementResponse {
  ok: boolean
  message: string
}

interface DuplicateRecurringResponse {
  ok: boolean
  message: string
  createdCount: number
  skippedCount: number
  plannedMovements: PlannedMovement[]
}

interface ConvertPlannedMovementResponse {
  ok: boolean
  message: string
  plannedMovement: PlannedMovement
  transaction: Transaction
}

interface RevertPlannedMovementConversionResponse {
  ok: boolean
  message: string
  plannedMovement: PlannedMovement
  deletedTransactionId?: string | null
}

export async function getPlannedMovementsRequest(
  token: string
): Promise<PlannedMovement[]> {
  const response = await fetch(`${API_URL}/planned-movements`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: PlannedMovementsResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.ok ? 'Error al obtener proyecciones' : 'Error al obtener proyecciones')
  }

  return data.plannedMovements
}

export async function createPlannedMovementRequest(
  token: string,
  payload: CreatePlannedMovementPayload
): Promise<PlannedMovement> {
  const response = await fetch(`${API_URL}/planned-movements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: PlannedMovementResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear movimiento proyectado')
  }

  return data.plannedMovement
}

export async function updatePlannedMovementRequest(
  token: string,
  plannedMovementId: string,
  payload: UpdatePlannedMovementPayload
): Promise<PlannedMovement> {
  const response = await fetch(`${API_URL}/planned-movements/${plannedMovementId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: PlannedMovementResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar movimiento proyectado')
  }

  return data.plannedMovement
}

export async function updatePlannedMovementStatusRequest(
  token: string,
  plannedMovementId: string,
  status: PlannedMovementStatus
): Promise<PlannedMovement> {
  const response = await fetch(
    `${API_URL}/planned-movements/${plannedMovementId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
      }),
    }
  )

  const data: PlannedMovementResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar estado del movimiento')
  }

  return data.plannedMovement
}

export async function convertPlannedMovementToTransactionRequest(
  token: string,
  plannedMovementId: string
): Promise<{
  plannedMovement: PlannedMovement
  transaction: Transaction
}> {
  const response = await fetch(
    `${API_URL}/planned-movements/${plannedMovementId}/convert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data: ConvertPlannedMovementResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al convertir movimiento proyectado')
  }

  return {
    plannedMovement: data.plannedMovement,
    transaction: data.transaction,
  }
}

export async function revertPlannedMovementConversionRequest(
  token: string,
  plannedMovementId: string
): Promise<{
  plannedMovement: PlannedMovement
  deletedTransactionId?: string | null
}> {
  const response = await fetch(
    `${API_URL}/planned-movements/${plannedMovementId}/revert-conversion`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data: RevertPlannedMovementConversionResponse = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Error al deshacer el paso a real del movimiento proyectado'
    )
  }

  return {
    plannedMovement: data.plannedMovement,
    deletedTransactionId: data.deletedTransactionId ?? null,
  }
}

export async function deletePlannedMovementRequest(
  token: string,
  plannedMovementId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/planned-movements/${plannedMovementId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: DeletePlannedMovementResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar movimiento proyectado')
  }
}

export async function duplicateRecurringPlannedMovementsRequest(
  token: string,
  targetMonth: string
): Promise<DuplicateRecurringResponse> {
  const response = await fetch(`${API_URL}/planned-movements/duplicate-recurring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetMonth,
    }),
  })

  const data: DuplicateRecurringResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al duplicar recurrentes')
  }

  return data
}
