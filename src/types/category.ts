export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string
  userId?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCategoryPayload {
  name: string
  type: CategoryType
  color: string
}