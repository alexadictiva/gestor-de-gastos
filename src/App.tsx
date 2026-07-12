import { useEffect, useEffectEvent, useState } from 'react'
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

  const loadTransactions = useEffectEvent(async (showLoader = true) => {
    if (!token || !isAuthenticated) {
      setTransactions([])
      return
    }

    try {
      if (showLoader) {
        setIsLoadingTransactions(true)
      }

      const data = await getTransactionsRequest(token)
      setTransactions(data)
    } catch (error) {
      console.error('Error cargando transacciones:', error)

      if (showLoader) {
        setTransactions([])
      }
    } finally {
      if (showLoader) {
        setIsLoadingTransactions(false)
      }
    }
  })

  useEffect(() => {
    void loadTransactions()
  }, [token, isAuthenticated])

  useEffect(() => {
    if (!token || !isAuthenticated) {
      return
    }

    const syncTransactions = () => {
      void loadTransactions(false)
    }

    const intervalId = window.setInterval(syncTransactions, 10000)
    const handleWindowFocus = () => {
      syncTransactions()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTransactions()
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
