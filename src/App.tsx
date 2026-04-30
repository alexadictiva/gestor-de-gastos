import { useEffect, useState } from 'react'
import AppRouter from './router/AppRouter'
import type { Transaction } from './types/transaction'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { getTransactionsRequest } from './services/transactionService'

function AppContent() {
  const { token, isAuthenticated } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)

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

  return (
    <AppRouter
      transactions={transactions}
      setTransactions={setTransactions}
      isLoadingTransactions={isLoadingTransactions}
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