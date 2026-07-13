import type { PaymentMethod } from './transaction'

export type PlannedMovementType = 'income' | 'expense'
export type PlannedMovementStatus = 'pending' | 'completed'

export interface PlannedMovement {
  id: string
  title: string
  amount: number
  type: PlannedMovementType
  category: string
  paymentMethod: PaymentMethod
  dueDate: string
  isRecurring: boolean
  status: PlannedMovementStatus
  completedAt?: string | null
  linkedTransactionId?: string | null
  userId?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreatePlannedMovementPayload {
  title: string
  amount: number
  type: PlannedMovementType
  category: string
  paymentMethod: PaymentMethod
  dueDate: string
  isRecurring: boolean
}

export interface UpdatePlannedMovementPayload {
  title: string
  amount: number
  type: PlannedMovementType
  category: string
  paymentMethod: PaymentMethod
  dueDate: string
  isRecurring: boolean
}

export function getPlannedMovementStatusLabel(
  status: PlannedMovementStatus,
  type: PlannedMovementType
) {
  if (status === 'pending') {
    return 'Pendiente'
  }

  return type === 'expense' ? 'Pagado' : 'Cobrado'
}
