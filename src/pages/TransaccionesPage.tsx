import { useState, type ChangeEvent, type FormEvent, type Dispatch, type SetStateAction } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import type { Transaction, TransactionType } from '../types/transaction'
import Modal from '../components/layout/Modal'

interface NewTransactionForm {
  description: string
  amount: string
  type: TransactionType
  category: string
  date: string
}

interface TransaccionesPageProps {
  transactions: Transaction[]
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}

const initialForm: NewTransactionForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  date: '',
}

export default function TransaccionesPage({
  transactions,
  setTransactions,
}: TransaccionesPageProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewTransactionForm>(initialForm)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !form.description.trim() ||
      !form.amount.trim() ||
      !form.category.trim() ||
      !form.date.trim()
    ) {
      alert('Completa todos los campos')
      return
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      description: form.description.trim(),
      amount: Number(form.amount),
      type: form.type,
      category: form.category.trim(),
      date: form.date,
    }

    setTransactions((prev) => [newTransaction, ...prev])
    setForm(initialForm)
    setShowForm(false)
  }

  const openDeleteModal = (transactionId: string) => {
    setTransactionToDelete(transactionId)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setTransactionToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const confirmDelete = () => {
    if (!transactionToDelete) return

    setTransactions((prev) =>
      prev.filter((transaction) => transaction.id !== transactionToDelete)
    )

    closeDeleteModal()
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Transacciones
            </h1>
            <p className="text-slate-600">
              Aquí puedes ver todos tus ingresos y gastos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showForm ? 'Cerrar formulario' : 'Nueva transacción'}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Agregar transacción
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
                  Descripción
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
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="category"
                  className="text-sm font-medium text-slate-700"
                >
                  Categoría
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: Comida"
                />
              </div>

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

              <div className="flex justify-end md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Guardar transacción
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
                  <th className="py-3">Descripción</th>
                  <th className="py-3">Categoría</th>
                  <th className="py-3">Tipo</th>
                  <th className="py-3">Monto</th>
                  <th className="py-3">Fecha</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium text-slate-600">
                          No hay transacciones aún
                        </p>
                        <p className="text-sm text-slate-400">
                          Agrega tu primera transacción para comenzar
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
                        className={`py-3 font-medium ${
                          transaction.type === 'expense'
                            ? 'text-red-500'
                            : 'text-green-600'
                        }`}
                      >
                        {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                      </td>
                      <td className="py-3 text-slate-800">
                        ${transaction.amount}
                      </td>
                      <td className="py-3 text-slate-600">
                        {transaction.date}
                      </td>
                      <td className="py-3">
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
          title="Confirmar eliminación"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              ¿Seguro que quieres eliminar esta transacción?
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
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}