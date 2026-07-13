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
import type { ObligationAccount } from '../types/obligationAccount'
import {
  getPaymentMethodTone,
  getReimbursementStatusTone,
  getSignedTransactionAmountLabel,
  getTransactionAmountTone,
  getTransactionDisplayLabel,
  getTransactionDisplayTone,
  isDebtCollectionTransaction,
  isDebtPaymentTransaction,
} from '../utils/transactionMetrics'
import { sortObligationAccounts } from '../utils/obligationAccount'

interface TransactionForm {
  description: string
  amount: string
  type: TransactionType
  category: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  date: string
  createLinkedObligationAccount: boolean
  linkedObligationAccountName: string
  linkedObligationInstallmentCount: string
  linkedObligationFirstDueDate: string
}

interface TransaccionesPageProps {
  transactions: Transaction[]
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  isLoadingTransactions: boolean
  categories: Category[]
  setObligationAccounts: Dispatch<SetStateAction<ObligationAccount[]>>
}

function getLocalDateInputValue(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const day = String(referenceDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createInitialForm(): TransactionForm {
  return {
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    paymentMethod: 'not_specified',
    reimbursementStatus: 'not_applicable',
    date: '',
    createLinkedObligationAccount: false,
    linkedObligationAccountName: '',
    linkedObligationInstallmentCount: '',
    linkedObligationFirstDueDate: getLocalDateInputValue(),
  }
}

function replaceAccountItem(
  items: ObligationAccount[],
  nextAccount: ObligationAccount
) {
  const hasExistingAccount = items.some((item) => item.id === nextAccount.id)

  return sortObligationAccounts(
    hasExistingAccount
      ? items.map((item) => (item.id === nextAccount.id ? nextAccount : item))
      : [nextAccount, ...items]
  )
}

function getLinkedAccountBadge(transaction: Transaction) {
  if (!transaction.linkedObligationAccountId) {
    return null
  }

  if (transaction.type === 'income') {
    return {
      label: 'Prestamo recibido vinculado a Tarjetas y Prestamos',
      className: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (transaction.paymentMethod === 'loan') {
    return {
      label: 'Compra financiada con prestamo',
      className: 'bg-amber-100 text-amber-700',
    }
  }

  if (transaction.paymentMethod === 'credit') {
    return {
      label: 'Compra financiada con tarjeta',
      className: 'bg-violet-100 text-violet-700',
    }
  }

  return {
    label: 'Movimiento vinculado a Tarjetas y Prestamos',
    className: 'bg-slate-100 text-slate-700',
  }
}

export default function TransaccionesPage({
  transactions,
  setTransactions,
  isLoadingTransactions,
  categories,
  setObligationAccounts,
}: TransaccionesPageProps) {
  const { token } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TransactionForm>(createInitialForm())
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
  const isIncome = form.type === 'income'
  const isReimbursable = form.reimbursementStatus !== 'not_applicable'
  const isFinancingPaymentMethod =
    form.paymentMethod === 'credit' || form.paymentMethod === 'loan'
  const canLinkToObligationAccount =
    isIncome || (isExpense && isFinancingPaymentMethod)

  const resetLinkedObligationFields = () => ({
    createLinkedObligationAccount: false,
    linkedObligationAccountName: '',
    linkedObligationInstallmentCount: '',
    linkedObligationFirstDueDate: getLocalDateInputValue(),
  })

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
          ...(nextType === 'investments' ? resetLinkedObligationFields() : {}),
        }
      }

      if (name === 'paymentMethod') {
        const nextPaymentMethod = value as PaymentMethod

        return {
          ...prev,
          paymentMethod: nextPaymentMethod,
          ...(nextPaymentMethod === 'credit' || nextPaymentMethod === 'loan'
            ? {}
            : resetLinkedObligationFields()),
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const resetFormState = () => {
    setForm(createInitialForm())
    setTransactionToEdit(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    setErrorMessage('')
    setForm(createInitialForm())
    setTransactionToEdit(null)
    setShowForm(true)
  }

  const openEditForm = (transaction: Transaction) => {
    if (
      transaction.linkedObligationAccountId ||
      transaction.linkedObligationPaymentId
    ) {
      setErrorMessage(
        'Las transacciones vinculadas a Tarjetas y Prestamos se administran desde ese modulo'
      )
      return
    }

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
      createLinkedObligationAccount: false,
      linkedObligationAccountName: '',
      linkedObligationInstallmentCount: '',
      linkedObligationFirstDueDate: getLocalDateInputValue(),
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

    if (
      !transactionToEdit &&
      form.createLinkedObligationAccount &&
      !canLinkToObligationAccount
    ) {
      setErrorMessage(
        'Solo puedes vincular a Tarjetas y Prestamos un ingreso que represente un prestamo recibido o un gasto pagado con tarjeta o prestamo'
      )
      return
    }

    if (
      !transactionToEdit &&
      form.createLinkedObligationAccount &&
      (!form.linkedObligationInstallmentCount.trim() ||
        !form.linkedObligationFirstDueDate.trim())
    ) {
      setErrorMessage(
        'Completa las cuotas y la fecha de la primera cuota para crear la deuda vinculada'
      )
      return
    }

    const parsedInstallmentCount = Number(form.linkedObligationInstallmentCount)

    if (
      !transactionToEdit &&
      form.createLinkedObligationAccount &&
      (!Number.isInteger(parsedInstallmentCount) || parsedInstallmentCount <= 0)
    ) {
      setErrorMessage('La cantidad de cuotas debe ser un numero entero mayor a cero')
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
        ...(transactionToEdit
          ? {}
          : {
              createLinkedObligationAccount: form.createLinkedObligationAccount,
              linkedObligationAccountName:
                form.createLinkedObligationAccount
                  ? form.linkedObligationAccountName.trim() || null
                  : null,
              linkedObligationInstallmentCount:
                form.createLinkedObligationAccount
                  ? parsedInstallmentCount
                  : null,
              linkedObligationFirstDueDate:
                form.createLinkedObligationAccount
                  ? form.linkedObligationFirstDueDate
                  : null,
            }),
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
        const { transaction: savedTransaction, linkedObligationAccount } =
          await createTransactionRequest(token, payload)

        setTransactions((prev) => [savedTransaction, ...prev])

        if (linkedObligationAccount) {
          setObligationAccounts((prev) =>
            replaceAccountItem(prev, linkedObligationAccount)
          )
        }
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

      const {
        deletedLinkedObligationAccountId,
        updatedObligationAccount,
      } = await deleteTransactionRequest(token, transactionToDelete)

      setTransactions((prev) =>
        prev.filter((transaction) => transaction.id !== transactionToDelete)
      )

      if (deletedLinkedObligationAccountId) {
        setObligationAccounts((prev) =>
          prev.filter((account) => account.id !== deletedLinkedObligationAccountId)
        )
      }

      if (updatedObligationAccount) {
        setObligationAccounts((prev) =>
          replaceAccountItem(prev, updatedObligationAccount)
        )
      }

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
  const transactionPendingDelete = transactionToDelete
    ? transactions.find((transaction) => transaction.id === transactionToDelete) ??
      null
    : null

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

              {!transactionToEdit && canLinkToObligationAccount && (
                <div className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 md:col-span-2">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.createLinkedObligationAccount}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          createLinkedObligationAccount: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-400"
                    />
                    {isIncome
                      ? 'Registrar tambien este ingreso como prestamo por pagar'
                      : 'Registrar tambien esta compra en Tarjetas y Prestamos'}
                  </label>

                  <p className="text-xs text-slate-600">
                    {isIncome
                      ? 'Se creara una deuda vinculada para que este ingreso aumente tu liquidez hoy y puedas seguir sus cuotas desde el otro modulo.'
                      : form.paymentMethod === 'credit'
                      ? 'Se creara una cuenta vinculada de tarjeta con sus cuotas para que no tengas que cargar la deuda por separado.'
                      : 'Se creara una cuenta vinculada de prestamo por pagar con sus cuotas para que puedas seguir la deuda desde el otro modulo.'}
                  </p>

                  {form.createLinkedObligationAccount && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="linkedObligationAccountName"
                          className="text-sm font-medium text-slate-700"
                        >
                          {isIncome ? 'Nombre del prestamo' : 'Nombre de la deuda'}
                        </label>
                        <input
                          id="linkedObligationAccountName"
                          name="linkedObligationAccountName"
                          type="text"
                          value={form.linkedObligationAccountName}
                          onChange={handleChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder={
                            isIncome
                              ? 'Si lo dejas vacio, usamos la descripcion del ingreso'
                              : 'Si lo dejas vacio, usamos la descripcion'
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="linkedObligationInstallmentCount"
                          className="text-sm font-medium text-slate-700"
                        >
                          Cantidad de cuotas
                        </label>
                        <input
                          id="linkedObligationInstallmentCount"
                          name="linkedObligationInstallmentCount"
                          type="number"
                          value={form.linkedObligationInstallmentCount}
                          onChange={handleChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder="Ej: 6"
                        />
                      </div>

                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label
                          htmlFor="linkedObligationFirstDueDate"
                          className="text-sm font-medium text-slate-700"
                        >
                          Fecha de la primera cuota
                        </label>
                        <input
                          id="linkedObligationFirstDueDate"
                          name="linkedObligationFirstDueDate"
                          type="date"
                          value={form.linkedObligationFirstDueDate}
                          onChange={handleChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>
                  )}
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
                  {isSaving
                    ? 'Guardando...'
                    : transactionToEdit
                      ? 'Guardar cambios'
                      : form.createLinkedObligationAccount
                        ? 'Guardar y crear deuda'
                        : 'Guardar transaccion'}
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
                        <div className="flex flex-col gap-1">
                    <span>{transaction.description}</span>
                          {(() => {
                            const badge = getLinkedAccountBadge(transaction)

                            if (!badge) {
                              return null
                            }

                            return (
                              <span
                                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            )
                          })()}
                          {transaction.linkedObligationPaymentId && (
                            <span
                              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                                isDebtCollectionTransaction(transaction)
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {isDebtPaymentTransaction(transaction)
                                ? 'Pago de deuda generado desde Tarjetas y Prestamos'
                                : 'Cobro de deuda generado desde Tarjetas y Prestamos'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">
                        {transaction.category}
                      </td>
                      <td
                        className={`py-3 font-medium ${getTransactionDisplayTone(transaction)}`}
                      >
                        {getTransactionDisplayLabel(transaction)}
                      </td>
                      <td
                        className={`py-3 font-semibold ${getTransactionAmountTone(transaction)}`}
                      >
                        {getSignedTransactionAmountLabel(transaction)}
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
                          disabled={Boolean(
                            transaction.linkedObligationAccountId ||
                              transaction.linkedObligationPaymentId
                          )}
                          title={
                            transaction.linkedObligationAccountId ||
                            transaction.linkedObligationPaymentId
                              ? 'Edita este movimiento desde Tarjetas y Prestamos para no desincronizar el control de deuda'
                              : undefined
                          }
                          className="mr-2 rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
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
              {transactionPendingDelete?.linkedObligationAccountId
                ? 'Seguro que quieres eliminar esta transaccion? Tambien se eliminara la cuenta vinculada en Tarjetas y Prestamos con sus cuotas y movimientos.'
                : transactionPendingDelete?.linkedObligationPaymentId
                  ? 'Seguro que quieres eliminar esta transaccion? Tambien se eliminara el abono o cobro vinculado en Tarjetas y Prestamos.'
                  : 'Seguro que quieres eliminar esta transaccion?'}
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
