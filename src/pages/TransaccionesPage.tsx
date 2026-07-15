import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/layout/Modal'
import {
  ClearFilterButtonIcon,
  DeleteButtonIcon,
  EditButtonIcon,
  FilterButtonIcon,
} from '../assets/icons'
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
  getTransactionsRequest,
  updateTransactionRequest,
} from '../services/transactionService'
import { getObligationAccountsRequest } from '../services/obligationAccountService'
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

interface TransactionFilters {
  category: string
  type: TransactionType | 'all'
  paymentMethod: PaymentMethod | 'all'
  reimbursementStatus: ReimbursementStatus | 'all'
}

interface BulkEditForm {
  type: TransactionType | 'keep'
  category: string
  paymentMethod: PaymentMethod | 'keep'
  date: string
}

type TransactionSortKey = 'type' | 'paymentMethod' | 'reimbursementStatus' | 'date'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 10

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

function createInitialFilters(): TransactionFilters {
  return {
    category: '',
    type: 'all',
    paymentMethod: 'all',
    reimbursementStatus: 'all',
  }
}

function createInitialBulkEditForm(): BulkEditForm {
  return {
    type: 'keep',
    category: '',
    paymentMethod: 'keep',
    date: '',
  }
}

function compareText(leftValue: string, rightValue: string) {
  return leftValue.localeCompare(rightValue, 'es', {
    sensitivity: 'base',
  })
}

function matchesTransactionFilters(
  transaction: Transaction,
  filters: TransactionFilters
) {
  if (filters.category && transaction.category !== filters.category) {
    return false
  }

  if (filters.type !== 'all' && transaction.type !== filters.type) {
    return false
  }

  if (
    filters.paymentMethod !== 'all' &&
    transaction.paymentMethod !== filters.paymentMethod
  ) {
    return false
  }

  if (
    filters.reimbursementStatus !== 'all' &&
    transaction.reimbursementStatus !== filters.reimbursementStatus
  ) {
    return false
  }

  return true
}

function sortTransactionsForTable(
  items: Transaction[],
  sortKey: TransactionSortKey,
  sortDirection: SortDirection
) {
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1

  return [...items].sort((leftItem, rightItem) => {
    switch (sortKey) {
      case 'type':
        return (
          compareText(
            getTransactionDisplayLabel(leftItem),
            getTransactionDisplayLabel(rightItem)
          ) * directionMultiplier
        )
      case 'paymentMethod':
        return (
          compareText(
            getPaymentMethodLabel(leftItem.paymentMethod),
            getPaymentMethodLabel(rightItem.paymentMethod)
          ) * directionMultiplier
        )
      case 'reimbursementStatus':
        return (
          compareText(
            getReimbursementStatusLabel(leftItem.reimbursementStatus),
            getReimbursementStatusLabel(rightItem.reimbursementStatus)
          ) * directionMultiplier
        )
      default: {
        const leftDate = new Date(leftItem.date).getTime()
        const rightDate = new Date(rightItem.date).getTime()

        if (leftDate === rightDate) {
          return compareText(leftItem.description, rightItem.description)
        }

        return (leftDate - rightDate) * directionMultiplier
      }
    }
  })
}

function buildVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (currentPage >= totalPages - 2) {
    return [
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ]
}

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean
  direction: SortDirection
}) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 ${
        isActive ? 'text-slate-700' : 'text-slate-400'
      }`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 2 3.5 5h5L6 2Z"
        fill="currentColor"
        opacity={!isActive || direction === 'desc' ? '0.35' : '1'}
      />
      <path
        d="M6 10 8.5 7h-5L6 10Z"
        fill="currentColor"
        opacity={!isActive || direction === 'asc' ? '0.35' : '1'}
      />
    </svg>
  )
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

function isLinkedTransaction(transaction: Transaction) {
  return Boolean(
    transaction.linkedObligationAccountId || transaction.linkedObligationPaymentId
  )
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>(createInitialFilters())
  const [sortKey, setSortKey] = useState<TransactionSortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>(
    []
  )
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false)
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)
  const [bulkEditForm, setBulkEditForm] = useState<BulkEditForm>(
    createInitialBulkEditForm()
  )
  const currentPageCheckboxRef = useRef<HTMLInputElement | null>(null)

  const isExpense = form.type === 'expense'
  const isIncome = form.type === 'income'
  const isReimbursable = form.reimbursementStatus !== 'not_applicable'
  const isFinancingPaymentMethod =
    form.paymentMethod === 'credit' || form.paymentMethod === 'loan'
  const canLinkToObligationAccount =
    isIncome || (isExpense && isFinancingPaymentMethod)

  const refreshTransactions = async () => {
    if (!token) {
      return
    }

    const nextTransactions = await getTransactionsRequest(token)
    setTransactions(nextTransactions)
  }

  const refreshTransactionsAndAccounts = async () => {
    if (!token) {
      return
    }

    const [nextTransactions, nextAccounts] = await Promise.all([
      getTransactionsRequest(token),
      getObligationAccountsRequest(token),
    ])

    setTransactions(nextTransactions)
    setObligationAccounts(sortObligationAccounts(nextAccounts))
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [
    filters.category,
    filters.type,
    filters.paymentMethod,
    filters.reimbursementStatus,
    sortKey,
    sortDirection,
  ])

  useEffect(() => {
    const validTransactionIds = new Set(transactions.map((transaction) => transaction.id))

    setSelectedTransactionIds((prev) =>
      prev.filter((transactionId) => validTransactionIds.has(transactionId))
    )
  }, [transactions])

  useEffect(() => {
    const filteredTransactionIds = new Set(
      transactions
        .filter((transaction) => matchesTransactionFilters(transaction, filters))
        .map((transaction) => transaction.id)
    )

    setSelectedTransactionIds((prev) => {
      const nextSelectedTransactionIds = prev.filter((transactionId) =>
        filteredTransactionIds.has(transactionId)
      )

      return nextSelectedTransactionIds.length === prev.length
        ? prev
        : nextSelectedTransactionIds
    })
  }, [
    transactions,
    filters.category,
    filters.type,
    filters.paymentMethod,
    filters.reimbursementStatus,
  ])

  useEffect(() => {
    if (selectedTransactionIds.length === 0) {
      setIsBulkActionsOpen(false)
    }
  }, [selectedTransactionIds])

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

  const handleBulkEditChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setBulkEditForm((prev) => {
      if (name === 'type') {
        const nextType = value as BulkEditForm['type']

        return {
          ...prev,
          type: nextType,
          category: '',
          paymentMethod:
            nextType === 'expense' || nextType === 'keep'
              ? prev.paymentMethod
              : 'keep',
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds((prev) =>
      prev.includes(transactionId)
        ? prev.filter((selectedId) => selectedId !== transactionId)
        : [...prev, transactionId]
    )
  }

  const toggleCurrentPageSelection = () => {
    const pageTransactionIds = paginatedTransactions.map(
      (transaction) => transaction.id
    )

    if (pageTransactionIds.length === 0) {
      return
    }

    setSelectedTransactionIds((prev) => {
      const areAllVisibleSelected = pageTransactionIds.every((transactionId) =>
        prev.includes(transactionId)
      )

      if (areAllVisibleSelected) {
        return prev.filter(
          (transactionId) => !pageTransactionIds.includes(transactionId)
        )
      }

      const nextSelectedIds = new Set(prev)
      pageTransactionIds.forEach((transactionId) => {
        nextSelectedIds.add(transactionId)
      })

      return Array.from(nextSelectedIds)
    })
  }

  const selectAllFilteredTransactions = () => {
    setSelectedTransactionIds(
      sortedTransactions.map((transaction) => transaction.id)
    )
  }

  const resetFormState = () => {
    setForm(createInitialForm())
    setTransactionToEdit(null)
    setShowForm(false)
  }

  const resetBulkEditState = () => {
    setBulkEditForm(createInitialBulkEditForm())
    setIsBulkEditModalOpen(false)
  }

  const clearSelection = () => {
    setSelectedTransactionIds([])
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

  const openBulkEditModal = () => {
    if (selectedTransactions.length === 0) {
      setErrorMessage('Selecciona al menos una transaccion para editar en lote')
      return
    }

    if (selectedTransactions.some(isLinkedTransaction)) {
      setErrorMessage(
        'Las transacciones vinculadas a Tarjetas y Prestamos no se pueden editar en lote. Desmarcalas o editalas desde ese modulo.'
      )
      return
    }

    setErrorMessage('')
    setBulkEditForm(createInitialBulkEditForm())
    setIsBulkActionsOpen(false)
    setIsBulkEditModalOpen(true)
  }

  const openBulkDeleteModal = () => {
    if (selectedTransactions.length === 0) {
      setErrorMessage('Selecciona al menos una transaccion para eliminar')
      return
    }

    setErrorMessage('')
    setIsBulkActionsOpen(false)
    setIsBulkDeleteModalOpen(true)
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

  const handleFilterChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setFilters((prev) => {
      if (name === 'type') {
        const nextType = value as TransactionFilters['type']
        const canKeepCategory =
          !prev.category ||
          categories.some(
            (category) =>
              category.name === prev.category &&
              (nextType === 'all' || category.type === nextType)
          )

        return {
          ...prev,
          type: nextType,
          category: canKeepCategory ? prev.category : '',
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const clearFilters = () => {
    setFilters(createInitialFilters())
  }

  const handleSort = (nextSortKey: TransactionSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection(nextSortKey === 'date' ? 'desc' : 'asc')
  }

  const confirmDelete = async () => {
    if (!transactionToDelete || !token) return

    try {
      setIsDeleting(true)
      await deleteTransactionRequest(token, transactionToDelete)
      await refreshTransactionsAndAccounts()

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

  const handleBulkEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!token) {
      setErrorMessage('No hay sesion activa')
      return
    }

    if (selectedTransactions.length === 0) {
      setErrorMessage('Selecciona al menos una transaccion para editar en lote')
      return
    }

    if (selectedTransactions.length === 0) {
      setErrorMessage('No se encontraron transacciones seleccionadas')
      return
    }

    if (selectedTransactions.some(isLinkedTransaction)) {
      setErrorMessage(
        'Las transacciones vinculadas a Tarjetas y Prestamos no se pueden editar en lote.'
      )
      return
    }

    const hasAnyChange =
      bulkEditForm.type !== 'keep' ||
      bulkEditForm.category.trim() !== '' ||
      bulkEditForm.paymentMethod !== 'keep' ||
      bulkEditForm.date.trim() !== ''

    if (!hasAnyChange) {
      setErrorMessage('Indica al menos un campo para actualizar')
      return
    }

    const uniqueSelectedTypes = Array.from(
      new Set(selectedTransactions.map((transaction) => transaction.type))
    )
    const selectedSharedType =
      uniqueSelectedTypes.length === 1 ? uniqueSelectedTypes[0] : null
    const effectiveType =
      bulkEditForm.type === 'keep' ? selectedSharedType : bulkEditForm.type

    if (bulkEditForm.type !== 'keep' && !bulkEditForm.category.trim()) {
      setErrorMessage(
        'Si cambias el tipo de transaccion, selecciona tambien la categoria compatible.'
      )
      return
    }

    if (bulkEditForm.category.trim() && !effectiveType) {
      setErrorMessage(
        'Para editar la categoria en lote, selecciona transacciones del mismo tipo o define antes un nuevo tipo.'
      )
      return
    }

    try {
      setIsApplyingBulkAction(true)

      await Promise.all(
        selectedTransactions.map((transaction) => {
          const nextType =
            bulkEditForm.type === 'keep' ? transaction.type : bulkEditForm.type
          const nextPaymentMethod =
            nextType === 'expense'
              ? bulkEditForm.paymentMethod === 'keep'
                ? transaction.paymentMethod
                : bulkEditForm.paymentMethod
              : 'not_specified'
          const nextReimbursementStatus =
            nextType === 'expense'
              ? transaction.type === 'expense'
                ? transaction.reimbursementStatus
                : 'not_applicable'
              : 'not_applicable'

          return updateTransactionRequest(token, transaction.id, {
            description: transaction.description,
            amount: transaction.amount,
            type: nextType,
            category: bulkEditForm.category.trim() || transaction.category,
            paymentMethod: nextPaymentMethod,
            reimbursementStatus: nextReimbursementStatus,
            date: bulkEditForm.date.trim() || transaction.date.slice(0, 10),
          })
        })
      )

      await refreshTransactions()
      clearSelection()
      resetBulkEditState()
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al editar transacciones en lote')
      }
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  const confirmBulkDelete = async () => {
    if (!token || selectedTransactions.length === 0) {
      return
    }

    try {
      setIsApplyingBulkAction(true)

      for (const transactionId of selectedTransactions.map((transaction) => transaction.id)) {
        try {
          await deleteTransactionRequest(token, transactionId)
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('Transaccion no encontrada')
          ) {
            continue
          }

          throw error
        }
      }

      if (
        transactionToEdit &&
        selectedTransactions.some(
          (transaction) => transaction.id === transactionToEdit.id
        )
      ) {
        resetFormState()
      }

      await refreshTransactionsAndAccounts()
      clearSelection()
      setIsBulkDeleteModalOpen(false)
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Error al eliminar transacciones en lote')
      }
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  const availableCategories = categories.filter(
    (category) => category.type === form.type
  )
  const filterCategories = categories
    .filter(
      (category) => filters.type === 'all' || category.type === filters.type
    )
    .sort((leftCategory, rightCategory) =>
      compareText(leftCategory.name, rightCategory.name)
    )
    .filter(
      (category, index, items) =>
        items.findIndex((item) => item.name === category.name) === index
    )
  const activeFiltersCount = [
    filters.category,
    filters.type !== 'all' ? filters.type : '',
    filters.paymentMethod !== 'all' ? filters.paymentMethod : '',
    filters.reimbursementStatus !== 'all' ? filters.reimbursementStatus : '',
  ].filter(Boolean).length
  const selectedTransactionIdSet = new Set(selectedTransactionIds)
  const filteredTransactions = transactions.filter((transaction) =>
    matchesTransactionFilters(transaction, filters)
  )
  const sortedTransactions = sortTransactionsForTable(
    filteredTransactions,
    sortKey,
    sortDirection
  )
  const selectedTransactions = sortedTransactions.filter((transaction) =>
    selectedTransactionIdSet.has(transaction.id)
  )
  const selectedLinkedTransactions = selectedTransactions.filter(
    isLinkedTransaction
  )
  const selectedTypeOptions = Array.from(
    new Set(selectedTransactions.map((transaction) => transaction.type))
  )
  const selectedSharedType =
    selectedTypeOptions.length === 1 ? selectedTypeOptions[0] : null
  const bulkEditEffectiveType =
    bulkEditForm.type === 'keep' ? selectedSharedType : bulkEditForm.type
  const bulkEditAvailableCategories = bulkEditEffectiveType
    ? categories
        .filter((category) => category.type === bulkEditEffectiveType)
        .sort((leftCategory, rightCategory) =>
          compareText(leftCategory.name, rightCategory.name)
        )
    : []
  const totalPages = Math.max(
    1,
    Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE)
  )
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTransactions = sortedTransactions.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  )
  const selectedVisibleCount = paginatedTransactions.filter((transaction) =>
    selectedTransactionIdSet.has(transaction.id)
  ).length
  const allVisibleSelected =
    paginatedTransactions.length > 0 &&
    selectedVisibleCount === paginatedTransactions.length
  const hasPartialVisibleSelection =
    selectedVisibleCount > 0 && !allVisibleSelected
  const visiblePageNumbers = buildVisiblePageNumbers(
    safeCurrentPage,
    totalPages
  )
  const pageStartItem =
    sortedTransactions.length === 0
      ? 0
      : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1
  const pageEndItem =
    sortedTransactions.length === 0
      ? 0
      : Math.min(safeCurrentPage * ITEMS_PER_PAGE, sortedTransactions.length)
  const transactionPendingDelete = transactionToDelete
    ? transactions.find((transaction) => transaction.id === transactionToDelete) ??
      null
    : null

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!currentPageCheckboxRef.current) {
      return
    }

    currentPageCheckboxRef.current.indeterminate = hasPartialVisibleSelection
  }, [hasPartialVisibleSelection, paginatedTransactions.length])

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
                <div className="transaction-link-panel flex flex-col gap-4 rounded-2xl p-4 md:col-span-2">
                  <label className="transaction-link-panel__label flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.createLinkedObligationAccount}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          createLinkedObligationAccount: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                    />
                    {isIncome
                      ? 'Registrar tambien este ingreso como prestamo por pagar'
                      : 'Registrar tambien esta compra en Tarjetas y Prestamos'}
                  </label>

                  <p className="transaction-link-panel__copy text-xs">
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
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Historial de transacciones
              </h2>
              <p className="text-sm text-slate-500">
                Filtra, ordena y navega tus movimientos para encontrar lo que
                buscas mas rapido.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBulkActionsOpen((prev) => !prev)}
                disabled={transactions.length === 0}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isBulkActionsOpen || selectedTransactions.length > 0
                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Acciones masivas
                {selectedTransactions.length > 0 && (
                  <span className="ml-2 inline-flex rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {selectedTransactions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                title="Filtros"
                aria-label="Filtros"
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  isFiltersOpen || activeFiltersCount > 0
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FilterButtonIcon className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex rounded-full bg-sky-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  title="Limpiar filtros"
                  aria-label="Limpiar filtros"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ClearFilterButtonIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedTransactions.length === 0
                      ? 'Selecciona una o varias transacciones para trabajar en lote.'
                      : `${selectedTransactions.length} transaccion${selectedTransactions.length === 1 ? '' : 'es'} seleccionada${selectedTransactions.length === 1 ? '' : 's'}.`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Puedes marcar la pagina actual, todas las transacciones filtradas o limpiar la seleccion.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleCurrentPageSelection}
                    disabled={paginatedTransactions.length === 0}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allVisibleSelected
                      ? 'Deseleccionar pagina'
                      : 'Seleccionar pagina'}
                  </button>

                  <button
                    type="button"
                    onClick={selectAllFilteredTransactions}
                    disabled={sortedTransactions.length === 0}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Seleccionar filtradas ({sortedTransactions.length})
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedTransactions.length === 0}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Quitar seleccion
                  </button>
                </div>
              </div>

              {isBulkActionsOpen && (
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-violet-200 bg-white p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Acciones disponibles para las transacciones seleccionadas
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedLinkedTransactions.length > 0
                        ? 'Los movimientos vinculados a Tarjetas y Prestamos se pueden eliminar, pero no editar en lote.'
                        : 'Puedes editar el medio de pago, la fecha, el tipo y la categoria en un solo paso.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openBulkEditModal}
                    disabled={
                      selectedTransactions.length === 0 ||
                      selectedLinkedTransactions.length > 0
                    }
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Editar seleccionadas
                  </button>

                  <button
                    type="button"
                    onClick={openBulkDeleteModal}
                    disabled={selectedTransactions.length === 0}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Eliminar seleccionadas
                  </button>
                </div>
              )}
            </div>
          )}

          {isFiltersOpen && (
            <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="filter-category"
                  className="text-sm font-medium text-slate-700"
                >
                  Categoria
                </label>
                <select
                  id="filter-category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">Todas</option>
                  {filterCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="filter-type"
                  className="text-sm font-medium text-slate-700"
                >
                  Tipo
                </label>
                <select
                  id="filter-type"
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="all">Todos</option>
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                  <option value="investments">Inversion</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="filter-paymentMethod"
                  className="text-sm font-medium text-slate-700"
                >
                  Medio de pago
                </label>
                <select
                  id="filter-paymentMethod"
                  name="paymentMethod"
                  value={filters.paymentMethod}
                  onChange={handleFilterChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="all">Todos</option>
                  <option value="not_specified">Sin definir</option>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="filter-reimbursementStatus"
                  className="text-sm font-medium text-slate-700"
                >
                  Reembolso
                </label>
                <select
                  id="filter-reimbursementStatus"
                  name="reimbursementStatus"
                  value={filters.reimbursementStatus}
                  onChange={handleFilterChange}
                  className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
                >
                  <option value="all">Todos</option>
                  <option value="not_applicable">No aplica</option>
                  {REIMBURSEMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="responsive-data-table">
            <table className="responsive-data-table__table responsive-data-table__table--transactions w-full text-left">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="py-3 pr-3">
                    <input
                      ref={currentPageCheckboxRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleCurrentPageSelection}
                      disabled={paginatedTransactions.length === 0}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:cursor-not-allowed"
                      aria-label="Seleccionar transacciones de la pagina actual"
                    />
                  </th>
                  <th className="py-3">Descripcion</th>
                  <th className="py-3">Categoria</th>
                  <th className="py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('type')}
                      className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-slate-700"
                    >
                      <span>Tipo</span>
                      <SortIndicator
                        isActive={sortKey === 'type'}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                  <th className="py-3">Monto</th>
                  <th className="py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('paymentMethod')}
                      className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-slate-700"
                    >
                      <span>Medio de pago</span>
                      <SortIndicator
                        isActive={sortKey === 'paymentMethod'}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                  <th className="py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('reimbursementStatus')}
                      className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-slate-700"
                    >
                      <span>Reembolso</span>
                      <SortIndicator
                        isActive={sortKey === 'reimbursementStatus'}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                  <th className="py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('date')}
                      className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-slate-700"
                    >
                      <span>Fecha</span>
                      <SortIndicator
                        isActive={sortKey === 'date'}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {isLoadingTransactions ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      Cargando transacciones...
                    </td>
                  </tr>
                ) : sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium text-slate-600">
                          {transactions.length === 0
                            ? 'No hay transacciones aun'
                            : 'No hay transacciones que coincidan con esos filtros'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {transactions.length === 0
                            ? 'Agrega tu primera transaccion para comenzar'
                            : 'Prueba limpiando o ajustando los filtros para ver mas resultados'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3 align-center">
                        <input
                          type="checkbox"
                          checked={selectedTransactionIdSet.has(transaction.id)}
                          onChange={() =>
                            toggleTransactionSelection(transaction.id)
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          aria-label={`Seleccionar transaccion ${transaction.description}`}
                        />
                      </td>
                      <td className="py-3 text-slate-800">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span
                            className="responsive-data-table__text"
                            title={transaction.description}
                          >
                            {transaction.description}
                          </span>
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
                        <span
                          className="responsive-data-table__text"
                          title={transaction.category}
                        >
                          {transaction.category}
                        </span>
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
                      <td className="py-3 text-slate-700">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium  ${getPaymentMethodTone(transaction.paymentMethod)}`}
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
                        <div className="flex items-center gap-2">
                          <span
                            title={
                              transaction.linkedObligationAccountId ||
                              transaction.linkedObligationPaymentId
                                ? 'Edita este movimiento desde Tarjetas y Prestamos para no desincronizar el control de deuda'
                                : 'Editar'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => openEditForm(transaction)}
                              aria-label="Editar"
                              disabled={Boolean(
                                transaction.linkedObligationAccountId ||
                                  transaction.linkedObligationPaymentId
                              )}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <EditButtonIcon className="h-4 w-4" />
                            </button>
                          </span>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(transaction.id)}
                            title="Eliminar"
                            aria-label="Eliminar"
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

          {!isLoadingTransactions && sortedTransactions.length > 0 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-slate-500">
                Mostrando {pageStartItem} - {pageEndItem} de{' '}
                {sortedTransactions.length} transaccion
                {sortedTransactions.length === 1 ? '' : 'es'}.
              </p>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  {visiblePageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        pageNumber === safeCurrentPage
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={safeCurrentPage === totalPages}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <Modal
          isOpen={isBulkEditModalOpen}
          onClose={() => {
            if (isApplyingBulkAction) {
              return
            }

            resetBulkEditState()
          }}
          title="Editar transacciones seleccionadas"
          maxWidthClass="max-w-2xl"
        >
          <form
            onSubmit={handleBulkEditSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-sm font-medium text-slate-800">
                Vas a actualizar {selectedTransactions.length} transaccion
                {selectedTransactions.length === 1 ? '' : 'es'} en lote.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Deja un campo en "No cambiar" o vacio si quieres conservar su valor actual.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="bulk-type"
                className="text-sm font-medium text-slate-700"
              >
                Tipo de transaccion
              </label>
              <select
                id="bulk-type"
                name="type"
                value={bulkEditForm.type}
                onChange={handleBulkEditChange}
                className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
              >
                <option value="keep">No cambiar</option>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
                <option value="investments">Inversion</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="bulk-paymentMethod"
                className="text-sm font-medium text-slate-700"
              >
                Medio de pago
              </label>
              <select
                id="bulk-paymentMethod"
                name="paymentMethod"
                value={bulkEditForm.paymentMethod}
                onChange={handleBulkEditChange}
                disabled={bulkEditEffectiveType !== 'expense'}
                className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="keep">No cambiar</option>
                <option value="not_specified">Sin definir</option>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                {bulkEditEffectiveType === 'expense'
                  ? 'Disponible porque el lote mantiene o pasara a ser gasto.'
                  : 'Solo aplica a transacciones de tipo gasto.'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="bulk-category"
                className="text-sm font-medium text-slate-700"
              >
                Categoria
              </label>
              <select
                id="bulk-category"
                name="category"
                value={bulkEditForm.category}
                onChange={handleBulkEditChange}
                disabled={!bulkEditEffectiveType}
                className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {!bulkEditEffectiveType
                    ? 'Primero define un tipo comun'
                    : 'No cambiar'}
                </option>
                {bulkEditAvailableCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                {bulkEditEffectiveType
                  ? 'Se mostraran solo categorias compatibles con el tipo final del lote.'
                  : 'Si mezclaste ingresos, gastos e inversiones, primero elige el nuevo tipo.'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="bulk-date"
                className="text-sm font-medium text-slate-700"
              >
                Fecha
              </label>
              <input
                id="bulk-date"
                name="date"
                type="date"
                value={bulkEditForm.date}
                onChange={handleBulkEditChange}
                className="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
              />
              <p className="text-xs text-slate-500">
                Si lo dejas vacio, cada transaccion conservara su fecha actual.
              </p>
            </div>

            <div className="flex justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={resetBulkEditState}
                disabled={isApplyingBulkAction}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isApplyingBulkAction}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingBulkAction ? 'Aplicando cambios...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => {
            if (isApplyingBulkAction) {
              return
            }

            setIsBulkDeleteModalOpen(false)
          }}
          title="Eliminar transacciones seleccionadas"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              Se eliminaran {selectedTransactions.length} transaccion
              {selectedTransactions.length === 1 ? '' : 'es'} seleccionada
              {selectedTransactions.length === 1 ? '' : 's'}.
            </p>

            {selectedLinkedTransactions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Hay {selectedLinkedTransactions.length} movimiento
                {selectedLinkedTransactions.length === 1 ? '' : 's'} vinculado
                {selectedLinkedTransactions.length === 1 ? '' : 's'} a Tarjetas y Prestamos. Al borrarlos tambien se ajustaran sus deudas, cuotas o abonos relacionados.
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isApplyingBulkAction}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmBulkDelete}
                disabled={isApplyingBulkAction}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingBulkAction ? 'Eliminando...' : 'Eliminar seleccionadas'}
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
