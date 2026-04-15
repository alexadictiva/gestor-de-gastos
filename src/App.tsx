
import { useState } from 'react'
import { mockTransactions } from './data/mockTransactions'
import AppRouter from './router/AppRouter'
import type { Transaction } from './types/transaction'


function App() {
  
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)

  return (
    <div className="min-h-screen bg-slate-100 flex items-center">
      <AppRouter 
      transactions={transactions}
      setTransactions={setTransactions}      
      />
      
    </div>
  )
}

export default App
