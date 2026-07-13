import type { Transaction } from '../types/transaction'

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Supermercado',
    amount: 50,
    type: 'expense',
    category: 'Comida',
    paymentMethod: 'cash',
    reimbursementStatus: 'not_applicable',
    date: '2026-04-13',
  },
  {
    id: '2',
    description: 'Sueldo',
    amount: 2000,
    type: 'income',
    category: 'Trabajo',
    paymentMethod: 'not_specified',
    reimbursementStatus: 'not_applicable',
    date: '2026-04-12',
  },
  {
    id: '3',
    description: 'Transporte',
    amount: 30,
    type: 'expense',
    category: 'Movilidad',
    paymentMethod: 'bank',
    reimbursementStatus: 'pending',
    date: '2026-04-11',
  },
  {
    id: '4',
    description: 'Buy Dollar',
    amount: 1000,
    type: 'investments',
    category: 'Trabajo',
    paymentMethod: 'not_specified',
    reimbursementStatus: 'not_applicable',
    date: '2026-04-10',
  },
]
