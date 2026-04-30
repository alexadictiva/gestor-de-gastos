import { useEffect, useState } from 'react'
import AppRouter from './router/AppRouter'
import { mockTransactions } from './data/mockTransactions'
import type { Transaction } from './types/transaction'
import { AuthProvider } from './context/AuthContext'

const STORAGE_KEY = 'control-gastos-transactions'

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedTransactions = localStorage.getItem(STORAGE_KEY)

    if (savedTransactions) {
      try {
        return JSON.parse(savedTransactions) as Transaction[]
      } catch (error) {
        console.error('Error al leer transacciones desde localStorage:', error)
      }
    }

    return mockTransactions
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  return (
    <AuthProvider>
      <AppRouter
        transactions={transactions}
        setTransactions={setTransactions}
      />
    </AuthProvider>
  )
}

export default App