import type { Category, CreateCategoryPayload } from '../types/category'

const API_URL = 'http://localhost:4000/api'

interface CategoriesResponse {
  ok: boolean
  categories: Category[]
}

interface CreateCategoryResponse {
  ok: boolean
  message: string
  category: Category
}

interface DeleteCategoryResponse {
  ok: boolean
  message: string
}

export async function getCategoriesRequest(token: string): Promise<Category[]> {
  const response = await fetch(`${API_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: CategoriesResponse = await response.json()

  if (!response.ok) {
    throw new Error('Error al obtener categorías')
  }

  return data.categories
}

export async function createCategoryRequest(
  token: string,
  payload: CreateCategoryPayload
): Promise<Category> {
  const response = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data: CreateCategoryResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear categoría')
  }

  return data.category
}

export async function deleteCategoryRequest(
  token: string,
  categoryId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data: DeleteCategoryResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar categoría')
  }
}