import { prisma } from './prisma'

type TelegramTransactionType = 'income' | 'expense' | 'investments'

interface ParsedTelegramTransaction {
  type: TelegramTransactionType
  amount: number
  category: string
  description: string
  date: string
}

let pollingStarted = false
const TELEGRAM_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

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
  if (!TELEGRAM_DATE_PATTERN.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
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

function extractDateFromDetails(details: string) {
  const labeledDateMatch = details.match(
    /^(.*?)\s+fecha:\s*(\d{4}-\d{2}-\d{2})$/i
  )

  if (labeledDateMatch) {
    return {
      details: labeledDateMatch[1].trim(),
      date: labeledDateMatch[2].trim(),
    }
  }

  const trailingDateMatch = details.match(/^(.*?)\s+-\s+(\d{4}-\d{2}-\d{2})$/)

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

function parseTelegramTransaction(
  text: string
): ParsedTelegramTransaction | null {
  const trimmedText = text.trim()
  const mainMatch = trimmedText.match(
    /^(gasto|ingreso|inversion|inversión|expense|income|investment|investments)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/i
  )

  if (!mainMatch) {
    return null
  }

  const type = mapTelegramType(mainMatch[1])
  const amount = Number(mainMatch[2].replace(',', '.'))
  const details = mainMatch[3].trim()

  if (!type || !Number.isFinite(amount) || amount <= 0) {
    return null
  }

  const explicitFieldsMatch = details.match(
    /^categoria:\s*(.+?)\s+descripcion:\s*(.+?)(?:\s+fecha:\s*(\d{4}-\d{2}-\d{2}))?$/i
  )

  if (explicitFieldsMatch) {
    return {
      type,
      amount,
      category: explicitFieldsMatch[1].trim(),
      description: explicitFieldsMatch[2].trim(),
      date: explicitFieldsMatch[3]?.trim() || getTodayDateString(),
    }
  }

  const extractedDetails = extractDateFromDetails(details)
  const compactFormatMatch = extractedDetails.details.match(/^(.+?)\s+-\s+(.+)$/)

  if (compactFormatMatch) {
    return {
      type,
      amount,
      category: compactFormatMatch[1].trim(),
      description: compactFormatMatch[2].trim(),
      date: extractedDetails.date,
    }
  }

  const [firstWord] = extractedDetails.details.split(/\s+/)

  if (!firstWord) {
    return null
  }

  return {
    type,
    amount,
    category: firstWord.trim(),
    description: extractedDetails.details,
    date: extractedDetails.date,
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

  const parsedTransaction = parseTelegramTransaction(text)

  if (!parsedTransaction) {
    await sendTelegramMessage(
      chatId,
      [
        'No pude entender el registro.',
        'Prueba alguno de estos formatos:',
        'gasto 2500 comida - Supermercado',
        'gasto 2500 comida - Supermercado - 2026-07-12',
        'ingreso 120000 sueldo - Salario',
        'ingreso 120000 sueldo - Salario julio fecha:2026-07-12',
        'inversion 30000 cedears - Compra mensual',
        'gasto 2500 categoria:comida descripcion:supermercado fecha:2026-07-12',
      ].join('\n')
    )
    return
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
      type: parsedTransaction.type,
    },
    orderBy: {
      name: 'asc',
    },
  })

  const matchedCategory = categories.find(
    (category) =>
      normalizeText(category.name) === normalizeText(parsedTransaction.category)
  )

  if (!matchedCategory) {
    const availableCategories = categories.map((category) => category.name)

    await sendTelegramMessage(
      chatId,
      availableCategories.length > 0
        ? `No encontre la categoria "${parsedTransaction.category}". Usa una de estas: ${availableCategories.join(', ')}`
        : 'No tienes categorias creadas para ese tipo. Crea una categoria en la app y vuelve a intentarlo.'
    )
    return
  }

  const parsedDate = parseDateString(parsedTransaction.date)

  if (!parsedDate) {
    await sendTelegramMessage(chatId, 'La fecha enviada no es valida.')
    return
  }

  await prisma.transaction.create({
    data: {
      description: parsedTransaction.description,
      amount: parsedTransaction.amount,
      type: parsedTransaction.type,
      category: matchedCategory.name,
      date: parsedDate,
      userId: user.id,
    },
  })

  await sendTelegramMessage(
    chatId,
    `Registro guardado: ${parsedTransaction.type} de $${parsedTransaction.amount} en ${matchedCategory.name}.`
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
        'gasto 2500 comida - Supermercado',
        'gasto 2500 comida - Supermercado - 2026-07-12',
        'ingreso 120000 sueldo - Salario',
        'Si no envias fecha, uso la fecha actual.',
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
