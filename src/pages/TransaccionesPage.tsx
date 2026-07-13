import {
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import { useAuth } from '../hooks/useAuth'
import {
  PAYMENT_METHOD_OPTIONS,
  REIMBURSEMENT_STATUS_OPTIONS,
  getPaymentMethodLabel,
  getReimbursementStatusLabel,
  type PaymentMethod,
  type ReimbursementStatus,
  type Transaction,
  type TransactionType,
} from '../types/transaction'
import {
  createTransactionRequest,
  deleteTransactionRequest,
  updateTransactionRequest,
} from '../services/transactionService'
import type { Category } from '../types/category'
import {
  getPaymentMethodTone,
  getReimbursementStatusTone,
  getTransactionTypeLabel,
  getTransactionTypeTone,
} from '../utils/transactionMetrics'

interface TransactionForm {
  description: string
  amount: string
  type: TransactionType
  category: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  date: string
}

interface TransaccionesPageProps {
  transactions: Transaction[]
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  isLoadingTransactions: boolean
  categories: Category[]
}

const initialForm: TransactionForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  paymentMethod: 'not_specified',
  reimbursementStatus: 'not_applicable',
  date: '',
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

export default function TransaccionesPage({
  transactions,
  setTransactions,
  isLoadingTransactions,
  categories,
}: TransaccionesPageProps) {
  const { token } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TransactionForm>(initialForm)
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(
    null
  )
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isExpense = form.type === 'expense'
  const isReimbursable = form.reimbursementStatus !== 'not_applicable'

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setForm((prev) => {
      if (name === 'type') {
        const nextType = value as TransactionType

        return {
          ...prev,
          type: nextType,
          category: '',
          paymentMethod:
            nextType === 'expense' ? prev.paymentMethod : 'not_specified',
          reimbursementStatus:
            nextType === 'expense' ? prev.reimbursementStatus : 'not_applicable',
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const resetFormState = () => {
    setForm(initialForm)
    setTransactionToEdit(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    setErrorMessage('')
    setForm(initialForm)
    setTransactionToEdit(null)
    setShowForm(true)
  }

  const openEditForm = (transaction: Transaction) => {
    setErrorMessage('')
    setTransactionToEdit(transaction)
    setForm({
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      paymentMethod: transaction.paymentMethod,
      reimbursementStatus: transaction.reimbursementStatus,
      date: transaction.date.slice(0, 10),
    })
    setShowForm(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (
      !form.description.trim() ||
      !form.amount.trim() ||
      !form.category.trim() ||
      !form.date.trim()
    ) {
      setErrorMessage('Completa todos los campos')
      return
    }

    const parsedAmount = Number(form.amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('El monto debe ser mayor a cero')
      return
    }

    try {
      setIsSaving(true)

      const payload = {
        description: form.description.trim(),
        amount: parsedAmount,
        type: form.type,
        category: form.category.trim(),
        paymentMethod: isExpense ? form.paymentMethod : 'not_specified',
        reimbursementStatus: isExpense
          ? form.reimbursementStatus
          : 'not_applicable',
        date: form.date,
      }

      if (transactionToEdit) {
        const updatedTransaction = await updateTransactionRequest(
          token,
          transactionToEdit.id,
          payload
        )

        setTransactions((prev) =>
          prev.map((transaction) =>
            transaction.id === updatedTransaction.id
              ? updatedTransaction
              : transaction
          )
        )
      } else {
        const savedTransaction = await createTransactionRequest(token, payload)

        setTransactions((prev) => [savedTransaction, ...prev])
      }

      resetFormState()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al guardar transaccion')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const openDeleteModal = (transactionId: string) => {
    setTransactionToDelete(transactionId)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setTransactionToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!transactionToDelete || !token) return

    try {
      setIsDeleting(true)

      await deleteTransactionRequest(token, transactionToDelete)

      setTransactions((prev) =>
        prev.filter((transaction) => transaction.id !== transactionToDelete)
      )

      if (transactionToEdit?.id === transactionToDelete) {
        resetFormState()
      }

      closeDeleteModal()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al eliminar transaccion')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const availableCategories = categories.filter(
    (category) => category.type === form.type
  )

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Transacciones
            </h1>
            <p className="text-slate-600">
              Registra ingresos, gastos personales y gastos reembolsables con su
              medio de pago.
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
            {showForm ? 'Cerrar formulario' : 'Nueva transaccion'}
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
              {transactionToEdit ? 'Editar transaccion' : 'Agregar transaccion'}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-slate-700"
                >
                  Descripcion
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  value={form.description}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: Supermercado"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-slate-700"
                >
                  Monto
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  value={form.amount}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: 1500"
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
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                  <option value="investments">Inversion</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="category"
                  className="text-sm font-medium text-slate-700"
                >
                  Categoria
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">Selecciona una categoria</option>

                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {availableCategories.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No tienes categorias para este tipo. Crea una desde la
                    seccion Categorias.
                  </p>
                )}
              </div>

              {isExpense && (
                <>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="paymentMethod"
                      className="text-sm font-medium text-slate-700"
                    >
                      Medio de pago
                    </label>
                    <select
                      id="paymentMethod"
                      name="paymentMethod"
                      value={form.paymentMethod}
                      onChange={handleChange}
                      className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                    >
                      <option value="not_specified">
                        Sin definir
                      </option>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-slate-500">
                      Si no lo indicas, el gasto queda como sin definir.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={isReimbursable}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            reimbursementStatus: event.target.checked
                              ? prev.reimbursementStatus === 'reimbursed'
                                ? 'reimbursed'
                                : 'pending'
                              : 'not_applicable',
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                      Es un gasto reembolsable o por cobrar
                    </label>

                    <p className="text-xs text-slate-500">
                      Activalo cuando pagaste algo que despues te tienen que
                      devolver.
                    </p>
                  </div>
                </>
              )}

              {isExpense && isReimbursable && (
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label
                    htmlFor="reimbursementStatus"
                    className="text-sm font-medium text-slate-700"
                  >
                    Estado del reembolso
                  </label>
                  <select
                    id="reimbursementStatus"
                    name="reimbursementStatus"
                    value={form.reimbursementStatus}
                    onChange={handleChange}
                    className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  >
                    {REIMBURSEMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="date"
                  className="text-sm font-medium text-slate-700"
                >
                  Fecha
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex justify-end gap-3 md:col-span-2">
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
                  {isSaving ? 'Guardando...' : 'Guardar transaccion'}
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
                  <th className="py-3">Descripcion</th>
                  <th className="py-3">Categoria</th>
                  <th className="py-3">Tipo</th>
                  <th className="py-3">Monto</th>
                  <th className="py-3">Medio de pago</th>
                  <th className="py-3">Reembolso</th>
                  <th className="py-3">Fecha</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {isLoadingTransactions ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Cargando transacciones...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium text-slate-600">
                          No hay transacciones aun
                        </p>
                        <p className="text-sm text-slate-400">
                          Agrega tu primera transaccion para comenzar
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-b-0">
                      <td className="py-3 text-slate-800">
                        {transaction.description}
                      </td>
                      <td className="py-3 text-slate-600">
                        {transaction.category}
                      </td>
                      <td
                        className={`py-3 font-medium ${getTransactionTypeTone(transaction.type)}`}
                      >
                        {getTransactionTypeLabel(transaction.type)}
                      </td>
                      <td className="py-3 text-slate-800">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentMethodTone(transaction.paymentMethod)}`}
                        >
                          {getPaymentMethodLabel(transaction.paymentMethod)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getReimbursementStatusTone(transaction.reimbursementStatus)}`}
                        >
                          {getReimbursementStatusLabel(
                            transaction.reimbursementStatus
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {transaction.date.slice(0, 10)}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => openEditForm(transaction)}
                          className="mr-2 rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(transaction.id)}
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
          title="Confirmar eliminacion"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              Seguro que quieres eliminar esta transaccion?
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
