import { Link } from 'react-router-dom'

export interface GettingStartedStep {
  id: string
  title: string
  description: string
  isComplete: boolean
  to?: string
  actionLabel?: string
}

interface GettingStartedChecklistProps {
  title: string
  description: string
  steps: GettingStartedStep[]
  footerNote?: string
  className?: string
}

function StepMarker({
  index,
  isComplete,
}: {
  index: number
  isComplete: boolean
}) {
  return (
    <span
      className={`app-checklist-step-marker ${
        isComplete ? 'app-checklist-step-marker--done' : ''
      }`}
      aria-hidden="true"
    >
      {isComplete ? (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="m5 10 3 3 7-7" />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  )
}

export default function GettingStartedChecklist({
  title,
  description,
  steps,
  footerNote,
  className = '',
}: GettingStartedChecklistProps) {
  const pendingStepsCount = steps.filter((step) => !step.isComplete).length

  return (
    <section className={`app-checklist ${className}`.trim()}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="app-checklist-eyebrow">Primeros pasos</span>
          <h2 className="app-checklist-title">{title}</h2>
          <p className="app-checklist-copy">{description}</p>
        </div>

        <span
          className={`app-checklist-pill ${
            pendingStepsCount === 0 ? 'app-checklist-pill--done' : ''
          }`}
        >
          {pendingStepsCount === 0
            ? 'Listo para usar'
            : `${pendingStepsCount} paso${pendingStepsCount === 1 ? '' : 's'} pendiente${pendingStepsCount === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="app-checklist-grid">
        {steps.map((step, index) => (
          <article
            key={step.id}
            className={`app-checklist-step ${
              step.isComplete ? 'app-checklist-step--done' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <StepMarker index={index} isComplete={step.isComplete} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="app-checklist-step-title">{step.title}</h3>
                  <span className="app-checklist-step-status">
                    {step.isComplete ? 'Completado' : 'Pendiente'}
                  </span>
                </div>

                <p className="app-checklist-step-copy">{step.description}</p>
              </div>
            </div>

            {!step.isComplete && step.to && (
              <div className="mt-4">
                <Link to={step.to} className="app-checklist-action">
                  {step.actionLabel || 'Abrir'}
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>

      {footerNote && <p className="app-checklist-footer">{footerNote}</p>}
    </section>
  )
}
