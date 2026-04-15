import type { Transaction } from '../types/transaction'

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Supermercado',
    amount: 50,
    type: 'expense',
    category: 'Comida',
    date: '2026-04-13',
  },
  {
    id: '2',
    description: 'Sueldo',
    amount: 2000,
    type: 'income',
    category: 'Trabajo',
    date: '2026-04-12',
  },
  {
    id: '3',
    description: 'Transporte',
    amount: 30,
    type: 'expense',
    category: 'Movilidad',
    date: '2026-04-11',
  },
  {
    id: '4',
    description: 'Freelance',
    amount: 1000,
    type: 'income',
    category: 'Trabajo',
    date: '2026-04-10',
  },
]