import type { PaymentMethod, Transaction } from './transaction'

export type ObligationAccountType =
  | 'credit_card'
  | 'loan_payable'
  | 'loan_receivable'

export type ObligationStatus = 'open' | 'settled'

export interface ObligationPayment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  linkedTransactions?: Transaction[]
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Obligation {
  id: string
  title: string
  referenceMonth?: string | null
  principalAmount: number
  interestAmount: number
  minimumPayment?: number | null
  dueDate: string
  status: ObligationStatus
  notes?: string | null
  payments: ObligationPayment[]
  createdAt?: string
  updatedAt?: string
}

export interface ObligationAccount {
  id: string
  name: string
  type: ObligationAccountType
  creditLimit?: number | null
  closingDay?: number | null
  dueDay?: number | null
  loanTotalAmount?: number | null
  installmentCount?: number | null
  loanFirstDueDate?: string | null
  notes?: string | null
  obligations: Obligation[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateObligationAccountPayload {
  name: string
  type: ObligationAccountType
  creditLimit?: number | null
  closingDay?: number | null
  dueDay?: number | null
  loanTotalAmount?: number | null
  installmentCount?: number | null
  loanFirstDueDate?: string | null
  notes?: string | null
}

export interface UpdateObligationAccountPayload {
  name: string
  type: ObligationAccountType
  creditLimit?: number | null
  closingDay?: number | null
  dueDay?: number | null
  loanTotalAmount?: number | null
  installmentCount?: number | null
  loanFirstDueDate?: string | null
  notes?: string | null
}

export interface UpdateObligationPayload {
  title: string
  referenceMonth?: string | null
  principalAmount: number
  interestAmount?: number
  minimumPayment?: number | null
  dueDate: string
  notes?: string | null
}

export interface CreateObligationPayload {
  title: string
  referenceMonth?: string | null
  principalAmount: number
  interestAmount?: number
  minimumPayment?: number | null
  dueDate: string
  notes?: string | null
}

export interface CreateObligationPaymentPayload {
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  notes?: string | null
}

export const OBLIGATION_ACCOUNT_TYPE_OPTIONS = [
  { value: 'credit_card', label: 'Tarjeta de credito' },
  { value: 'loan_payable', label: 'Prestamo por pagar' },
  { value: 'loan_receivable', label: 'Prestamo por cobrar' },
] as const

export function getObligationAccountTypeLabel(type: ObligationAccountType) {
  switch (type) {
    case 'credit_card':
      return 'Tarjeta de credito'
    case 'loan_payable':
      return 'Prestamo por pagar'
    default:
      return 'Prestamo por cobrar'
  }
}

export function getObligationStatusLabel(
  status: ObligationStatus,
  accountType: ObligationAccountType
) {
  if (status === 'settled') {
    return accountType === 'loan_receivable' ? 'Cobrado' : 'Saldado'
  }

  return accountType === 'loan_receivable' ? 'Pendiente de cobro' : 'Pendiente'
}
