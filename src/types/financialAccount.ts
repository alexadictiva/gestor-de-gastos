export type FinancialAccountType =
  | 'bank'
  | 'cash'
  | 'virtual_wallet'
  | 'other'

export interface FinancialAccount {
  id: string
  name: string
  type: FinancialAccountType
  initialBalance: number
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateFinancialAccountPayload {
  name: string
  type: FinancialAccountType
  initialBalance?: number
  notes?: string | null
}

export interface UpdateFinancialAccountPayload {
  name: string
  type: FinancialAccountType
  initialBalance?: number
  notes?: string | null
}

export const FINANCIAL_ACCOUNT_TYPE_OPTIONS = [
  { value: 'bank', label: 'Cuenta bancaria' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'virtual_wallet', label: 'Billetera virtual' },
  { value: 'other', label: 'Otra' },
] as const

export function getFinancialAccountTypeLabel(type: FinancialAccountType) {
  switch (type) {
    case 'bank':
      return 'Cuenta bancaria'
    case 'cash':
      return 'Efectivo'
    case 'virtual_wallet':
      return 'Billetera virtual'
    default:
      return 'Otra'
  }
}
