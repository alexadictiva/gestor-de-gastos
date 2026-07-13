import { prisma } from './prisma'
import {
  normalizePaymentMethod,
  normalizeReimbursementStatus,
  type PaymentMethod,
  type ReimbursementStatus,
  type TransactionType,
} from './transaction-fields'

type TelegramTransactionType = TransactionType

interface ParsedTelegramTransaction {
  type: TelegramTransactionType
  amount: number
  category: string
  description: string
  date: string
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
}

interface ResolvedTelegramTransaction {
  type: TelegramTransactionType
  amount: number
  category: string
  description: string
  date: Date
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
}

type ParseTelegramResult =
  | { transaction: ParsedTelegramTransaction }
  | { error: string }

type TelegramMetadataResult =
  | {
      details: string
      paymentMethod: PaymentMethod
      reimbursementStatus: ReimbursementStatus
    }
  | { error: string }

let pollingStarted = false
const TELEGRAM_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TELEGRAM_LOCAL_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/
const TELEGRAM_DATE_CAPTURE_PATTERN = '(\\d{4}-\\d{2}-\\d{2}|\\d{2}-\\d{2}-\\d{4})'

function getTelegramFormatsHelpMessage() {
  return [
    'Prueba alguno de estos formatos:',
    'gasto 2500 comida - Supermercado pago:efectivo',
    'gasto 264000 auto - GNC 3ra Cuota 11-06-2026 pago:tarjeta reembolso:pendiente',
    'ingreso 120000 sueldo - Salario julio fecha:30-06-2026',
    'inversion 30000 cedears - Compra mensual',
    'gasto 2500 categoria:comida descripcion:supermercado fecha:2026-06-30 pago:cuenta',
    'Tambien puedes pegar varias lineas en un solo mensaje.',
    'Si no indicas pago:, el gasto queda como sin definir.',
  ].join('\n')
}

function getTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || ''
}

function getTelegramApiUrl(path: string) {
  return `https://api.telegram.org/bot${getTelegramToken()}/${path}`
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateString(value: string) {
  const trimmedValue = value.trim()
  let year = 0
  let month = 0
  let day = 0

  if (TELEGRAM_ISO_DATE_PATTERN.test(trimmedValue)) {
    ;[year, month, day] = trimmedValue.split('-').map(Number)
  } else if (TELEGRAM_LOCAL_DATE_PATTERN.test(trimmedValue)) {
    ;[day, month, year] = trimmedValue.split('-').map(Number)
  } else {
    return null
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null
  }

  return parsedDate
}

function extractTelegramMetadata(details: string): TelegramMetadataResult {
  const tokens = details.trim().split(/\s+/)
  let paymentMethod: PaymentMethod = 'not_specified'
  let reimbursementStatus: ReimbursementStatus = 'not_applicable'

  while (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1]
    const separatorIndex = lastToken.indexOf(':')

    if (separatorIndex <= 0) {
      break
    }

    const rawKey = lastToken.slice(0, separatorIndex)
    const rawValue = lastToken.slice(separatorIndex + 1)
    const normalizedKey = normalizeText(rawKey)

    if (
      normalizedKey !== 'pago' &&
      normalizedKey !== 'reembolso' &&
      normalizedKey !== 'reembolsable'
    ) {
      break
    }

    if (!rawValue.trim()) {
      return {
        error: 'Los campos pago: y reembolso: deben tener un valor.',
      }
    }

    if (normalizedKey === 'pago') {
      const normalizedMethod = normalizePaymentMethod(rawValue)

      if (!normalizedMethod) {
        return {
          error:
            'El medio de pago no es valido. Usa pago:efectivo, pago:cuenta o pago:tarjeta.',
        }
      }

      paymentMethod = normalizedMethod
      tokens.pop()
      continue
    }

    const normalizedStatus = normalizeReimbursementStatus(rawValue)

    if (!normalizedStatus) {
      return {
        error:
          'El estado de reembolso no es valido. Usa reembolso:pendiente, reembolso:cobrado o reembolso:no.',
      }
    }

    reimbursementStatus = normalizedStatus
    tokens.pop()
  }

  return {
    details: tokens.join(' ').trim(),
    paymentMethod,
    reimbursementStatus,
  }
}

function extractDateFromDetails(details: string) {
  const labeledDateMatch = details.match(
    new RegExp(`^(.*?)\\s+fecha:\\s*${TELEGRAM_DATE_CAPTURE_PATTERN}$`, 'i')
  )

  if (labeledDateMatch) {
    return {
      details: labeledDateMatch[1].trim(),
      date: labeledDateMatch[2].trim(),
    }
  }

  const trailingDateMatch = details.match(
    new RegExp(`^(.*?)(?:\\s+-)?\\s+${TELEGRAM_DATE_CAPTURE_PATTERN}$`)
  )

  if (trailingDateMatch) {
    return {
      details: trailingDateMatch[1].trim(),
      date: trailingDateMatch[2].trim(),
    }
  }

  return {
    details: details.trim(),
    date: getTodayDateString(),
  }
}

function mapTelegramType(rawType: string): TelegramTransactionType | null {
  const normalizedType = normalizeText(rawType)

  if (normalizedType === 'gasto' || normalizedType === 'expense') {
    return 'expense'
  }

  if (normalizedType === 'ingreso' || normalizedType === 'income') {
    return 'income'
  }

  if (
    normalizedType === 'inversion' ||
    normalizedType === 'investments' ||
    normalizedType === 'investment'
  ) {
    return 'investments'
  }

  return null
}

function parseTelegramTransaction(text: string): ParseTelegramResult {
  const trimmedText = text.trim()
  const mainMatch = trimmedText.match(
    /^(gasto|ingreso|inversion|inversión|expense|income|investment|investments)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/i
  )

  if (!mainMatch) {
    return {
      error: 'No pude entender el formato del movimiento.',
    }
  }

  const type = mapTelegramType(mainMatch[1])
  const amount = Number(mainMatch[2].replace(',', '.'))

  if (!type || !Number.isFinite(amount) || amount <= 0) {
    return {
      error: 'El monto debe ser mayor a cero y el tipo debe ser valido.',
    }
  }

  const extractedMetadata = extractTelegramMetadata(mainMatch[3].trim())

  if ('error' in extractedMetadata) {
    return {
      error: extractedMetadata.error,
    }
  }

  if (!extractedMetadata.details) {
    return {
      error: 'Faltan la categoria o la descripcion del movimiento.',
    }
  }

  const explicitFieldsMatch = extractedMetadata.details.match(
    new RegExp(
      `^categoria:\\s*(.+?)\\s+descripcion:\\s*(.+?)(?:\\s+fecha:\\s*${TELEGRAM_DATE_CAPTURE_PATTERN})?$`,
      'i'
    )
  )

  if (explicitFieldsMatch) {
    return {
      transaction: {
        type,
        amount,
        category: explicitFieldsMatch[1].trim(),
        description: explicitFieldsMatch[2].trim(),
        date: explicitFieldsMatch[3]?.trim() || getTodayDateString(),
        paymentMethod:
          type === 'expense' ? extractedMetadata.paymentMethod : 'not_specified',
        reimbursementStatus:
          type === 'expense'
            ? extractedMetadata.reimbursementStatus
            : 'not_applicable',
      },
    }
  }

  const extractedDetails = extractDateFromDetails(extractedMetadata.details)
  const compactFormatMatch = extractedDetails.details.match(/^(.+?)\s+-\s+(.+)$/)

  if (compactFormatMatch) {
    return {
      transaction: {
        type,
        amount,
        category: compactFormatMatch[1].trim(),
        description: compactFormatMatch[2].trim(),
        date: extractedDetails.date,
        paymentMethod:
          type === 'expense' ? extractedMetadata.paymentMethod : 'not_specified',
        reimbursementStatus:
          type === 'expense'
            ? extractedMetadata.reimbursementStatus
            : 'not_applicable',
      },
    }
  }

  const [firstWord] = extractedDetails.details.split(/\s+/)

  if (!firstWord) {
    return {
      error: 'No encontre una categoria para este movimiento.',
    }
  }

  return {
    transaction: {
      type,
      amount,
      category: firstWord.trim(),
      description: extractedDetails.details,
      date: extractedDetails.date,
      paymentMethod:
        type === 'expense' ? extractedMetadata.paymentMethod : 'not_specified',
      reimbursementStatus:
        type === 'expense'
          ? extractedMetadata.reimbursementStatus
          : 'not_applicable',
    },
  }
}

function buildTelegramCategoryKey(
  type: TelegramTransactionType,
  category: string
) {
  return `${type}:${normalizeText(category)}`
}

function resolveTelegramTransaction(
  text: string,
  categoryMap: Map<string, string>
): { transaction: ResolvedTelegramTransaction } | { error: string } {
  const parsedTransaction = parseTelegramTransaction(text)

  if ('error' in parsedTransaction) {
    return parsedTransaction
  }

  const transaction = parsedTransaction.transaction
  const matchedCategory = categoryMap.get(
    buildTelegramCategoryKey(transaction.type, transaction.category)
  )

  if (!matchedCategory) {
    return {
      error: `La categoria "${transaction.category}" no existe para ese tipo.`,
    }
  }

  const parsedDate = parseDateString(transaction.date)

  if (!parsedDate) {
    return {
      error: 'La fecha enviada no es valida. Usa DD-MM-YYYY o YYYY-MM-DD.',
    }
  }

  return {
    transaction: {
      type: transaction.type,
      amount: transaction.amount,
      category: matchedCategory,
      description: transaction.description,
      date: parsedDate,
      paymentMethod: transaction.paymentMethod,
      reimbursementStatus: transaction.reimbursementStatus,
    },
  }
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = getTelegramToken()

  if (!token) {
    return
  }

  await fetch(getTelegramApiUrl('sendMessage'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })
}

async function handleLinkCommand(chatId: string, text: string) {
  const [, rawCode = ''] = text.trim().split(/\s+/)
  const code = rawCode.trim().toUpperCase()

  if (!code) {
    await sendTelegramMessage(
      chatId,
      'Envia /link TU_CODIGO para vincular tu cuenta.'
    )
    return
  }

  const user = await prisma.user.findFirst({
    where: {
      telegramLinkCode: code,
      telegramLinkCodeExpiresAt: {
        gt: new Date(),
      },
    },
  })

  if (!user) {
    await sendTelegramMessage(
      chatId,
      'No encontre un codigo valido. Genera uno nuevo desde Configuracion.'
    )
    return
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      telegramChatId: chatId,
      telegramLinkCode: null,
      telegramLinkCodeExpiresAt: null,
    },
  })

  await sendTelegramMessage(
    chatId,
    `Cuenta vinculada correctamente con ${user.email}. Ya puedes registrar movimientos.`
  )
}

async function handleUnlinkCommand(chatId: string) {
  const user = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
    },
  })

  if (!user) {
    await sendTelegramMessage(
      chatId,
      'Este chat no esta vinculado a ninguna cuenta.'
    )
    return
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      telegramChatId: null,
      telegramLinkCode: null,
      telegramLinkCodeExpiresAt: null,
    },
  })

  await sendTelegramMessage(chatId, 'La cuenta fue desvinculada correctamente.')
}

async function handleTransactionMessage(chatId: string, text: string) {
  const user = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
    },
  })

  if (!user) {
    await sendTelegramMessage(
      chatId,
      'Primero vincula tu cuenta enviando /link TU_CODIGO.'
    )
    return
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      type: 'asc',
    },
  })

  const categoryMap = new Map(
    categories.map((category) => [
      buildTelegramCategoryKey(
        category.type as TelegramTransactionType,
        category.name
      ),
      category.name,
    ])
  )

  if (categoryMap.size === 0) {
    await sendTelegramMessage(
      chatId,
      'No tienes categorias creadas. Crea tus categorias en la app y vuelve a intentarlo.'
    )
    return
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    await sendTelegramMessage(chatId, getTelegramFormatsHelpMessage())
    return
  }

  const savedTransactions: ResolvedTelegramTransaction[] = []
  const failedLines: string[] = []

  for (const [index, line] of lines.entries()) {
    const resolvedTransaction = resolveTelegramTransaction(line, categoryMap)

    if ('error' in resolvedTransaction) {
      failedLines.push(`Linea ${index + 1}: ${resolvedTransaction.error}`)
      continue
    }

    const transaction = resolvedTransaction.transaction

    await prisma.transaction.create({
      data: {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        reimbursementStatus: transaction.reimbursementStatus,
        date: transaction.date,
        userId: user.id,
      },
    })

    savedTransactions.push(transaction)
  }

  if (savedTransactions.length === 0) {
    const errorLines = failedLines.slice(0, 5)
    const remainingErrors = failedLines.length - errorLines.length

    await sendTelegramMessage(
      chatId,
      [
        'No se pudo guardar ningun movimiento.',
        ...errorLines,
        remainingErrors > 0
          ? `Hay ${remainingErrors} errores mas en el mensaje.`
          : '',
        getTelegramFormatsHelpMessage(),
      ]
        .filter(Boolean)
        .join('\n')
    )
    return
  }

  if (lines.length === 1 && failedLines.length === 0) {
    const [savedTransaction] = savedTransactions

    await sendTelegramMessage(
      chatId,
      `Registro guardado: ${savedTransaction.type} de $${savedTransaction.amount} en ${savedTransaction.category}.`
    )
    return
  }

  const errorLines = failedLines.slice(0, 5)
  const remainingErrors = failedLines.length - errorLines.length

  await sendTelegramMessage(
    chatId,
    [
      `Carga procesada. Guarde ${savedTransactions.length} movimiento${savedTransactions.length === 1 ? '' : 's'} de ${lines.length}.`,
      failedLines.length > 0
        ? `No se pudieron guardar ${failedLines.length} linea${failedLines.length === 1 ? '' : 's'}:`
        : 'Todas las lineas se guardaron correctamente.',
      ...errorLines,
      remainingErrors > 0
        ? `Hay ${remainingErrors} errores mas en el mensaje.`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  )
}

async function processTelegramUpdate(update: any) {
  const message = update?.message
  const chatId = message?.chat?.id ? String(message.chat.id) : ''
  const text = typeof message?.text === 'string' ? message.text.trim() : ''

  if (!chatId || !text) {
    return
  }

  const normalizedText = normalizeText(text)

  if (normalizedText === '/start') {
    await sendTelegramMessage(
      chatId,
      [
        'Hola. Soy tu bot de Control de Gastos.',
        '1. Vincula tu cuenta con /link TU_CODIGO',
        '2. Registra movimientos con mensajes como:',
        'gasto 2500 comida - Supermercado pago:efectivo',
        'gasto 264000 auto - GNC 3ra Cuota 11-06-2026 pago:tarjeta reembolso:pendiente',
        'ingreso 120000 sueldo - Salario',
        'Si no envias fecha, uso la fecha actual.',
        'Tambien puedes enviar varias lineas en un solo mensaje.',
      ].join('\n')
    )
    return
  }

  if (normalizedText.startsWith('/link')) {
    await handleLinkCommand(chatId, text)
    return
  }

  if (normalizedText === '/unlink') {
    await handleUnlinkCommand(chatId)
    return
  }

  await handleTransactionMessage(chatId, text)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function startTelegramPolling() {
  const token = getTelegramToken()

  if (!token || pollingStarted) {
    return
  }

  pollingStarted = true
  let offset = 0

  console.info('Telegram polling iniciado')

  while (pollingStarted) {
    try {
      const response = await fetch(
        `${getTelegramApiUrl('getUpdates')}?timeout=20&offset=${offset}`
      )

      if (!response.ok) {
        throw new Error(`Telegram API respondio ${response.status}`)
      }

      const data = await response.json()
      const updates = Array.isArray(data.result) ? data.result : []

      for (const update of updates) {
        offset = Number(update.update_id) + 1
        await processTelegramUpdate(update)
      }
    } catch (error) {
      console.error('Error en Telegram polling:', error)
      await delay(3000)
    }
  }
}
