import { useState } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { mockTransactions } from '../data/mockTransactions'
import type { Transaction, TransactionType } from '../types/transaction'

interface NewTransactionForm {
  description: string
  amount: string
  type: TransactionType
  category: string
  date: string
}

const initialForm: NewTransactionForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  date: '',
}

export default function TransaccionesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewTransactionForm>(initialForm)

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="description" className="text-sm font-medium text-slate-700">
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
                <label htmlFor="amount" className="text-sm font-medium text-slate-700">
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
                <label htmlFor="type" className="text-sm font-medium text-slate-700">
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
                <label htmlFor="category" className="text-sm font-medium text-slate-700">
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
                <label htmlFor="date" className="text-sm font-medium text-slate-700">
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

              <div className="md:col-span-2 flex justify-end">
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
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}