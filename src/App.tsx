import { useEffect, useState } from 'react'
import AppRouter from './router/AppRouter'
import type { Transaction } from './types/transaction'
import type { Category } from './types/category'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { getTransactionsRequest } from './services/transactionService'
import { getCategoriesRequest } from './services/categoryService'

function AppContent() {
  const { token, isAuthenticated } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  useEffect(() => {
    async function loadTransactions() {
      if (!token || !isAuthenticated) {
        setTransactions([])
        return
      }

      try {
        setIsLoadingTransactions(true)
        const data = await getTransactionsRequest(token)
        setTransactions(data)
      } catch (error) {
        console.error('Error cargando transacciones:', error)
        setTransactions([])
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    loadTransactions()
  }, [token, isAuthenticated])

  useEffect(() => {
    async function loadCategories() {
      if (!token || !isAuthenticated) {
        setCategories([])
        return
      }

      try {
        setIsLoadingCategories(true)
        const data = await getCategoriesRequest(token)
        setCategories(data)
      } catch (error) {
        console.error('Error cargando categorías:', error)
        setCategories([])
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [token, isAuthenticated])

  return (
    <AppRouter
      transactions={transactions}
      setTransactions={setTransactions}
      isLoadingTransactions={isLoadingTransactions}
      categories={categories}
      setCategories={setCategories}
      isLoadingCategories={isLoadingCategories}
    />
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App