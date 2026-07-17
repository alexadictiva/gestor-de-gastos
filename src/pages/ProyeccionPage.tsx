import {
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import { DeleteButtonIcon, EditButtonIcon } from '../assets/icons'
import { useAuth } from '../hooks/useAuth'
import {
  convertPlannedMovementToTransactionRequest,
  createPlannedMovementRequest,
  deletePlannedMovementRequest,
  duplicateRecurringPlannedMovementsRequest,
  revertPlannedMovementConversionRequest,
  updatePlannedMovementStatusRequest,
  updatePlannedMovementRequest,
} from '../services/plannedMovementService'
import {
  getPlannedMovementStatusLabel,
  type PlannedMovement,
  type PlannedMovementStatus,
  type PlannedMovementType,
} from '../types/plannedMovement'
import {
  getPaymentMethodLabel,
  type PaymentMethod,
  PAYMENT_METHOD_OPTIONS,
  type Transaction,
} from '../types/transaction'
import {
  buildPlannedMovementMetrics,
  filterPlannedMovementsByMonth,
  formatMonthLabel,
  getCurrentMonthKey,
  shiftMonthKey,
} from '../utils/plannedMovement'
import { getPaymentMethodTone } from '../utils/transactionMetrics'

interface PlannedMovementForm {
  title: string
  amount: string
  type: PlannedMovementType
  category: string
  paymentMethod: PaymentMethod
  dueDate: string
  isRecurring: boolean
}

interface ProyeccionPageProps {
  plannedMovements: PlannedMovement[]
  setPlannedMovements: Dispatch<SetStateAction<PlannedMovement[]>>
  isLoadingPlannedMovements: boolean
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

function createInitialForm(monthKey: string): PlannedMovementForm {
  return {
    title: '',
    amount: '',
    type: 'expense',
    category: '',
    paymentMethod: 'not_specified',
    dueDate: `${monthKey}-01`,
    isRecurring: false,
  }
}

function sortPlannedMovements(items: PlannedMovement[]) {
  return [...items].sort(
    (itemA, itemB) =>
      new Date(itemA.dueDate).getTime() - new Date(itemB.dueDate).getTime()
  )
}

function sortTransactions(items: Transaction[]) {
  return [...items].sort(
    (itemA, itemB) =>
      new Date(itemB.date).getTime() - new Date(itemA.date).getTime()
  )
}

function replaceMonthItems(
  items: PlannedMovement[],
  monthKey: string,
  nextMonthItems: PlannedMovement[]
) {
  const preservedItems = items.filter((item) => {
    const dueDate = item.dueDate.slice(0, 7)

    return dueDate !== monthKey
  })

  return sortPlannedMovements([...preservedItems, ...nextMonthItems])
}

function replacePlannedMovementItem(
  items: PlannedMovement[],
  nextItem: PlannedMovement
) {
  return sortPlannedMovements(
    items.map((item) => (item.id === nextItem.id ? nextItem : item))
  )
}

function getPlannedMovementStatusTone(status: PlannedMovementStatus) {
  return status === 'completed'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700'
}

function buildStatusSuccessMessage(
  type: PlannedMovementType,
  status: PlannedMovementStatus
) {
  if (status === 'pending') {
    return 'Movimiento proyectado marcado como pendiente'
  }

  return type === 'expense'
    ? 'Movimiento proyectado marcado como pagado'
    : 'Movimiento proyectado marcado como cobrado'
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

export default function ProyeccionPage({
  plannedMovements,
  setPlannedMovements,
  isLoadingPlannedMovements,
  setTransactions,
}: ProyeccionPageProps) {
  const { token } = useAuth()
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), [])

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PlannedMovementForm>(
    createInitialForm(currentMonthKey)
  )
  const [plannedMovementToEdit, setPlannedMovementToEdit] =
    useState<PlannedMovement | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [plannedMovementToDelete, setPlannedMovementToDelete] = useState<
    string | null
  >(null)
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false)
  const [plannedMovementToRevert, setPlannedMovementToRevert] =
    useState<PlannedMovement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [activeStatusItemId, setActiveStatusItemId] = useState<string | null>(
    null
  )
  const [activeConvertItemId, setActiveConvertItemId] = useState<string | null>(
    null
  )

  const monthItems = useMemo(
    () => filterPlannedMovementsByMonth(plannedMovements, selectedMonth),
    [plannedMovements, selectedMonth]
  )

  const {
    projectedIncomeTotal,
    projectedExpenseTotal,
    projectedBalanceTotal,
    recurringItemsCount,
  } = buildPlannedMovementMetrics(monthItems)

  const isExpense = form.type === 'expense'

  const clearFeedback = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const resetFormState = (monthKey = selectedMonth) => {
    setForm(createInitialForm(monthKey))
    setPlannedMovementToEdit(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    clearFeedback()
    setForm(createInitialForm(selectedMonth))
    setPlannedMovementToEdit(null)
    setShowForm(true)
  }

  const openEditForm = (plannedMovement: PlannedMovement) => {
    clearFeedback()
    setPlannedMovementToEdit(plannedMovement)
    setForm({
      title: plannedMovement.title,
      amount: String(plannedMovement.amount),
      type: plannedMovement.type,
      category: plannedMovement.category,
      paymentMethod: plannedMovement.paymentMethod,
      dueDate: plannedMovement.dueDate.slice(0, 10),
      isRecurring: plannedMovement.isRecurring,
    })
    setShowForm(true)
  }

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setForm((prev) => {
      if (name === 'type') {
        const nextType = value as PlannedMovementType

        return {
          ...prev,
          type: nextType,
          paymentMethod:
            nextType === 'expense' ? prev.paymentMethod : 'not_specified',
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (!form.title.trim() || !form.amount.trim() || !form.category.trim()) {
      setErrorMessage('Completa todos los campos obligatorios')
      return
    }

    if (!form.dueDate.trim()) {
      setErrorMessage('Selecciona una fecha de vencimiento')
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
        title: form.title.trim(),
        amount: parsedAmount,
        type: form.type,
        category: form.category.trim(),
        paymentMethod: isExpense ? form.paymentMethod : 'not_specified',
        dueDate: form.dueDate,
        isRecurring: form.isRecurring,
      }
      const targetMonthKey = payload.dueDate.slice(0, 7)

      if (plannedMovementToEdit) {
        const updatedItem = await updatePlannedMovementRequest(
          token,
          plannedMovementToEdit.id,
          payload
        )

        setPlannedMovements((prev) => replacePlannedMovementItem(prev, updatedItem))
        setSuccessMessage('Movimiento proyectado actualizado correctamente')
      } else {
        const savedItem = await createPlannedMovementRequest(token, payload)

        setPlannedMovements((prev) => sortPlannedMovements([...prev, savedItem]))
        setSuccessMessage('Movimiento proyectado creado correctamente')
      }

      if (selectedMonth !== targetMonthKey) {
        setSelectedMonth(targetMonthKey)
      }

      resetFormState(targetMonthKey)
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo guardar la proyeccion')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicateRecurring = async () => {
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    try {
      setIsDuplicating(true)
      const response = await duplicateRecurringPlannedMovementsRequest(
        token,
        selectedMonth
      )

      setPlannedMovements((prev) =>
        replaceMonthItems(prev, selectedMonth, response.plannedMovements)
      )
      setSuccessMessage(response.message)
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudieron duplicar los recurrentes')
      }
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleStatusChange = async (
    plannedMovement: PlannedMovement,
    nextStatus: PlannedMovementStatus
  ) => {
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    try {
      setActiveStatusItemId(plannedMovement.id)

      const updatedItem = await updatePlannedMovementStatusRequest(
        token,
        plannedMovement.id,
        nextStatus
      )

      setPlannedMovements((prev) => replacePlannedMovementItem(prev, updatedItem))
      setSuccessMessage(buildStatusSuccessMessage(plannedMovement.type, nextStatus))
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo actualizar el estado del movimiento')
      }
    } finally {
      setActiveStatusItemId(null)
    }
  }

  const handleConvertToTransaction = async (plannedMovement: PlannedMovement) => {
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    try {
      setActiveConvertItemId(plannedMovement.id)

      const { plannedMovement: updatedItem, transaction } =
        await convertPlannedMovementToTransactionRequest(token, plannedMovement.id)

      setPlannedMovements((prev) => replacePlannedMovementItem(prev, updatedItem))
      setTransactions((prev) =>
        sortTransactions([
          ...prev.filter((item) => item.id !== transaction.id),
          transaction,
        ])
      )

      if (plannedMovementToEdit?.id === plannedMovement.id) {
        resetFormState()
      }

      setSuccessMessage('Movimiento proyectado convertido en transaccion real')
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo convertir el movimiento proyectado')
      }
    } finally {
      setActiveConvertItemId(null)
    }
  }

  const openDeleteModal = (plannedMovementId: string) => {
    setPlannedMovementToDelete(plannedMovementId)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setPlannedMovementToDelete(null)
    setIsDeleteModalOpen(false)
  }

  const openRevertModal = (plannedMovement: PlannedMovement) => {
    setPlannedMovementToRevert(plannedMovement)
    setIsRevertModalOpen(true)
  }

  const closeRevertModal = () => {
    setPlannedMovementToRevert(null)
    setIsRevertModalOpen(false)
  }

  const confirmRevertConversion = async () => {
    if (!plannedMovementToRevert || !token) {
      return
    }

    try {
      setIsReverting(true)
      clearFeedback()

      const { plannedMovement: updatedItem, deletedTransactionId } =
        await revertPlannedMovementConversionRequest(
          token,
          plannedMovementToRevert.id
        )

      setPlannedMovements((prev) => replacePlannedMovementItem(prev, updatedItem))

      if (deletedTransactionId) {
        setTransactions((prev) =>
          sortTransactions(
            prev.filter((transaction) => transaction.id !== deletedTransactionId)
          )
        )
      }

      closeRevertModal()
      openEditForm(updatedItem)
      setSuccessMessage(
        'Se deshizo el paso a real. Ahora puedes corregir la proyeccion y volver a guardarla.'
      )
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo deshacer el paso a real')
      }
    } finally {
      setIsReverting(false)
    }
  }

  const confirmDelete = async () => {
    if (!plannedMovementToDelete || !token) {
      return
    }

    try {
      setIsDeleting(true)

      await deletePlannedMovementRequest(token, plannedMovementToDelete)

      setPlannedMovements((prev) =>
        prev.filter((item) => item.id !== plannedMovementToDelete)
      )

      if (plannedMovementToEdit?.id === plannedMovementToDelete) {
        resetFormState()
      }

      closeDeleteModal()
      setSuccessMessage('Movimiento proyectado eliminado correctamente')
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo eliminar la proyeccion')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Proyeccion</h1>
              <p className="mt-2 text-slate-600">
                Planifica lo que ya sabes que tienes que pagar o cobrar en los
                meses siguientes sin mezclarlo con las transacciones reales.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Mes</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value)
                    if (!plannedMovementToEdit) {
                      setForm(createInitialForm(event.target.value))
                    }
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                />
              </label>

              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, -1))}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Mes anterior
              </button>

              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, 1))}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Mes siguiente
              </button>

              {selectedMonth !== currentMonthKey && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth(currentMonthKey)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Volver al mes actual
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Mes seleccionado: {formatMonthLabel(selectedMonth)}
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {isLoadingPlannedMovements ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              Cargando proyeccion...
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Estamos preparando los compromisos de {formatMonthLabel(selectedMonth)}.
            </p>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Ingresos proyectados"
                value={formatCurrency(projectedIncomeTotal)}
                tone="text-green-600"
              />
              <StatCard
                label="Gastos proyectados"
                value={formatCurrency(projectedExpenseTotal)}
                tone="text-red-600"
              />
              <StatCard
                label="Saldo proyectado"
                value={formatCurrency(projectedBalanceTotal)}
                tone={
                  projectedBalanceTotal >= 0 ? 'text-slate-800' : 'text-red-600'
                }
              />
              <StatCard
                label="Items recurrentes"
                value={recurringItemsCount.toLocaleString('es-AR')}
                tone="text-sky-600"
              />
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Compromisos del mes
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Puedes cargar pagos fijos, ingresos esperados y deudas que ya
                    sabes que vas a cobrar o pagar. Los totales de arriba solo
                    cuentan los movimientos que siguen pendientes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDuplicateRecurring}
                    disabled={isDuplicating}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDuplicating
                      ? 'Duplicando...'
                      : 'Duplicar recurrentes del mes anterior'}
                  </button>

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
                    {showForm ? 'Cerrar formulario' : 'Nuevo movimiento proyectado'}
                  </button>
                </div>
              </div>

              {showForm && (
                <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                  <h3 className="mb-4 text-base font-semibold text-slate-800">
                    {plannedMovementToEdit
                      ? 'Editar movimiento proyectado'
                      : 'Agregar movimiento proyectado'}
                  </h3>

                  <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                  >
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="planned-title"
                        className="text-sm font-medium text-slate-700"
                      >
                        Titulo
                      </label>
                      <input
                        id="planned-title"
                        name="title"
                        type="text"
                        value={form.title}
                        onChange={handleChange}
                        className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        placeholder="Ej: Alquiler agosto"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="planned-amount"
                        className="text-sm font-medium text-slate-700"
                      >
                        Monto
                      </label>
                      <input
                        id="planned-amount"
                        name="amount"
                        type="number"
                        value={form.amount}
                        onChange={handleChange}
                        className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        placeholder="Ej: 450000"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="planned-type"
                        className="text-sm font-medium text-slate-700"
                      >
                        Tipo
                      </label>
                      <select
                        id="planned-type"
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
                        htmlFor="planned-category"
                        className="text-sm font-medium text-slate-700"
                      >
                        Categoria
                      </label>
                      <input
                        id="planned-category"
                        name="category"
                        type="text"
                        value={form.category}
                        onChange={handleChange}
                        className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        placeholder="Ej: Alquiler"
                      />
                    </div>

                    {isExpense && (
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="planned-paymentMethod"
                          className="text-sm font-medium text-slate-700"
                        >
                          Medio de pago
                        </label>
                        <select
                          id="planned-paymentMethod"
                          name="paymentMethod"
                          value={form.paymentMethod}
                          onChange={handleChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        >
                          <option value="not_specified">Sin definir</option>
                          {PAYMENT_METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="planned-dueDate"
                        className="text-sm font-medium text-slate-700"
                      >
                        Fecha estimada
                      </label>
                      <input
                        id="planned-dueDate"
                        name="dueDate"
                        type="date"
                        value={form.dueDate}
                        onChange={handleChange}
                        className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                      />
                      <p className="text-xs text-slate-500">
                        La tabla muestra solo el mes seleccionado. Si guardas una
                        fecha de otro mes, te llevaremos automaticamente a ese mes.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 md:col-span-2">
                      <input
                        id="planned-isRecurring"
                        type="checkbox"
                        checked={form.isRecurring}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            isRecurring: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                      <label
                        htmlFor="planned-isRecurring"
                        className="text-sm font-medium text-slate-700"
                      >
                        Es un movimiento recurrente
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 md:col-span-2">
                      <button
                        type="button"
                        onClick={() => resetFormState()}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar movimiento'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-sm text-slate-500">
                      <th className="py-3">Titulo</th>
                      <th className="py-3">Categoria</th>
                      <th className="py-3">Tipo</th>
                      <th className="py-3">Monto</th>
                      <th className="py-3">Medio de pago</th>
                      <th className="py-3">Fecha</th>
                      <th className="py-3">Estado</th>
                      <th className="py-3">Recurrente</th>
                      <th className="py-3">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {monthItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <p className="font-medium text-slate-600">
                              No hay movimientos proyectados en este mes
                            </p>
                            <p className="text-sm text-slate-400">
                              Carga compromisos o duplica recurrentes para empezar.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      monthItems.map((item) => {
                        const isUpdatingStatus = activeStatusItemId === item.id
                        const isConverting = activeConvertItemId === item.id
                        const isBusy = isUpdatingStatus || isConverting
                        const canEditProjection = !item.linkedTransactionId

                        return (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-3 text-slate-800">{item.title}</td>
                            <td className="py-3 text-slate-600">{item.category}</td>
                            <td
                              className={`py-3 font-medium ${
                                item.type === 'expense'
                                  ? 'text-red-500'
                                  : 'text-green-600'
                              }`}
                            >
                              {item.type === 'expense' ? 'Gasto' : 'Ingreso'}
                            </td>
                            <td className="py-3 text-slate-800">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentMethodTone(item.paymentMethod)}`}
                              >
                                {getPaymentMethodLabel(item.paymentMethod)}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600">
                              {item.dueDate.slice(0, 10)}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getPlannedMovementStatusTone(item.status)}`}
                                >
                                  {getPlannedMovementStatusLabel(
                                    item.status,
                                    item.type
                                  )}
                                </span>
                                {item.linkedTransactionId && (
                                  <span className="text-xs text-slate-500">
                                    Ya registrado como transaccion real
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                  item.isRecurring
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.isRecurring ? 'Si' : 'No'}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                {item.status === 'pending' ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(item, 'completed')
                                    }
                                    disabled={isBusy}
                                    className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdatingStatus
                                      ? 'Guardando...'
                                      : item.type === 'expense'
                                        ? 'Marcar pagado'
                                        : 'Marcar cobrado'}
                                  </button>
                                ) : !item.linkedTransactionId ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(item, 'pending')}
                                    disabled={isBusy}
                                    className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdatingStatus
                                      ? 'Guardando...'
                                      : 'Marcar pendiente'}
                                  </button>
                                ) : null}

                                {!item.linkedTransactionId && (
                                  <button
                                    type="button"
                                    onClick={() => handleConvertToTransaction(item)}
                                    disabled={isBusy}
                                    className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isConverting
                                      ? 'Convirtiendo...'
                                      : 'Pasar a real'}
                                  </button>
                                )}

                                {item.linkedTransactionId && (
                                  <button
                                    type="button"
                                    onClick={() => openRevertModal(item)}
                                    disabled={isBusy}
                                    className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Corregir
                                  </button>
                                )}

                                {canEditProjection && (
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(item)}
                                    disabled={isBusy}
                                    title="Editar movimiento proyectado"
                                    aria-label="Editar movimiento proyectado"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <EditButtonIcon className="h-4 w-4" />
                                  </button>
                                )}

                                {canEditProjection && (
                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(item.id)}
                                    disabled={isBusy}
                                    title="Eliminar movimiento proyectado"
                                    aria-label="Eliminar movimiento proyectado"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <DeleteButtonIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <Modal
          isOpen={isRevertModalOpen}
          onClose={closeRevertModal}
          title="Corregir proyeccion pasada a real"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              Se eliminara la transaccion real vinculada y esta proyeccion
              volvera a estado pendiente para que puedas editarla o borrarla.
            </p>

            {plannedMovementToRevert && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Movimiento: <span className="font-semibold">{plannedMovementToRevert.title}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRevertModal}
                disabled={isReverting}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmRevertConversion}
                disabled={isReverting}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReverting ? 'Revirtiendo...' : 'Deshacer paso a real'}
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title="Confirmar eliminacion"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              Seguro que quieres eliminar este movimiento proyectado?
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
