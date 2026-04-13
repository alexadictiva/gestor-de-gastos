import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import TransaccionesPage from '../pages/TransaccionesPage'
import CategoriasPage from '../pages/CategoriasPage'
import ResumenSemanalPage from '../pages/ResumenSemanalPage'
import ResumenMensualPage from '../pages/ResumenMensualPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transacciones" element={<TransaccionesPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/resumen-semanal" element={<ResumenSemanalPage />} />
        <Route path="/resumen-mensual" element={<ResumenMensualPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}