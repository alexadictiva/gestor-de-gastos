import DashboardLayout from '../components/layout/DashboardLayout'

export default function NotFoundPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Página no encontrada
        </h1>
        <p className="text-slate-600">
          La página que estás buscando no existe.
        </p>
      </div>
    </DashboardLayout>
  )
}   