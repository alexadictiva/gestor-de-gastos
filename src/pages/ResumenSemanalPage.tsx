import DashboardLayout from '../components/layout/DashboardLayout'

export default function ResumenSemanalPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Resumen Semanal
        </h1>
        <p className="text-slate-600">
          Aquí podrás ver un resumen semanal.
        </p>
      </div>
    </DashboardLayout>
  )
}