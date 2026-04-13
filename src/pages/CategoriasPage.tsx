import DashboardLayout from '../components/layout/DashboardLayout'

export default function CategoriasPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
          <p className="text-slate-600">
            Aquí podrás administrar las categorías de ingresos y gastos.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            Más adelante aquí mostraremos la tabla de categorías.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}