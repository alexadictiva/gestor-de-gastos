import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import { DeleteButtonIcon, EditButtonIcon } from '../assets/icons'
import { useAuth } from '../hooks/useAuth'
import type { Category, CategoryType } from '../types/category'
import type { Transaction } from '../types/transaction'
import {
  createCategoryRequest,
  deleteCategoryRequest,
  updateCategoryRequest,
} from '../services/categoryService'

interface CategoriasPageProps {
  categories: Category[]
  setCategories: Dispatch<SetStateAction<Category[]>>
  isLoadingCategories: boolean
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}

interface CategoryForm {
  name: string
  type: CategoryType
  color: string
}

const initialForm: CategoryForm = {
  name: '',
  type: 'expense',
  color: '#64748b',
}

export default function CategoriasPage({
  categories,
  setCategories,
  isLoadingCategories,
  setTransactions,
}: CategoriasPageProps) {
  const { token } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CategoryForm>(initialForm)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name))

  const resetFormState = () => {
    setForm(initialForm)
    setCategoryToEdit(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    setErrorMessage('')
    setForm(initialForm)
    setCategoryToEdit(null)
    setShowForm(true)
  }

  const openEditForm = (category: Category) => {
    setErrorMessage('')
    setCategoryToEdit(category)
    setForm({
      name: category.name,
      type: category.type,
      color: category.color,
    })
    setShowForm(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!token) {
      setErrorMessage('No hay sesión activa')
      return
    }

    if (!form.name.trim()) {
      setErrorMessage('El nombre de la categoría es obligatorio')
      return
    }

    try {
      setIsSaving(true)
      const trimmedName = form.name.trim()

      if (categoryToEdit) {
        const previousName = categoryToEdit.name
        const updatedCategory = await updateCategoryRequest(
          token,
          categoryToEdit.id,
          {
            name: trimmedName,
            color: form.color,
          }
        )

        setCategories((prev) =>
          sortCategories(
            prev.map((category) =>
              category.id === updatedCategory.id ? updatedCategory : category
            )
          )
        )

        if (previousName !== updatedCategory.name) {
          setTransactions((prev) =>
            prev.map((transaction) =>
              transaction.type === updatedCategory.type &&
              transaction.category === previousName
                ? {
                    ...transaction,
                    category: updatedCategory.name,
                  }
                : transaction
            )
          )
        }
      } else {
        const savedCategory = await createCategoryRequest(token, {
          name: trimmedName,
          type: form.type,
          color: form.color,
        })

        setCategories((prev) => sortCategories([...prev, savedCategory]))
      }

      resetFormState()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al crear categoría')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const openDeleteModal = (categoryId: string) => {
    setCategoryToDelete(categoryId)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setCategoryToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!token || !categoryToDelete) return

    try {
      setIsDeleting(true)

      await deleteCategoryRequest(token, categoryToDelete)

      setCategories((prev) =>
        prev.filter((category) => category.id !== categoryToDelete)
      )

      if (categoryToEdit?.id === categoryToDelete) {
        resetFormState()
      }

      closeDeleteModal()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al eliminar categoría')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Categorías
            </h1>
            <p className="text-slate-600">
              Administra las categorías de ingresos y gastos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetFormState()
                return
              }

              openCreateForm()
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showForm ? 'Cerrar formulario' : 'Nueva categoría'}
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {showForm && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Crear categoría
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-700"
                >
                  Nombre
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: Comida"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="type"
                  className="text-sm font-medium text-slate-700"
                >
                  Tipo
                </label>
                <select
                  id="type"
                  value={form.type}
                  disabled={Boolean(categoryToEdit)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as CategoryType,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                  <option value="investments">Inversión</option>
                </select>

                {categoryToEdit && (
                  <p className="text-xs text-slate-500">
                    El tipo no se puede editar por ahora.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="color"
                  className="text-sm font-medium text-slate-700"
                >
                  Color
                </label>
                <input
                  id="color"
                  type="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      color: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-300 px-2 py-1"
                />
              </div>

              <div className="flex justify-end gap-3 md:col-span-3">
                <button
                  type="button"
                  onClick={resetFormState}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Guardando...' : 'Guardar categoría'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="py-3">Color</th>
                  <th className="py-3">Nombre</th>
                  <th className="py-3">Tipo</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {isLoadingCategories ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      Cargando categorías...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium text-slate-600">
                          No hay categorías aún
                        </p>
                        <p className="text-sm text-slate-400">
                          Crea tu primera categoría para clasificar tus transacciones
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b last:border-b-0">
                      <td className="py-3">
                        <span
                          className="block h-5 w-5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      </td>
                      <td className="py-3 font-medium text-slate-800">
                        {category.name}
                      </td>
                      <td className={`py-3 font-medium ${category.type === 'expense' ? 'text-red-500': 'text-green-600'}`}>
                        {category.type === 'expense' ? 'Gasto' : category.type === 'income' ? 'Ingreso' : 'Inversión'}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(category)}
                            title="Editar categoria"
                            aria-label="Editar categoria"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            <EditButtonIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(category.id)}
                            title="Eliminar categoria"
                            aria-label="Eliminar categoria"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <DeleteButtonIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title="Confirmar eliminación"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              ¿Seguro que quieres eliminar esta categoría?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando...' : 'Aceptar'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
