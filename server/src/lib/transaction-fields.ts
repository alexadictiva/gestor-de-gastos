export const ALLOWED_TRANSACTION_TYPES = [
  'income',
  'expense',
  'investments',
] as const

export const ALLOWED_PAYMENT_METHODS = [
  'not_specified',
  'cash',
  'bank',
  'credit',
] as const

export const ALLOWED_REIMBURSEMENT_STATUSES = [
  'not_applicable',
  'pending',
  'reimbursed',
] as const

export type TransactionType = (typeof ALLOWED_TRANSACTION_TYPES)[number]
export type PaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number]
export type ReimbursementStatus =
  (typeof ALLOWED_REIMBURSEMENT_STATUSES)[number]

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function normalizeTransactionType(
  rawValue: string
): TransactionType | null {
  const normalizedValue = normalizeText(rawValue)

  if (
    ALLOWED_TRANSACTION_TYPES.includes(
      normalizedValue as TransactionType
    )
  ) {
    return normalizedValue as TransactionType
  }

  return null
}

export function normalizePaymentMethod(
  rawValue: string
): PaymentMethod | null {
  const normalizedValue = normalizeText(rawValue)

  if (!normalizedValue) {
    return null
  }

  if (
    normalizedValue === 'not_specified' ||
    normalizedValue === 'no' ||
    normalizedValue === 'ninguno' ||
    normalizedValue === 'sin_definir'
  ) {
    return 'not_specified'
  }

  if (normalizedValue === 'cash' || normalizedValue === 'efectivo') {
    return 'cash'
  }

  if (
    normalizedValue === 'bank' ||
    normalizedValue === 'cuenta' ||
    normalizedValue === 'banco' ||
    normalizedValue === 'transferencia'
  ) {
    return 'bank'
  }

  if (
    normalizedValue === 'credit' ||
    normalizedValue === 'credito' ||
    normalizedValue === 'tarjeta' ||
    normalizedValue === 'tarjeta_credito'
  ) {
    return 'credit'
  }

  return null
}

export function normalizeReimbursementStatus(
  rawValue: string
): ReimbursementStatus | null {
  const normalizedValue = normalizeText(rawValue)

  if (!normalizedValue) {
    return null
  }

  if (
    normalizedValue === 'not_applicable' ||
    normalizedValue === 'no' ||
    normalizedValue === 'normal' ||
    normalizedValue === 'ninguno'
  ) {
    return 'not_applicable'
  }

  if (
    normalizedValue === 'pending' ||
    normalizedValue === 'pendiente' ||
    normalizedValue === 'si' ||
    normalizedValue === 'reembolsable'
  ) {
    return 'pending'
  }

  if (
    normalizedValue === 'reimbursed' ||
    normalizedValue === 'reembolsado' ||
    normalizedValue === 'cobrado'
  ) {
    return 'reimbursed'
  }

  return null
}
