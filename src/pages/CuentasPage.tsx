import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import {
  CloseButtonIcon,
  DeleteButtonIcon,
  EditButtonIcon,
  NewAccountButtonIcon,
} from '../assets/icons'
import { useAuth } from '../hooks/useAuth'
import {
  createFinancialAccountRequest,
  deleteFinancialAccountRequest,
  updateFinancialAccountRequest,
} from '../services/financialAccountService'
import type {
  FinancialAccount,
  FinancialAccountType,
} from '../types/financialAccount'
import {
  FINANCIAL_ACCOUNT_TYPE_OPTIONS,
  getFinancialAccountTypeLabel,
} from '../types/financialAccount'
import type { Transaction } from '../types/transaction'
import {
  buildFinancialAccountsDashboardSummary,
  buildFinancialAccountSummary,
  sortFinancialAccounts,
} from '../utils/financialAccount'

interface CuentasPageProps {
  financialAccounts: FinancialAccount[]
  setFinancialAccounts: Dispatch<SetStateAction<FinancialAccount[]>>
  transactions: Transaction[]
  isLoadingFinancialAccounts: boolean
}

interface FinancialAccountFormState {
  name: string
  type: FinancialAccountType
  initialBalance: string
  notes: string
}

const primaryIconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

function createInitialForm(): FinancialAccountFormState {
  return {
    name: '',
    type: 'bank',
    initialBalance: '0',
    notes: '',
  }
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
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className={`mt-2 text-2xl font-bold ${tone}`}>{value}</h2>
    </div>
  )
}

export default function CuentasPage({
  financialAccounts,
  setFinancialAccounts,
  transactions,
  isLoadingFinancialAccounts,
}: CuentasPageProps) {
  const { token } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FinancialAccountFormState>(createInitialForm())
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const dashboardSummary = useMemo(
    () => buildFinancialAccountsDashboardSummary(financialAccounts, transactions),
    [financialAccounts, transactions]
  )

  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 8000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [successMessage])

  const resetFormState = () => {
    setForm(createInitialForm())
    setAccountToEdit(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    setErrorMessage('')
    setShowForm(true)
    setAccountToEdit(null)
    setForm(createInitialForm())
  }

  const openEditForm = (account: FinancialAccount) => {
    setErrorMessage('')
    setAccountToEdit(account)
    setShowForm(true)
    setForm({
      name: account.name,
      type: account.type,
      initialBalance: String(account.initialBalance),
      notes: account.notes ?? '',
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (!form.name.trim()) {
      setErrorMessage('Completa el nombre de la cuenta')
      return
    }

    const parsedInitialBalance = Number(form.initialBalance)

    if (!Number.isFinite(parsedInitialBalance)) {
      setErrorMessage('El saldo inicial debe ser un numero valido')
      return
    }

    try {
      setIsSaving(true)

      const payload = {
        name: form.name.trim(),
        type: form.type,
        initialBalance: parsedInitialBalance,
        notes: form.notes.trim() || null,
      }

      const savedAccount = accountToEdit
        ? await updateFinancialAccountRequest(token, accountToEdit.id, payload)
        : await createFinancialAccountRequest(token, payload)

      setFinancialAccounts((prev) =>
        sortFinancialAccounts(
          accountToEdit
            ? prev.map((account) =>
                account.id === savedAccount.id ? savedAccount : account
              )
            : [...prev, savedAccount]
        )
      )

      setSuccessMessage(
        accountToEdit
          ? 'Cuenta actualizada correctamente'
          : 'Cuenta creada correctamente'
      )
      resetFormState()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo guardar la cuenta')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!token || !accountToDelete) {
      return
    }

    try {
      setIsDeleting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const deletedAccountId = await deleteFinancialAccountRequest(
        token,
        accountToDelete.id
      )

      setFinancialAccounts((prev) =>
        prev.filter((account) => account.id !== deletedAccountId)
      )
      setSuccessMessage('Cuenta eliminada correctamente')
      setAccountToDelete(null)

      if (accountToEdit?.id === deletedAccountId) {
        resetFormState()
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo eliminar la cuenta')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cuentas</h1>
            <p className="text-slate-600">
              Separa tu liquidez por banco, efectivo, billeteras y otras fuentes
              reales de dinero.
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
            title={showForm ? 'Cerrar formulario' : 'Nueva cuenta'}
            aria-label={showForm ? 'Cerrar formulario' : 'Nueva cuenta'}
            className={primaryIconButtonClass}
          >
            {showForm ? (
              <CloseButtonIcon className="h-4 w-4" />
            ) : (
              <NewAccountButtonIcon className="h-4 w-4" />
            )}
          </button>
        </section>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="fixed bottom-4 right-4 z-50 w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-green-200 bg-black px-4 py-3 text-sm text-green-700 shadow-lg">
            {successMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Liquidez total"
            value={formatCurrency(dashboardSummary.trackedLiquidityTotal)}
            tone={
              dashboardSummary.trackedLiquidityTotal >= 0
                ? 'text-slate-800'
                : 'text-red-600'
            }
          />
          <StatCard
            label="Cuentas creadas"
            value={financialAccounts.length.toLocaleString('es-AR')}
            tone="text-sky-600"
          />
          <StatCard
            label="Movimientos sin cuenta"
            value={dashboardSummary.unassignedTrackedTransactionsCount.toLocaleString(
              'es-AR'
            )}
            tone="text-amber-600"
          />
          <StatCard
            label="Cuentas en negativo"
            value={dashboardSummary.negativeBalanceAccountsCount.toLocaleString(
              'es-AR'
            )}
            tone="text-red-600"
          />
        </section>

        {dashboardSummary.unassignedTrackedTransactionsCount > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Hay movimientos que afectan tu liquidez y todavia no tienen cuenta
              asignada.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Mientras eso exista, el saldo por cuenta puede no coincidir con tu
              liquidez total del dashboard.
            </p>
          </section>
        )}

        {showForm && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              {accountToEdit ? 'Editar cuenta' : 'Nueva cuenta'}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="financial-account-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Nombre
                </label>
                <input
                  id="financial-account-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: Cuenta sueldo, Efectivo, Mercado Pago"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="financial-account-type"
                  className="text-sm font-medium text-slate-700"
                >
                  Tipo
                </label>
                <select
                  id="financial-account-type"
                  name="type"
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as FinancialAccountType,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  {FINANCIAL_ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="financial-account-balance"
                  className="text-sm font-medium text-slate-700"
                >
                  Saldo inicial
                </label>
                <input
                  id="financial-account-balance"
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  value={form.initialBalance}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      initialBalance: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: 570000"
                />
                <p className="text-xs text-slate-500">
                  Usa este valor como punto de arranque real de la cuenta.
                </p>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="financial-account-notes"
                  className="text-sm font-medium text-slate-700"
                >
                  Nota
                </label>
                <textarea
                  id="financial-account-notes"
                  name="notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Opcional"
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
                  {isSaving ? 'Guardando...' : 'Guardar cuenta'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Mis cuentas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            El saldo actual se calcula como saldo inicial m&aacute;s ingresos y
            cobros, menos gastos, inversiones y pagos de deuda asignados.
          </p>

          {isLoadingFinancialAccounts ? (
            <div className="py-10 text-center text-slate-500">
              Cargando cuentas...
            </div>
          ) : financialAccounts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium text-slate-600">
                Todavia no creaste cuentas
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Empieza con tu cuenta bancaria principal, efectivo o billetera
                virtual para seguir mejor tu liquidez real.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {sortFinancialAccounts(financialAccounts).map((account) => {
                const summary = buildFinancialAccountSummary(account, transactions)

                return (
                  <article
                    key={account.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-800">
                            {account.name}
                          </h3>
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {getFinancialAccountTypeLabel(account.type)}
                          </span>
                        </div>

                        {account.notes && (
                          <p className="mt-2 text-sm text-slate-500">
                            {account.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(account)}
                          title="Editar cuenta"
                          aria-label="Editar cuenta"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          <EditButtonIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountToDelete(account)}
                          title="Eliminar cuenta"
                          aria-label="Eliminar cuenta"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          <DeleteButtonIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <StatCard
                        label="Saldo actual"
                        value={formatCurrency(summary.currentBalance)}
                        tone={
                          summary.currentBalance >= 0
                            ? 'text-slate-800'
                            : 'text-red-600'
                        }
                      />
                      <StatCard
                        label="Saldo inicial"
                        value={formatCurrency(account.initialBalance)}
                        tone="text-slate-800"
                      />
                      <StatCard
                        label="Ingresos asignados"
                        value={formatCurrency(summary.inflowTotal)}
                        tone="text-green-600"
                      />
                      <StatCard
                        label="Salidas asignadas"
                        value={formatCurrency(summary.outflowTotal)}
                        tone="text-red-600"
                      />
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-sm text-slate-600">
                        Variacion neta:{' '}
                        <span
                          className={`font-semibold ${
                            summary.netChange >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {summary.netChange >= 0 ? '+' : ''}
                          {formatCurrency(summary.netChange)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {summary.linkedTransactionsCount} movimiento(s)
                        vinculado(s) a esta cuenta.
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <Modal
          isOpen={Boolean(accountToDelete)}
          onClose={() => {
            if (isDeleting) {
              return
            }

            setAccountToDelete(null)
          }}
          title="Confirmar eliminacion"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              Seguro que quieres eliminar la cuenta{' '}
              <span className="font-semibold">
                {accountToDelete?.name ?? ''}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
