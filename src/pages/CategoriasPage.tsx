import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import { useAuth } from '../hooks/useAuth'
import type { Category, CategoryType } from '../types/category'
import {
  createCategoryRequest,
  deleteCategoryRequest,
} from '../services/categoryService'

interface CategoriasPageProps {
  categories: Category[]
  setCategories: Dispatch<SetStateAction<Category[]>>
  isLoadingCategories: boolean
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
}: CategoriasPageProps) {
  const { token } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CategoryForm>(initialForm)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

      const savedCategory = await createCategoryRequest(token, {
        name: form.name.trim(),
        type: form.type,
        color: form.color,
      })

      setCategories((prev) => [...prev, savedCategory])
      setForm(initialForm)
      setShowForm(false)
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
            onClick={() => setShowForm((prev) => !prev)}
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
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as CategoryType,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
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

              <div className="flex justify-end md:col-span-3">
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
                      <td
                        className={`py-3 font-medium ${
                          category.type === 'expense'
                            ? 'text-red-500'
                            : 'text-green-600'
                        }`}
                      >
                        {category.type === 'expense' ? 'Gasto' : 'Ingreso'}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => openDeleteModal(category.id)}
                          className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-200"
                        >
                          Eliminar
                        </button>
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