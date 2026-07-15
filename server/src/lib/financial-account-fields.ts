export const ALLOWED_FINANCIAL_ACCOUNT_TYPES = [
  'bank',
  'cash',
  'virtual_wallet',
  'other',
] as const

export type FinancialAccountType =
  (typeof ALLOWED_FINANCIAL_ACCOUNT_TYPES)[number]

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function normalizeFinancialAccountType(
  rawValue: string
): FinancialAccountType | null {
  const normalizedValue = normalizeText(rawValue)

  if (
    ALLOWED_FINANCIAL_ACCOUNT_TYPES.includes(
      normalizedValue as FinancialAccountType
    )
  ) {
    return normalizedValue as FinancialAccountType
  }

  return null
}
