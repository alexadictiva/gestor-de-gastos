import { Link } from 'react-router-dom'
import LandingAssistant from '../components/ui/LandingAssistant'
import { DashboardButtonIcon } from '../assets/icons'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

const BENEFITS = [
  {
    title: 'Entiende en que se va tu dinero',
    description:
      'Visualiza ingresos, gastos, inversiones, liquidez disponible y resumenes semanales o mensuales con un panel pensado para decisiones reales.',
  },
  {
    title: 'Controla tarjetas y prestamos sin hojas separadas',
    description:
      'Registra cuotas, saldos pendientes, cobros por recibir, abonos y obligaciones vinculadas a tus movimientos para no duplicar informacion.',
  },
  {
    title: 'Carga movimientos desde la web o Telegram',
    description:
      'Usa la app como panel principal y Telegram como canal rapido para registrar gastos, ingresos o cargas masivas desde cualquier lugar.',
  },
] as const

const MODULES = [
  'Dashboard con liquidez, balance operativo y panorama completo',
  'Categorias y cuentas para separar banco, efectivo y billeteras',
  'Transacciones con medio de pago, reembolso y edicion masiva',
  'Tarjetas y Prestamos para seguir cuotas, deudas y cobros',
  'Proyeccion del proximo mes con pasos a real en un click',
  'Resumen semanal y mensual con graficos y alertas',
] as const

const STEPS = [
  {
    title: 'Configura tu base',
    description:
      'Crea tus categorias y tus cuentas para representar banco, efectivo, billeteras o cualquier fuente real de liquidez.',
  },
  {
    title: 'Registra lo que ocurre hoy',
    description:
      'Carga gastos, ingresos, inversiones y pagos con el medio correspondiente para reflejar tu economia con contexto completo.',
  },
  {
    title: 'Proyecta lo que viene',
    description:
      'Suma movimientos recurrentes, cuotas y deudas futuras para anticiparte al siguiente mes y no solo reaccionar.',
  },
] as const

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="landing-header__theme"
    >
      {theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
    </button>
  )
}

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <span className="landing-brand__logo">
            <DashboardButtonIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="landing-brand__title">Control de Gastos</span>
            <span className="landing-brand__subtitle">Panel Administrativo</span>
          </span>
        </Link>

        <nav className="landing-header__actions">
          <ThemeToggleButton />

          {isLoading ? (
            <span className="landing-button landing-button--ghost landing-button--disabled">
              Cargando...
            </span>
          ) : isAuthenticated ? (
            <Link to="/dashboard" className="landing-button landing-button--primary">
              Ir al panel
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-button landing-button--ghost">
                Iniciar sesion
              </Link>
              <Link
                to="/registro"
                className="landing-button landing-button--primary"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <span className="landing-hero__badge">
              Finanzas personales con enfoque operativo real
            </span>
            <h1 className="landing-hero__title">
              Tu economia completa en un panel pensado para decidir mejor
            </h1>
            <p className="landing-hero__description">
              Controla gastos, ingresos, cuentas, tarjetas, prestamos,
              proyecciones y movimientos desde Telegram en una sola app
              construida para ver lo que ya paso y anticipar lo que viene.
            </p>

            <div className="landing-hero__actions">
              {isLoading ? (
                <span className="landing-button landing-button--ghost landing-button--disabled">
                  Preparando acceso
                </span>
              ) : isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="landing-button landing-button--primary"
                >
                  Abrir dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/registro"
                    className="landing-button landing-button--primary"
                  >
                    Empezar gratis
                  </Link>
                  <Link
                    to="/login"
                    className="landing-button landing-button--ghost"
                  >
                    Ya tengo cuenta
                  </Link>
                </>
              )}
            </div>

            <div className="landing-hero__microcopy">
              <span>Dashboard administrativo</span>
              <span>Modo claro y oscuro</span>
              <span>Integracion con Telegram</span>
            </div>
          </div>

          <div className="landing-hero__preview">
            <article className="landing-preview-card landing-preview-card--accent">
              <span className="landing-preview-card__label">Objetivo</span>
              <h2>Que sepas cuanto tienes, cuanto debes y cuanto viene despues</h2>
              <p>
                No solo registra movimientos: tambien conecta deudas, cobros,
                liquidez y proyecciones en un flujo coherente.
              </p>
            </article>

            <div className="landing-preview-grid">
              <article className="landing-preview-card">
                <span className="landing-preview-card__label">Beneficio clave</span>
                <h3>Evita duplicar informacion</h3>
                <p>
                  Un gasto financiado puede generar la deuda asociada para que
                  el seguimiento siga vivo en el modulo correcto.
                </p>
              </article>

              <article className="landing-preview-card">
                <span className="landing-preview-card__label">Canal rapido</span>
                <h3>Registra por Telegram</h3>
                <p>
                  Carga una linea o un bloque completo de movimientos sin abrir
                  la app y revisalos luego desde el panel.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section__heading">
            <span className="landing-section-eyebrow">Valor de la app</span>
            <h2 className="landing-section-title">
              Disenada para personas que necesitan mas contexto que un simple
              listado de gastos
            </h2>
            <p className="landing-section-copy">
              La propuesta no es solo anotar lo que gastaste, sino conectar lo
              que ya paso, lo que todavia debes, lo que te deben a ti y lo que
              ya sabes que tendras que pagar despues.
            </p>
          </div>

          <div className="landing-benefits">
            {BENEFITS.map((benefit) => (
              <article key={benefit.title} className="landing-benefit-card">
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section__heading">
            <span className="landing-section-eyebrow">Objetivo</span>
            <h2 className="landing-section-title">
              Pasar de reaccionar a anticiparte
            </h2>
          </div>

          <div className="landing-steps">
            {STEPS.map((step, index) => (
              <article key={step.title} className="landing-step-card">
                <span className="landing-step-card__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--panel">
          <div className="landing-section__heading">
            <span className="landing-section-eyebrow">Que incluye</span>
            <h2 className="landing-section-title">
              Modulos conectados bajo una misma logica financiera
            </h2>
          </div>

          <div className="landing-modules">
            {MODULES.map((module) => (
              <article key={module} className="landing-module-item">
                <span className="landing-module-item__dot" />
                <p>{module}</p>
              </article>
            ))}
          </div>
        </section>

        <LandingAssistant />

        <section className="landing-cta">
          <div>
            <span className="landing-section-eyebrow">Empieza hoy</span>
            <h2 className="landing-section-title">
              Prueba la experiencia en la misma app que ya mueve todo el panel
            </h2>
            <p className="landing-section-copy">
              El mismo deploy publica esta landing y la aplicacion principal,
              para que puedas mostrar producto y uso real desde una sola URL.
            </p>
          </div>

          <div className="landing-cta__actions">
            {isLoading ? (
              <span className="landing-button landing-button--ghost landing-button--disabled">
                Cargando...
              </span>
            ) : isAuthenticated ? (
              <Link to="/dashboard" className="landing-button landing-button--primary">
                Entrar al panel
              </Link>
            ) : (
              <>
                <Link
                  to="/registro"
                  className="landing-button landing-button--primary"
                >
                  Crear cuenta
                </Link>
                <Link to="/login" className="landing-button landing-button--ghost">
                  Iniciar sesion
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
