import { useMemo, useState, type FormEvent } from 'react'

interface AssistantMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
}

interface AssistantKnowledgeItem {
  keywords: string[]
  answer: string
}

const SUGGESTED_QUESTIONS = [
  'Que puedo hacer con la app',
  'Como funciona Telegram',
  'Puedo controlar tarjetas y prestamos',
  'La app me sirve para proyectar el proximo mes',
] as const

const KNOWLEDGE_BASE: AssistantKnowledgeItem[] = [
  {
    keywords: ['que hace', 'para que sirve', 'que puedo hacer', 'funciones'],
    answer:
      'Control de Gastos te ayuda a registrar ingresos, gastos, inversiones, cuentas, tarjetas, prestamos, proyecciones y resumenes para entender tu economia completa en un solo lugar.',
  },
  {
    keywords: ['telegram', 'bot', 'whatsapp', 'mensajes'],
    answer:
      'La app incluye integracion con Telegram para vincular tu cuenta, registrar movimientos con mensajes simples o cargas masivas y despues ver todo sincronizado en el panel.',
  },
  {
    keywords: ['tarjeta', 'prestamo', 'deuda', 'cuotas'],
    answer:
      'Puedes controlar tarjetas de credito, prestamos por pagar y por cobrar, obligaciones por cuota, abonos, cobros y el impacto real sobre tu liquidez.',
  },
  {
    keywords: ['proyeccion', 'proyectar', 'mes siguiente', 'presupuesto', 'futuro'],
    answer:
      'Si. La app te deja cargar movimientos proyectados, gastos e ingresos recurrentes, marcar como pagado o cobrado y convertirlos en transacciones reales cuando corresponda.',
  },
  {
    keywords: ['resumen', 'graficos', 'dashboard', 'reportes'],
    answer:
      'Tienes dashboard general, resumen semanal y mensual con graficos de dona, metricas clave, liquidez por cuenta y estado de tarjetas, prestamos y proyecciones.',
  },
  {
    keywords: ['cuentas', 'efectivo', 'banco', 'liquidez'],
    answer:
      'Puedes separar tu dinero en cuentas como banco, efectivo o billeteras para ver con mas claridad donde esta tu liquidez y como se mueve cada pago o ingreso.',
  },
  {
    keywords: ['seguridad', 'login', 'sesion', 'usuario'],
    answer:
      'La app usa registro de usuario, login, JWT para sesion, contrasenas hasheadas y datos separados por usuario para que cada cuenta vea solo su propia informacion.',
  },
  {
    keywords: ['excel', 'exportar', 'importar'],
    answer:
      'La base ya esta preparada para seguir creciendo hacia importacion y exportacion, y la app ya tiene la estructura ideal para sumar esos flujos sin rehacer el panel.',
  },
]

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function resolveAssistantAnswer(question: string) {
  const normalizedQuestion = normalizeText(question)

  const matchedItem = KNOWLEDGE_BASE.find((item) =>
    item.keywords.some((keyword) => normalizedQuestion.includes(keyword))
  )

  if (matchedItem) {
    return matchedItem.answer
  }

  return 'Puedo ayudarte con dudas sobre registro de movimientos, Telegram, tarjetas y prestamos, proyecciones, dashboard, cuentas o seguridad de la app.'
}

function createInitialMessages(): AssistantMessage[] {
  return [
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content:
        'Soy el asistente virtual de Control de Gastos. Preguntame que hace la app, como funciona Telegram, si puedes controlar tarjetas o como te ayuda a proyectar tus finanzas.',
    },
  ]
}

export default function LandingAssistant() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>(createInitialMessages)

  const lastAssistantMessage = useMemo(
    () =>
      [...messages].reverse().find((message) => message.role === 'assistant')
        ?.content ?? '',
    [messages]
  )

  const submitQuestion = (nextQuestion: string) => {
    const trimmedQuestion = nextQuestion.trim()

    if (!trimmedQuestion) {
      return
    }

    const answer = resolveAssistantAnswer(trimmedQuestion)

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${prev.length + 1}`,
        role: 'user',
        content: trimmedQuestion,
      },
      {
        id: `assistant-${prev.length + 2}`,
        role: 'assistant',
        content: answer,
      },
    ])

    setQuestion('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitQuestion(question)
  }

  return (
    <section className="landing-assistant">
      <div className="landing-assistant__header">
        <div>
          <span className="landing-section-eyebrow">Asistente virtual</span>
          <h2 className="landing-section-title">
            Resuelve dudas sobre la app antes de registrarte
          </h2>
          <p className="landing-section-copy">
            Responde preguntas frecuentes sobre funciones, objetivo, Telegram,
            tarjetas, prestamos y proyecciones financieras.
          </p>
        </div>

        <div className="landing-assistant__status">
          Disponible ahora
        </div>
      </div>

      <div className="landing-assistant__content">
        <div className="landing-assistant__messages">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`landing-assistant__message ${
                message.role === 'user'
                  ? 'landing-assistant__message--user'
                  : 'landing-assistant__message--assistant'
              }`}
            >
              <span className="landing-assistant__message-role">
                {message.role === 'user' ? 'Tu pregunta' : 'Asistente'}
              </span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <div className="landing-assistant__panel">
          <form onSubmit={handleSubmit} className="landing-assistant__form">
            <label
              htmlFor="landing-assistant-question"
              className="landing-assistant__label"
            >
              Haz una pregunta sobre el producto
            </label>
            <textarea
              id="landing-assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="landing-assistant__input"
              rows={4}
              placeholder="Ej: Puedo registrar gastos desde Telegram?"
            />

            <button type="submit" className="landing-button landing-button--primary">
              Preguntar
            </button>
          </form>

          <div className="landing-assistant__suggestions">
            <p className="landing-assistant__label">Prueba con:</p>

            <div className="landing-assistant__chips">
              {SUGGESTED_QUESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submitQuestion(suggestion)}
                  className="landing-assistant__chip"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="landing-assistant__answer-card">
            <span className="landing-assistant__message-role">Ultima respuesta</span>
            <p>{lastAssistantMessage}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
