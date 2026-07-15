import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import {
  CloseButtonIcon,
  DeleteButtonIcon,
  EditButtonIcon,
  RegisterCollectionButtonIcon,
  RegisterPaymentButtonIcon,
  ViewButtonIcon,
  NotViewButtonIcon,
  CloseDebtButtonIcon, 
  NewDebtButtonIcon,
  NewAccountButtonIcon
} from '../assets/icons'
import { useAuth } from '../hooks/useAuth'
import type { FinancialAccount } from '../types/financialAccount'
import { getFinancialAccountTypeLabel } from '../types/financialAccount'
import {
  createObligationAccountRequest,
  createObligationPaymentRequest,
  createObligationRequest,
  deleteObligationAccountRequest,
  deleteObligationPaymentRequest,
  deleteObligationRequest,
  updateObligationRequest,
  updateObligationAccountRequest,
} from '../services/obligationAccountService'
import type { Transaction } from '../types/transaction'
import type {
  Obligation,
  ObligationAccount,
  ObligationAccountType,
} from '../types/obligationAccount'
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  type PaymentMethod,
} from '../types/transaction'
import {
  getObligationAccountTypeLabel,
  getObligationStatusLabel,
  OBLIGATION_ACCOUNT_TYPE_OPTIONS,
} from '../types/obligationAccount'
import {
  buildAccountFinancials,
  buildObligationDashboardSummary,
  buildObligationFinancials,
  buildPaymentActivityLabel,
  formatReferenceMonth,
  getObligationAccountTone,
  getObligationStatusTone,
  sortObligationAccounts,
} from '../utils/obligationAccount'
import { sortFinancialAccounts } from '../utils/financialAccount'
import { getPaymentMethodTone } from '../utils/transactionMetrics'


interface AccountFormState {
  name: string
  type: ObligationAccountType
  creditLimit: string
  closingDay: string
  dueDay: string
  loanTotalAmount: string
  installmentCount: string
  loanFirstDueDate: string
  notes: string
}

interface ObligationFormState {
  title: string
  referenceMonth: string
  principalAmount: string
  interestAmount: string
  minimumPayment: string
  dueDate: string
  notes: string
}

interface PaymentFormState {
  amount: string
  paymentDate: string
  paymentMethod: PaymentMethod
  financialAccountId: string
  notes: string
}

interface TarjetasPrestamosPageProps {
  financialAccounts: FinancialAccount[]
  obligationAccounts: ObligationAccount[]
  setObligationAccounts: Dispatch<SetStateAction<ObligationAccount[]>>
  isLoadingObligationAccounts: boolean
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}

interface DeleteTarget {
  kind: 'account' | 'obligation' | 'payment'
  id: string
  label: string
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  })}`
}

function getLocalDateInputValue(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const day = String(referenceDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentMonthKey(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function supportsInstallmentPlan(type: ObligationAccountType) {
  return (
    type === 'credit_card' ||
    type === 'loan_payable' ||
    type === 'loan_receivable'
  )
}

function requiresInstallmentPlan(type: ObligationAccountType) {
  return type === 'loan_payable' || type === 'loan_receivable'
}

function createInitialAccountForm(): AccountFormState {
  return {
    name: '',
    type: 'credit_card',
    creditLimit: '',
    closingDay: '',
    dueDay: '',
    loanTotalAmount: '',
    installmentCount: '',
    loanFirstDueDate: getLocalDateInputValue(),
    notes: '',
  }
}

function createInitialObligationForm(initialDueDate = getLocalDateInputValue()): ObligationFormState {
  return {
    title: '',
    referenceMonth: initialDueDate.slice(0, 7),
    principalAmount: '',
    interestAmount: '',
    minimumPayment: '',
    dueDate: initialDueDate,
    notes: '',
  }
}

function createInitialPaymentForm(): PaymentFormState {
  return {
    amount: '',
    paymentDate: getLocalDateInputValue(),
    paymentMethod: 'not_specified',
    financialAccountId: '',
    notes: '',
  }
}

function buildAccountPayload(form: AccountFormState) {
  return {
    name: form.name.trim(),
    type: form.type,
    creditLimit:
      form.type === 'credit_card' && form.creditLimit.trim()
        ? Number(form.creditLimit)
        : null,
    closingDay:
      form.type === 'credit_card' && form.closingDay.trim()
        ? Number(form.closingDay)
        : null,
    dueDay:
      form.type === 'credit_card' && form.dueDay.trim()
        ? Number(form.dueDay)
        : null,
    loanTotalAmount:
      supportsInstallmentPlan(form.type) && form.loanTotalAmount.trim()
        ? Number(form.loanTotalAmount)
        : null,
    installmentCount:
      supportsInstallmentPlan(form.type) && form.installmentCount.trim()
        ? Number(form.installmentCount)
        : null,
    loanFirstDueDate:
      supportsInstallmentPlan(form.type) && form.loanFirstDueDate.trim()
        ? form.loanFirstDueDate
        : null,
    notes: form.notes.trim() || null,
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

function replaceTransactionItem(
  items: Transaction[],
  nextTransaction: Transaction
) {
  const hasExistingTransaction = items.some(
    (item) => item.id === nextTransaction.id
  )

  return [...(hasExistingTransaction
    ? items.map((item) =>
        item.id === nextTransaction.id ? nextTransaction : item
      )
    : [nextTransaction, ...items])].sort(
    (transactionA, transactionB) =>
      new Date(transactionB.date).getTime() -
      new Date(transactionA.date).getTime()
  )
}

function getPaidLabel(type: ObligationAccountType) {
  return type === 'loan_receivable' ? 'Cobrado' : 'Abonado'
}

function getPaymentActionLabel(type: ObligationAccountType) {
  return type === 'loan_receivable' ? 'Registrar cobro' : 'Registrar abono'
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

const dangerIconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50'

const primaryIconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'

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
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

export default function TarjetasPrestamosPage({
  financialAccounts,
  obligationAccounts,
  setObligationAccounts,
  isLoadingObligationAccounts,
  setTransactions,
}: TarjetasPrestamosPageProps) {
  const { token } = useAuth()

  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountForm, setAccountForm] = useState<AccountFormState>(
    createInitialAccountForm()
  )
  const [accountToEdit, setAccountToEdit] = useState<ObligationAccount | null>(
    null
  )
  const [obligationFormAccountId, setObligationFormAccountId] = useState<
    string | null
  >(null)
  const [obligationToEdit, setObligationToEdit] = useState<Obligation | null>(
    null
  )
  const [obligationForm, setObligationForm] = useState<ObligationFormState>(
    createInitialObligationForm()
  )
  const [paymentFormObligationId, setPaymentFormObligationId] = useState<
    string | null
  >(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(
    createInitialPaymentForm()
  )
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [activeObligationAccountId, setActiveObligationAccountId] = useState<
    string | null
  >(null)
  const [activePaymentObligationId, setActivePaymentObligationId] = useState<
    string | null
  >(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [collapsedAccountIds, setCollapsedAccountIds] = useState<string[]>([])

  const dashboardSummary = useMemo(
    () => buildObligationDashboardSummary(obligationAccounts),
    [obligationAccounts]
  )
  const financialAccountOptions = useMemo(
    () => sortFinancialAccounts(financialAccounts),
    [financialAccounts]
  )
  const canEditAccountType =
    !accountToEdit || accountToEdit.obligations.length === 0
  const isAccountExpanded = (accountId: string) =>
    !collapsedAccountIds.includes(accountId)

  const clearFeedback = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

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

  const resetAccountForm = () => {
    setAccountForm(createInitialAccountForm())
    setAccountToEdit(null)
    setShowAccountForm(false)
  }

  const resetObligationForm = () => {
    setObligationForm(createInitialObligationForm())
    setObligationFormAccountId(null)
    setObligationToEdit(null)
  }

  const resetPaymentForm = () => {
    setPaymentForm(createInitialPaymentForm())
    setPaymentFormObligationId(null)
  }

  const handleAccountInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target

    setAccountForm((prev) => {
      if (name === 'type') {
        const nextType = value as ObligationAccountType

        return {
          ...prev,
          type: nextType,
          creditLimit: nextType === 'credit_card' ? prev.creditLimit : '',
          closingDay: nextType === 'credit_card' ? prev.closingDay : '',
          dueDay: nextType === 'credit_card' ? prev.dueDay : '',
          loanTotalAmount: supportsInstallmentPlan(nextType)
            ? prev.loanTotalAmount
            : '',
          installmentCount: supportsInstallmentPlan(nextType)
            ? prev.installmentCount
            : '',
          loanFirstDueDate: supportsInstallmentPlan(nextType)
            ? prev.loanFirstDueDate
            : getLocalDateInputValue(),
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const handleObligationInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target

    setObligationForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePaymentInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setPaymentForm((prev) => {
      if (name === 'paymentMethod') {
        const nextPaymentMethod = value as PaymentMethod

        return {
          ...prev,
          paymentMethod: nextPaymentMethod,
          financialAccountId:
            nextPaymentMethod === 'cash' || nextPaymentMethod === 'bank'
              ? prev.financialAccountId
              : '',
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const openEditAccountForm = (account: ObligationAccount) => {
    clearFeedback()
    setAccountToEdit(account)
    setAccountForm({
      name: account.name,
      type: account.type,
      creditLimit: account.creditLimit ? String(account.creditLimit) : '',
      closingDay: account.closingDay ? String(account.closingDay) : '',
      dueDay: account.dueDay ? String(account.dueDay) : '',
      loanTotalAmount: account.loanTotalAmount
        ? String(account.loanTotalAmount)
        : '',
      installmentCount: account.installmentCount
        ? String(account.installmentCount)
        : '',
      loanFirstDueDate: account.loanFirstDueDate
        ? account.loanFirstDueDate.slice(0, 10)
        : getLocalDateInputValue(),
      notes: account.notes ?? '',
    })
    setShowAccountForm(true)
  }

  const openEditObligationForm = (
    accountId: string,
    obligation: Obligation
  ) => {
    clearFeedback()
    setObligationFormAccountId(accountId)
    setObligationToEdit(obligation)
    setObligationForm({
      title: obligation.title,
      referenceMonth: obligation.referenceMonth ?? getCurrentMonthKey(),
      principalAmount: String(obligation.principalAmount),
      interestAmount: obligation.interestAmount
        ? String(obligation.interestAmount)
        : '',
      minimumPayment: obligation.minimumPayment
        ? String(obligation.minimumPayment)
        : '',
      dueDate: obligation.dueDate.slice(0, 10),
      notes: obligation.notes ?? '',
    })
  }

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (!accountForm.name.trim()) {
      setErrorMessage('Completa el nombre de la cuenta')
      return
    }

    if (
      requiresInstallmentPlan(accountForm.type) &&
      (!accountForm.loanTotalAmount.trim() ||
        !accountForm.installmentCount.trim() ||
        !accountForm.loanFirstDueDate.trim())
    ) {
      setErrorMessage(
        'Completa el monto total, la cantidad de cuotas y la fecha de la primera cuota para el prestamo'
      )
      return
    }

    if (
      accountForm.type === 'credit_card' &&
      (accountForm.loanTotalAmount.trim() ||
        accountForm.installmentCount.trim() ||
        accountForm.loanFirstDueDate.trim() !== getLocalDateInputValue()) &&
      (!accountForm.loanTotalAmount.trim() ||
        !accountForm.installmentCount.trim() ||
        !accountForm.loanFirstDueDate.trim())
    ) {
      setErrorMessage(
        'Si esta tarjeta representa una compra financiada, completa monto total, cuotas y fecha de la primera cuota'
      )
      return
    }

    try {
      setIsSavingAccount(true)

      const payload = buildAccountPayload(accountForm)
      const savedAccount = accountToEdit
        ? await updateObligationAccountRequest(token, accountToEdit.id, payload)
        : await createObligationAccountRequest(token, payload)

      setObligationAccounts((prev) => replaceAccountItem(prev, savedAccount))
      setSuccessMessage(
        accountToEdit
          ? 'Cuenta actualizada correctamente'
          : 'Cuenta creada correctamente'
      )
      resetAccountForm()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage(
          accountToEdit
            ? 'No se pudo actualizar la cuenta'
            : 'No se pudo crear la cuenta'
        )
      }
    } finally {
      setIsSavingAccount(false)
    }
  }

  const handleCreateObligation = async (
    event: FormEvent<HTMLFormElement>,
    accountId: string
  ) => {
    event.preventDefault()
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (
      !obligationForm.title.trim() ||
      !obligationForm.principalAmount.trim() ||
      !obligationForm.dueDate.trim()
    ) {
      setErrorMessage('Completa titulo, monto principal y vencimiento')
      return
    }

    try {
      setActiveObligationAccountId(accountId)

      const payload = {
        title: obligationForm.title.trim(),
        referenceMonth: obligationForm.referenceMonth.trim() || null,
        principalAmount: Number(obligationForm.principalAmount),
        interestAmount: obligationForm.interestAmount.trim()
          ? Number(obligationForm.interestAmount)
          : 0,
        minimumPayment: obligationForm.minimumPayment.trim()
          ? Number(obligationForm.minimumPayment)
          : null,
        dueDate: obligationForm.dueDate,
        notes: obligationForm.notes.trim() || null,
      }
      const updatedAccount = obligationToEdit
        ? await updateObligationRequest(token, obligationToEdit.id, payload)
        : await createObligationRequest(token, accountId, payload)

      setObligationAccounts((prev) => replaceAccountItem(prev, updatedAccount))
      setSuccessMessage(
        obligationToEdit
          ? 'Obligacion actualizada correctamente'
          : 'Obligacion creada correctamente'
      )
      resetObligationForm()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage(
          obligationToEdit
            ? 'No se pudo actualizar la obligacion'
            : 'No se pudo crear la obligacion'
        )
      }
    } finally {
      setActiveObligationAccountId(null)
    }
  }

  const handleCreatePayment = async (
    event: FormEvent<HTMLFormElement>,
    obligationId: string
  ) => {
    event.preventDefault()
    clearFeedback()

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (!paymentForm.amount.trim() || !paymentForm.paymentDate.trim()) {
      setErrorMessage('Completa monto y fecha del abono')
      return
    }

    if (paymentForm.paymentMethod === 'not_specified') {
      setErrorMessage('Selecciona con que medio registraste este movimiento')
      return
    }

    if (
      (paymentForm.paymentMethod === 'cash' ||
        paymentForm.paymentMethod === 'bank') &&
      financialAccountOptions.length > 0 &&
      !paymentForm.financialAccountId
    ) {
      setErrorMessage(
        'Selecciona la cuenta desde la que pagaste o en la que recibiste este movimiento'
      )
      return
    }

    try {
      setActivePaymentObligationId(obligationId)

      const { account: updatedAccount, linkedTransaction } =
        await createObligationPaymentRequest(
        token,
        obligationId,
        {
          amount: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod,
          financialAccountId:
            paymentForm.paymentMethod === 'cash' ||
            paymentForm.paymentMethod === 'bank'
              ? paymentForm.financialAccountId || null
              : null,
          notes: paymentForm.notes.trim() || null,
        }
      )

      setObligationAccounts((prev) => replaceAccountItem(prev, updatedAccount))
      if (linkedTransaction) {
        setTransactions((prev) => replaceTransactionItem(prev, linkedTransaction))
      }
      setSuccessMessage('Movimiento registrado correctamente')
      resetPaymentForm()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo registrar el movimiento')
      }
    } finally {
      setActivePaymentObligationId(null)
    }
  }

  const openDeleteModal = (target: DeleteTarget) => {
    setDeleteTarget(target)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
  }

  const toggleAccountAccordion = (accountId: string) => {
    setCollapsedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((currentId) => currentId !== accountId)
        : [...prev, accountId]
    )
  }

  const confirmDelete = async () => {
    if (!token || !deleteTarget) {
      return
    }

    try {
      setIsDeleting(true)
      clearFeedback()

        if (deleteTarget.kind === 'account') {
          const { deletedAccountId, deletedLinkedTransactionIds } =
            await deleteObligationAccountRequest(
            token,
            deleteTarget.id
          )

          setObligationAccounts((prev) =>
            prev.filter((account) => account.id !== deletedAccountId)
          )
          if (deletedLinkedTransactionIds.length > 0) {
            setTransactions((prev) =>
              prev.filter(
                (transaction) =>
                  !deletedLinkedTransactionIds.includes(transaction.id)
              )
            )
          }
          if (accountToEdit?.id === deletedAccountId) {
            resetAccountForm()
          }
          resetObligationForm()
          resetPaymentForm()
          setSuccessMessage('Cuenta eliminada correctamente')
      } else if (deleteTarget.kind === 'obligation') {
        const {
          account: updatedAccount,
          deletedLinkedTransactionIds,
        } = await deleteObligationRequest(token, deleteTarget.id)

        setObligationAccounts((prev) => replaceAccountItem(prev, updatedAccount))
        if (deletedLinkedTransactionIds.length > 0) {
          setTransactions((prev) =>
            prev.filter(
              (transaction) =>
                !deletedLinkedTransactionIds.includes(transaction.id)
            )
          )
        }

        if (paymentFormObligationId === deleteTarget.id) {
          resetPaymentForm()
        }
        if (obligationToEdit?.id === deleteTarget.id) {
          resetObligationForm()
        }

        setSuccessMessage('Obligacion eliminada correctamente')
      } else {
        const {
          account: updatedAccount,
          deletedLinkedTransactionIds,
        } = await deleteObligationPaymentRequest(
          token,
          deleteTarget.id
        )

        setObligationAccounts((prev) => replaceAccountItem(prev, updatedAccount))
        if (deletedLinkedTransactionIds.length > 0) {
          setTransactions((prev) =>
            prev.filter(
              (transaction) =>
                !deletedLinkedTransactionIds.includes(transaction.id)
            )
          )
        }
        setSuccessMessage('Abono eliminado correctamente')
      }

      closeDeleteModal()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('No se pudo completar la eliminacion')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const getDeleteMessage = () => {
    if (!deleteTarget) {
      return ''
    }

    if (deleteTarget.kind === 'account') {
      return `Se eliminara la cuenta "${deleteTarget.label}" junto con todas sus obligaciones, abonos y transacciones sincronizadas.`
    }

    if (deleteTarget.kind === 'obligation') {
      return `Se eliminara la obligacion "${deleteTarget.label}" junto con todos sus abonos y transacciones sincronizadas.`
    }

    return `Se eliminara el abono "${deleteTarget.label}" y tambien su transaccion sincronizada.`
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Tarjetas y Prestamos
              </h1>
              <p className="mt-2 text-slate-600">
                Lleva el control de resúmenes de tarjeta, préstamos por pagar y
                préstamos por cobrar sin mezclarlos con las transacciones reales.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                clearFeedback()

                if (showAccountForm) {
                  resetAccountForm()
                  return
                }

                setAccountForm(createInitialAccountForm())
                setAccountToEdit(null)
                setShowAccountForm(true)
              }}
              title={showAccountForm ? 'Cerrar formulario de cuenta' : 'Nueva cuenta'}
              aria-label={showAccountForm ? 'Cerrar formulario de cuenta' : 'Nueva cuenta'}
              className={primaryIconButtonClass}
            >
              {showAccountForm ? (
                <CloseDebtButtonIcon className="h-4 w-4" />
              ) : (
                <NewAccountButtonIcon className="h-4 w-4" />
              )}
            </button>
          </div>
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
            label="Tarjetas pendientes"
            value={formatCurrency(dashboardSummary.creditCardOutstandingTotal)}
            tone="text-violet-600"
          />
          <StatCard
            label="Prestamos por pagar"
            value={formatCurrency(dashboardSummary.loanPayableOutstandingTotal)}
            tone="text-red-600"
          />
          <StatCard
            label="Prestamos por cobrar"
            value={formatCurrency(dashboardSummary.loanReceivableOutstandingTotal)}
            tone="text-emerald-600"
          />
          <StatCard
            label="Obligaciones abiertas"
            value={dashboardSummary.openObligationsCount.toLocaleString('es-AR')}
            tone="text-slate-800"
          />
        </section>

        {showAccountForm && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              {accountToEdit ? 'Editar cuenta' : 'Crear nueva cuenta'}
            </h2>

            {accountToEdit && !canEditAccountType && (
              <p className="mt-2 text-sm text-amber-700">
                El tipo no puede cambiarse porque esta cuenta ya tiene obligaciones
                cargadas.
              </p>
            )}

            <form
              onSubmit={handleAccountSubmit}
              className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="account-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Nombre
                </label>
                <input
                  id="account-name"
                  name="name"
                  type="text"
                  value={accountForm.name}
                  onChange={handleAccountInputChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Ej: Visa Galicia"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="account-type"
                  className="text-sm font-medium text-slate-700"
                >
                  Tipo
                </label>
                <select
                  id="account-type"
                  name="type"
                  value={accountForm.type}
                  onChange={handleAccountInputChange}
                  disabled={!canEditAccountType}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  {OBLIGATION_ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {accountForm.type === 'credit_card' && (
                <>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="account-creditLimit"
                      className="text-sm font-medium text-slate-700"
                    >
                      Limite de credito
                    </label>
                    <input
                      id="account-creditLimit"
                      name="creditLimit"
                      type="number"
                      step="0.01"
                      value={accountForm.creditLimit}
                      onChange={handleAccountInputChange}
                      className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                      placeholder="Ej: 2500000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="account-closingDay"
                        className="text-sm font-medium text-slate-700"
                      >
                        Dia de cierre
                      </label>
                      <input
                        id="account-closingDay"
                        name="closingDay"
                        type="number"
                        value={accountForm.closingDay}
                        onChange={handleAccountInputChange}
                        className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        placeholder="10"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="account-dueDay"
                        className="text-sm font-medium text-slate-700"
                      >
                        Dia de vencimiento
                      </label>
                      <input
                        id="account-dueDay"
                        name="dueDay"
                        type="number"
                        value={accountForm.dueDay}
                        onChange={handleAccountInputChange}
                        className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        placeholder="13"
                      />
                    </div>
                  </div>
                </>
              )}

              {supportsInstallmentPlan(accountForm.type) && (
                <>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="account-loanTotalAmount"
                      className="text-sm font-medium text-slate-700"
                    >
                      {accountForm.type === 'credit_card'
                        ? 'Monto total financiado'
                        : 'Monto total del prestamo'}
                    </label>
                    <input
                      id="account-loanTotalAmount"
                      name="loanTotalAmount"
                      type="number"
                      step="0.01"
                      value={accountForm.loanTotalAmount}
                      onChange={handleAccountInputChange}
                      className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                      placeholder="Ej: 1200000"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="account-installmentCount"
                      className="text-sm font-medium text-slate-700"
                    >
                      Cantidad de cuotas
                    </label>
                    <input
                      id="account-installmentCount"
                      name="installmentCount"
                      type="number"
                      value={accountForm.installmentCount}
                      onChange={handleAccountInputChange}
                      className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                      placeholder="Ej: 12"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label
                      htmlFor="account-loanFirstDueDate"
                      className="text-sm font-medium text-slate-700"
                    >
                      Fecha de la primera cuota
                    </label>
                    <input
                      id="account-loanFirstDueDate"
                      name="loanFirstDueDate"
                      type="date"
                      value={accountForm.loanFirstDueDate}
                      onChange={handleAccountInputChange}
                      className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                    />
                    <p className="text-xs text-slate-500">
                      {accountForm.type === 'credit_card'
                        ? 'Completa estos datos si esta cuenta representa una compra en cuotas. Se generaran las cuotas automaticamente y luego podras editarlas individualmente.'
                        : 'Las obligaciones se generaran mes a mes a partir de esta fecha y luego podras editarlas individualmente.'}
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="account-notes"
                  className="text-sm font-medium text-slate-700"
                >
                  Notas
                </label>
                <textarea
                  id="account-notes"
                  name="notes"
                  value={accountForm.notes}
                  onChange={handleAccountInputChange}
                  className="min-h-24 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                  placeholder="Opcional"
                />
              </div>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={resetAccountForm}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAccount
                    ? 'Guardando...'
                    : accountToEdit
                      ? 'Guardar cambios'
                      : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </section>
        )}

        {isLoadingObligationAccounts ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              Cargando tarjetas y prestamos...
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Estamos armando el estado de tus obligaciones.
            </p>
          </section>
        ) : obligationAccounts.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              Todavia no tienes cuentas cargadas
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Crea una tarjeta o un prestamo para empezar a seguir saldos y abonos.
            </p>
          </section>
        ) : (
          obligationAccounts.map((account) => {
            const accountFinancials = buildAccountFinancials(account)
            const isExpanded = isAccountExpanded(account.id)

            return (
              <section
                key={account.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-slate-800">
                        {account.name}
                      </h2>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getObligationAccountTone(account.type)}`}
                      >
                        {getObligationAccountTypeLabel(account.type)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500 max-w-[900px]">
                      {account.type === 'credit_card' && account.creditLimit && (
                        <span>Limite: {formatCurrency(account.creditLimit)}</span>
                      )}
                      {account.type === 'credit_card' && account.closingDay && (
                        <span>Cierre: dia {account.closingDay}</span>
                      )}
                      {account.type === 'credit_card' && account.dueDay && (
                        <span>Vence: dia {account.dueDay}</span>
                      )}
                      {account.loanTotalAmount && (
                          <span>
                            {account.type === 'credit_card'
                              ? 'Monto financiado: '
                              : 'Monto total: '}
                            {formatCurrency(account.loanTotalAmount)}
                          </span>
                        )}
                      {account.installmentCount && (
                          <span>
                            Cuotas pactadas: {account.installmentCount}
                          </span>
                        )}
                      {account.loanFirstDueDate && (
                          <span>
                            Primera cuota: {account.loanFirstDueDate.slice(0, 10)}
                          </span>
                        )}
                      {account.loanTotalAmount &&
                        account.installmentCount && (
                          <span>
                            Valor promedio por cuota:{' '}
                            {formatCurrency(
                              account.loanTotalAmount / account.installmentCount
                            )}
                          </span>
                        )}
                    </div>

                    {account.notes && (
                      <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        {account.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => toggleAccountAccordion(account.id)}
                      title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                      aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                      className={iconButtonClass}
                    >
                      <span className="relative inline-flex h-5 w-5 items-center justify-center">
                        {isExpanded ? (
                          <ViewButtonIcon className="h-4 w-4" />
                        ) : (
                          <NotViewButtonIcon className="h-4 w-4" />
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditAccountForm(account)}
                      title="Editar cuenta"
                      aria-label="Editar cuenta"
                      className={iconButtonClass}
                    >
                      <EditButtonIcon className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        clearFeedback()

                        if (obligationFormAccountId === account.id) {
                          resetObligationForm()
                          return
                        }

                        setObligationFormAccountId(account.id)
                        setObligationToEdit(null)
                        setObligationForm(
                          createInitialObligationForm(
                            account.loanFirstDueDate?.slice(0, 10)
                          )
                        )
                      }}
                      disabled={!isExpanded}
                      title={
                        !isExpanded
                          ? 'Abre el detalle para crear una obligacion'
                          : obligationFormAccountId === account.id
                            ? 'Cerrar formulario de obligacion'
                            : 'Nueva obligacion'
                      }
                      aria-label={
                        !isExpanded
                          ? 'Abre el detalle para crear una obligacion'
                          : obligationFormAccountId === account.id
                            ? 'Cerrar formulario de obligacion'
                            : 'Nueva obligacion'
                      }
                      className={iconButtonClass}
                    >
                      {obligationFormAccountId === account.id ? (
                        <CloseDebtButtonIcon className="h-4 w-4" />
                      ) : (
                        <NewDebtButtonIcon className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openDeleteModal({
                          kind: 'account',
                          id: account.id,
                          label: account.name,
                        })
                      }
                      title="Eliminar cuenta"
                      aria-label="Eliminar cuenta"
                      className={dangerIconButtonClass}
                    >
                      <DeleteButtonIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className={isExpanded ? 'block' : 'hidden'}>
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total comprometido"
                    value={formatCurrency(accountFinancials.totalAmount)}
                    tone="text-slate-800"
                  />
                  <StatCard
                    label={getPaidLabel(account.type)}
                    value={formatCurrency(accountFinancials.paidAmount)}
                    tone={
                      account.type === 'loan_receivable'
                        ? 'text-emerald-600'
                        : 'text-sky-600'
                    }
                  />
                  <StatCard
                    label="Saldo pendiente"
                    value={formatCurrency(accountFinancials.remainingAmount)}
                    tone={
                      account.type === 'loan_receivable'
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }
                  />
                  <StatCard
                    label="Obligaciones abiertas"
                    value={accountFinancials.openObligationsCount.toLocaleString(
                      'es-AR'
                    )}
                    tone="text-violet-600"
                  />
                  </div>

                  {obligationFormAccountId === account.id && (
                  <div className="mt-6 rounded-2xl border border-slate-200 p-3">
                    <h3 className="text-base font-semibold text-slate-800">
                      {obligationToEdit
                        ? `Editar obligacion de ${account.name}`
                        : `Nueva obligacion para ${account.name}`}
                    </h3>

                    <form
                      onSubmit={(event) => handleCreateObligation(event, account.id)}
                      className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`obligation-title-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Titulo
                        </label>
                        <input
                          id={`obligation-title-${account.id}`}
                          name="title"
                          type="text"
                          value={obligationForm.title}
                          onChange={handleObligationInputChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder="Ej: Resumen junio 2026"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`obligation-referenceMonth-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Mes de referencia
                        </label>
                        <input
                          id={`obligation-referenceMonth-${account.id}`}
                          name="referenceMonth"
                          type="month"
                          value={obligationForm.referenceMonth}
                          onChange={handleObligationInputChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`obligation-principal-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Monto principal
                        </label>
                        <input
                          id={`obligation-principal-${account.id}`}
                          name="principalAmount"
                          type="number"
                          step="0.01"
                          value={obligationForm.principalAmount}
                          onChange={handleObligationInputChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder="Ej: 1510000"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`obligation-interest-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Intereses
                        </label>
                        <input
                          id={`obligation-interest-${account.id}`}
                          name="interestAmount"
                          type="number"
                          step="0.01"
                          value={obligationForm.interestAmount}
                          onChange={handleObligationInputChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder="Opcional"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`obligation-minimum-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Pago minimo
                        </label>
                        <input
                          id={`obligation-minimum-${account.id}`}
                          name="minimumPayment"
                          type="number"
                          step="0.01"
                          value={obligationForm.minimumPayment}
                          onChange={handleObligationInputChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder="Ej: 91970"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor={`obligation-dueDate-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Fecha de vencimiento
                        </label>
                        <input
                          id={`obligation-dueDate-${account.id}`}
                          name="dueDate"
                          type="date"
                          value={obligationForm.dueDate}
                          onChange={handleObligationInputChange}
                          className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                        />
                      </div>

                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label
                          htmlFor={`obligation-notes-${account.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Notas
                        </label>
                        <textarea
                          id={`obligation-notes-${account.id}`}
                          name="notes"
                          value={obligationForm.notes}
                          onChange={handleObligationInputChange}
                          className="min-h-24 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                          placeholder="Ej: Stop debit, pago minimo y saldo que se arrastra"
                        />
                      </div>

                      <div className="flex justify-end gap-3 md:col-span-2">
                        <button
                          type="button"
                          onClick={resetObligationForm}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={activeObligationAccountId === account.id}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeObligationAccountId === account.id
                            ? 'Guardando...'
                            : obligationToEdit
                              ? 'Guardar cambios'
                              : 'Guardar obligacion'}
                        </button>
                      </div>
                    </form>
                  </div>
                  )}

                  <div className="mt-6 flex flex-col gap-4">
                  {account.obligations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                      <p className="font-medium text-slate-600">
                        Esta cuenta todavia no tiene obligaciones
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Agrega resúmenes, cuotas o montos por cobrar para empezar.
                      </p>
                    </div>
                  ) : (
                    account.obligations.map((obligation: Obligation) => {
                      const obligationFinancials =
                        buildObligationFinancials(obligation)
                      const isPaymentFormOpen =
                        paymentFormObligationId === obligation.id
                      const paymentNeedsFinancialAccount =
                        paymentForm.paymentMethod === 'cash' ||
                        paymentForm.paymentMethod === 'bank'

                      return (
                        <article
                          key={obligation.id}
                          className="rounded-2xl border border-slate-200 p-3"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-lg font-semibold text-slate-800">
                                  {obligation.title}
                                </h3>
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getObligationStatusTone(obligation, account.type)}`}
                                >
                                  {getObligationStatusLabel(
                                    obligation.status,
                                    account.type
                                  )}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-500">
                                <span>Vence: {obligation.dueDate.slice(0, 10)}</span>
                                {obligation.referenceMonth && (
                                  <span>
                                    Referencia:{' '}
                                    {formatReferenceMonth(obligation.referenceMonth)}
                                  </span>
                                )}
                                {obligation.minimumPayment && (
                                  <span>
                                    Pago minimo:{' '}
                                    {formatCurrency(obligation.minimumPayment)}
                                  </span>
                                )}
                              </div>

                              {obligation.notes && (
                                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                                  {obligation.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditObligationForm(account.id, obligation)
                                }
                                title="Editar obligacion"
                                aria-label="Editar obligacion"
                                className={iconButtonClass}
                              >
                                <EditButtonIcon className="h-4 w-4" />
                              </button>

                              {obligationFinancials.remainingAmount > 0.01 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearFeedback()

                                    if (paymentFormObligationId === obligation.id) {
                                      resetPaymentForm()
                                      return
                                    }

                                    setPaymentFormObligationId(obligation.id)
                                    setPaymentForm(createInitialPaymentForm())
                                  }}
                                  title={
                                    isPaymentFormOpen
                                      ? 'Cerrar movimiento'
                                      : getPaymentActionLabel(account.type)
                                  }
                                  aria-label={
                                    isPaymentFormOpen
                                      ? 'Cerrar movimiento'
                                      : getPaymentActionLabel(account.type)
                                  }
                                  className={iconButtonClass}
                                >
                                  {isPaymentFormOpen
                                    ? <CloseButtonIcon className="h-4 w-4" />
                                    : account.type === 'loan_receivable'
                                      ? <RegisterCollectionButtonIcon className="h-4 w-4" />
                                      : <RegisterPaymentButtonIcon className="h-4 w-4" />}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  openDeleteModal({
                                    kind: 'obligation',
                                    id: obligation.id,
                                    label: obligation.title,
                                  })
                                }
                                title="Eliminar obligacion"
                                aria-label="Eliminar obligacion"
                                className={dangerIconButtonClass}
                              >
                                <DeleteButtonIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                              label="Total"
                              value={formatCurrency(obligationFinancials.totalAmount)}
                              tone="text-slate-800"
                            />
                            <StatCard
                              label={getPaidLabel(account.type)}
                              value={formatCurrency(obligationFinancials.paidAmount)}
                              tone={
                                account.type === 'loan_receivable'
                                  ? 'text-emerald-600'
                                  : 'text-sky-600'
                              }
                            />
                            <StatCard
                              label="Saldo pendiente"
                              value={formatCurrency(
                                obligationFinancials.remainingAmount
                              )}
                              tone={
                                account.type === 'loan_receivable'
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }
                            />
                            <StatCard
                              label="Intereses"
                              value={formatCurrency(obligation.interestAmount)}
                              tone="text-violet-600"
                            />
                          </div>

                          {isPaymentFormOpen && (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-2">
                              <h4 className="text-base font-semibold text-slate-800">
                                {getPaymentActionLabel(account.type)}
                              </h4>

                              <form
                                onSubmit={(event) =>
                                  handleCreatePayment(event, obligation.id)
                                }
                                className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"
                              >
                                <div className="flex flex-col gap-2">
                                  <label
                                    htmlFor={`payment-amount-${obligation.id}`}
                                    className="text-sm font-medium text-slate-700"
                                  >
                                    Monto
                                  </label>
                                  <input
                                    id={`payment-amount-${obligation.id}`}
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={handlePaymentInputChange}
                                    className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                                    placeholder="Ej: 100000"
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label
                                    htmlFor={`payment-date-${obligation.id}`}
                                    className="text-sm font-medium text-slate-700"
                                  >
                                    Fecha
                                  </label>
                                  <input
                                    id={`payment-date-${obligation.id}`}
                                    name="paymentDate"
                                    type="date"
                                    value={paymentForm.paymentDate}
                                    onChange={handlePaymentInputChange}
                                    className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label
                                    htmlFor={`payment-method-${obligation.id}`}
                                    className="text-sm font-medium text-slate-700"
                                  >
                                    {account.type === 'loan_receivable'
                                      ? 'Medio de cobro'
                                      : 'Medio de pago'}
                                  </label>
                                  <select
                                    id={`payment-method-${obligation.id}`}
                                    name="paymentMethod"
                                    value={paymentForm.paymentMethod}
                                    onChange={handlePaymentInputChange}
                                    className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                                  >
                                    <option value="not_specified">
                                      Selecciona un medio
                                    </option>
                                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {paymentNeedsFinancialAccount && (
                                  <div className="flex flex-col gap-2 md:col-span-3">
                                    <label
                                      htmlFor={`payment-account-${obligation.id}`}
                                      className="text-sm font-medium text-slate-700"
                                    >
                                      {account.type === 'loan_receivable'
                                        ? 'Cuenta de destino'
                                        : 'Cuenta desde la que pagaste'}
                                    </label>
                                    <select
                                      id={`payment-account-${obligation.id}`}
                                      name="financialAccountId"
                                      value={paymentForm.financialAccountId}
                                      onChange={handlePaymentInputChange}
                                      className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                                    >
                                      <option value="">
                                        {financialAccountOptions.length === 0
                                          ? 'Primero crea una cuenta'
                                          : 'Selecciona una cuenta'}
                                      </option>
                                      {financialAccountOptions.map((financialAccount) => (
                                        <option
                                          key={financialAccount.id}
                                          value={financialAccount.id}
                                        >
                                          {financialAccount.name} ·{' '}
                                          {getFinancialAccountTypeLabel(
                                            financialAccount.type
                                          )}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-xs text-slate-500">
                                      {financialAccountOptions.length === 0
                                        ? 'Crea una cuenta desde el modulo Cuentas para reflejar este movimiento en tu liquidez.'
                                        : account.type === 'loan_receivable'
                                          ? 'La cuenta seleccionada aumentara su saldo con este cobro.'
                                          : 'La cuenta seleccionada reducira su saldo con este abono.'}
                                    </p>
                                  </div>
                                )}

                                <div className="flex flex-col gap-2 md:col-span-3">
                                  <label
                                    htmlFor={`payment-notes-${obligation.id}`}
                                    className="text-sm font-medium text-slate-700"
                                  >
                                    Nota
                                  </label>
                                  <textarea
                                    id={`payment-notes-${obligation.id}`}
                                    name="notes"
                                    value={paymentForm.notes}
                                    onChange={handlePaymentInputChange}
                                    className="min-h-20 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                                    placeholder="Opcional"
                                  />
                                </div>

                                <div className="flex justify-end gap-3 md:col-span-3">
                                  <button
                                    type="button"
                                    onClick={resetPaymentForm}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={
                                      activePaymentObligationId === obligation.id
                                    }
                                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {activePaymentObligationId === obligation.id
                                      ? 'Guardando...'
                                      : account.type === 'loan_receivable'
                                        ? 'Guardar cobro'
                                        : 'Guardar abono'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          <div className="mt-3 rounded-2xl bg-slate-50 p-2">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                              Historial
                            </h4>

                            {obligation.payments.length === 0 ? (
                              <p className="mt-3 text-sm text-slate-500">
                                Todavia no hay movimientos registrados para esta obligacion.
                              </p>
                            ) : (
                              <div className="mt-2 flex flex-col gap-3">
                                {obligation.payments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex flex-col gap-3 rounded-2xl bg-white p-2 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div>
                                      <p className="font-medium text-slate-800">
                                        {formatCurrency(payment.amount)}
                                      </p>
                                      <div className="mt-1">
                                        <span
                                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentMethodTone(payment.paymentMethod)}`}
                                        >
                                          {getPaymentMethodLabel(payment.paymentMethod)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-500">
                                        {buildPaymentActivityLabel(
                                          account.type,
                                          payment
                                        )}
                                      </p>
                                      {(payment.financialAccount ??
                                        payment.linkedTransactions?.[0]?.financialAccount) && (
                                        <div className="mt-2">
                                          <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
                                            {(payment.financialAccount ??
                                              payment.linkedTransactions?.[0]?.financialAccount)?.name}
                                          </span>
                                        </div>
                                      )}
                                      {payment.notes && (
                                        <p className="mt-1 text-sm text-slate-500">
                                          {payment.notes}
                                        </p>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDeleteModal({
                                          kind: 'payment',
                                          id: payment.id,
                                          label: payment.paymentDate.slice(0, 10),
                                        })
                                      }
                                      title="Eliminar abono"
                                      aria-label="Eliminar abono"
                                      className={dangerIconButtonClass}
                                    >
                                      <DeleteButtonIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
                </div>
              </section>
            )
          })
        )}

        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={closeDeleteModal}
          title="Confirmar eliminacion"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">{getDeleteMessage()}</p>

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
