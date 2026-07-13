export type TransactionType = 'income' | 'expense' | 'investments'
export type PaymentMethod =
  | 'not_specified'
  | 'cash'
  | 'bank'
  | 'credit'
  | 'loan'
export type ReimbursementStatus =
  | 'not_applicable'
  | 'pending'
  | 'reimbursed'

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Dinero en cuenta' },
  { value: 'credit', label: 'Tarjeta' },
  { value: 'loan', label: 'Prestamo' },
] as const

export const REIMBURSEMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente de cobro' },
  { value: 'reimbursed', label: 'Cobrado' },
] as const

export function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case 'cash':
      return 'Efectivo'
    case 'bank':
      return 'Dinero en cuenta'
    case 'credit':
      return 'Tarjeta'
    case 'loan':
      return 'Prestamo'
    default:
      return 'Sin definir'
  }
}

export function getReimbursementStatusLabel(
  reimbursementStatus: ReimbursementStatus
) {
  switch (reimbursementStatus) {
    case 'pending':
      return 'Pendiente de cobro'
    case 'reimbursed':
      return 'Cobrado'
    default:
      return 'No aplica'
  }
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  date: string
  linkedObligationAccountId?: string | null
  linkedObligationPaymentId?: string | null
  createdAt?: string
  updatedAt?: string
  userId?: string
}

export interface CreateTransactionPayload {
  description: string
  amount: number
  type: TransactionType
  category: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  date: string
  createLinkedObligationAccount?: boolean
  linkedObligationAccountName?: string | null
  linkedObligationInstallmentCount?: number | null
  linkedObligationFirstDueDate?: string | null
}

export interface UpdateTransactionPayload {
  description: string
  amount: number
  type: TransactionType
  category: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  date: string
}
