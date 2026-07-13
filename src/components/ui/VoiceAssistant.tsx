import { useEffect, useMemo, useRef, useState } from 'react'

interface VoiceAssistantProps {
  availableLiquidityTotal: number
  operatingBalanceTotal: number
  incomeTotal: number
  expenseTotal: number
  financedExpenseTotal: number
  investmentsTotal: number
  reimbursablePendingTotal: number
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function formatAmount(value: number) {
  return `$${value.toFixed(2)}`
}

export default function VoiceAssistant({
  availableLiquidityTotal,
  operatingBalanceTotal,
  incomeTotal,
  expenseTotal,
  financedExpenseTotal,
  investmentsTotal,
  reimbursablePendingTotal,
}: VoiceAssistantProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('')
  const [lastAnswer, setLastAnswer] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  )

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-AR'
    window.speechSynthesis.speak(utterance)
  }

  const buildAnswer = (transcript: string) => {
    const normalizedTranscript = normalizeText(transcript)

    if (
      normalizedTranscript.includes('queda para gastar') ||
      normalizedTranscript.includes('me queda para gastar') ||
      normalizedTranscript.includes('cuanto tengo disponible') ||
      normalizedTranscript.includes('cual es mi saldo') ||
      normalizedTranscript.includes('cuanta liquidez tengo')
    ) {
      return `Tu liquidez disponible es ${formatAmount(availableLiquidityTotal)} para gastar sin contar consumos financiados pendientes.`
    }

    if (
      normalizedTranscript.includes('cual es mi balance') ||
      normalizedTranscript.includes('resultado operativo')
    ) {
      return `Tu balance operativo es ${formatAmount(operatingBalanceTotal)}.`
    }

    if (normalizedTranscript.includes('cuanto gaste')) {
      return `Tus gastos acumulados son ${formatAmount(expenseTotal)}.`
    }

    if (normalizedTranscript.includes('cuanto ingrese')) {
      return `Tus ingresos acumulados son ${formatAmount(incomeTotal)}.`
    }

    if (
      normalizedTranscript.includes('cuanto inverti') ||
      normalizedTranscript.includes('cuanto llevo invertido')
    ) {
      return `Llevas ${formatAmount(investmentsTotal)} en inversiones.`
    }

    if (
      normalizedTranscript.includes('cuanto me deben') ||
      normalizedTranscript.includes('cuanto tengo por cobrar') ||
      normalizedTranscript.includes('cuanto me tienen que pagar')
    ) {
      return `Tienes ${formatAmount(reimbursablePendingTotal)} pendiente de cobro.`
    }

    if (
      normalizedTranscript.includes('cuanto tengo financiado') ||
      normalizedTranscript.includes('cuanto debo financiado')
    ) {
      return `Llevas ${formatAmount(financedExpenseTotal)} en consumo financiado.`
    }

    return 'Puedo responder tu liquidez disponible, tu balance operativo, tus ingresos, tus gastos, tus inversiones o cuanto te deben.'
  }

  const startListening = () => {
    setErrorMessage('')

    if (!isSupported) {
      setErrorMessage('Tu navegador no soporta reconocimiento de voz.')
      return
    }

    const RecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!RecognitionConstructor) {
      setErrorMessage('No pude iniciar el reconocimiento de voz.')
      return
    }

    recognitionRef.current?.abort()

    const recognition = new RecognitionConstructor()
    recognition.lang = 'es-AR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0]?.transcript?.trim() || ''

      if (!transcript) {
        setErrorMessage('No pude entender la pregunta.')
        return
      }

      const answer = buildAnswer(transcript)
      setLastQuestion(transcript)
      setLastAnswer(answer)
      speak(answer)
    }

    recognition.onerror = (event) => {
      setErrorMessage(`No pude procesar el audio: ${event.error}`)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Asistente de voz</h2>
          <p className="text-sm text-slate-300">
            Preguntame cosas como "cuanto me queda para gastar" o "cual es mi balance operativo".
          </p>
        </div>

        <button
          type="button"
          onClick={startListening}
          disabled={isListening}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isListening ? 'Escuchando...' : 'Hablar'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <div className="rounded-xl bg-slate-800 p-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Ultima pregunta
          </p>
          <p className="mt-0 text-sm text-slate-100">
            {lastQuestion || 'Todavia no hiciste ninguna pregunta por voz.'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-800 p-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Respuesta
          </p>
          <p className="mt-0 text-sm text-slate-100">
            {lastAnswer || 'Cuando hables, te respondo por pantalla y por voz.'}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-full bg-slate-800 px-3 py-1">
          "cuanto me queda para gastar"
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">
          "cual es mi balance operativo"
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">
          "cuanto gaste"
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">
          "cuanto ingrese"
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">
          "cuanto tengo financiado"
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1">
          "cuanto me deben"
        </span>
      </div>
    </section>
  )
}
