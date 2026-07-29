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
  linkedObligationInstallmentCount?: number | null
  linkedObligationFirstDueDate?: string | null
}

interface ResolvedTelegramTransaction {
  type: TelegramTransactionType
  amount: number
  category: string
  description: string
  date: Date
  paymentMethod: PaymentMethod
  reimbursementStatus: ReimbursementStatus
  linkedObligationInstallmentCount?: number | null
  linkedObligationFirstDueDate?: Date | null
}

type ParseTelegramResult =
  | { transaction: ParsedTelegramTransaction }
  | { error: string }

export interface TelegramIntegrationStatus {
  configured: boolean
  botUsername: string | null
  message: string
}

interface TelegramChat {
  id?: number | string
}

interface TelegramMessage {
  chat?: TelegramChat
  text?: string
}

interface TelegramUpdate {
  message?: TelegramMessage
}

type TelegramMetadataResult =
  | {
      details: string
      paymentMethod: PaymentMethod
      reimbursementStatus: ReimbursementStatus
      linkedObligationInstallmentCount: number | null
      linkedObligationFirstDueDate: string | null
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
    'gasto 150000 hogar - Heladera fecha:2026-07-10 pago:prestamo cuotas:12 primera:2026-08-10',
    'ingreso 500000 prestamos - Prestamo personal cuotas:10 primera:2026-08-10',
    'ingreso 120000 sueldo - Salario julio fecha:30-06-2026',
    'inversion 30000 cedears - Compra mensual',
    'gasto 2500 categoria:comida descripcion:supermercado fecha:2026-06-30 pago:cuenta',
    'Tambien puedes pegar varias lineas en un solo mensaje.',
    'Si no indicas pago:, el gasto queda como sin definir.',
    'Si agregas cuotas: y primera:, tambien creo la deuda vinculada.',
  ].join('\n')
}

function getTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || ''
}

export function getTelegramIntegrationStatus(): TelegramIntegrationStatus {
  const botToken = getTelegramToken()
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim() || null

  if (!botToken) {
    return {
      configured: false,
      botUsername,
      message:
        'Falta configurar TELEGRAM_BOT_TOKEN en el backend para poder generar codigos y recibir mensajes del bot.',
    }
  }

  return {
    configured: true,
    botUsername,
    message: botUsername
      ? `Telegram listo para vincular cuentas con @${botUsername}.`
      : 'Telegram listo para vincular cuentas. Si quieres mostrar el alias del bot en la app, agrega TELEGRAM_BOT_USERNAME.',
  }
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

function roundAmount(value: number) {
  return Number(value.toFixed(2))
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

function isFinancingPaymentMethod(paymentMethod: PaymentMethod) {
  return paymentMethod === 'credit' || paymentMethod === 'loan'
}

function buildLinkedAccountType(
  transaction: ResolvedTelegramTransaction
): 'credit_card' | 'loan_payable' {
  if (transaction.type === 'income' || transaction.paymentMethod === 'loan') {
    return 'loan_payable'
  }

  return 'credit_card'
}

function buildReferenceMonthFromDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function buildInstallmentDueDate(sourceDate: Date, installmentIndex: number) {
  const sourceDay = sourceDate.getUTCDate()
  const targetYear = sourceDate.getUTCFullYear()
  const targetMonthIndex = sourceDate.getUTCMonth() + installmentIndex
  const targetMonthStart = new Date(Date.UTC(targetYear, targetMonthIndex, 1))
  const safeYear = targetMonthStart.getUTCFullYear()
  const safeMonthIndex = targetMonthStart.getUTCMonth()
  const lastDayOfMonth = new Date(
    Date.UTC(safeYear, safeMonthIndex + 1, 0)
  ).getUTCDate()
  const safeDay = Math.min(sourceDay, lastDayOfMonth)

  return new Date(Date.UTC(safeYear, safeMonthIndex, safeDay))
}

function splitAmountAcrossInstallments(
  totalAmount: number,
  installmentCount: number
) {
  const totalCents = Math.round(totalAmount * 100)
  const baseInstallmentCents = Math.floor(totalCents / installmentCount)
  let remainderCents = totalCents - baseInstallmentCents * installmentCount

  return Array.from({ length: installmentCount }, () => {
    const currentInstallmentCents =
      baseInstallmentCents + (remainderCents > 0 ? 1 : 0)

    if (remainderCents > 0) {
      remainderCents -= 1
    }

    return currentInstallmentCents / 100
  })
}

function extractTelegramMetadata(details: string): TelegramMetadataResult {
  const tokens = details.trim().split(/\s+/)
  let paymentMethod: PaymentMethod = 'not_specified'
  let reimbursementStatus: ReimbursementStatus = 'not_applicable'
  let linkedObligationInstallmentCount: number | null = null
  let linkedObligationFirstDueDate: string | null = null

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
      normalizedKey !== 'reembolsable' &&
      normalizedKey !== 'cuotas' &&
      normalizedKey !== 'primera'
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
            'El medio de pago no es valido. Usa pago:efectivo, pago:cuenta, pago:tarjeta o pago:prestamo.',
        }
      }

      paymentMethod = normalizedMethod
      tokens.pop()
      continue
    }

    if (normalizedKey === 'cuotas') {
      const installmentCount = Number(rawValue)

      if (!Number.isInteger(installmentCount) || installmentCount <= 0) {
        return {
          error:
            'La cantidad de cuotas no es valida. Usa cuotas:6, cuotas:10, etc.',
        }
      }

      linkedObligationInstallmentCount = installmentCount
      tokens.pop()
      continue
    }

    if (normalizedKey === 'primera') {
      if (!parseDateString(rawValue)) {
        return {
          error:
            'La fecha de primera cuota no es valida. Usa primera:2026-08-10 o primera:10-08-2026.',
        }
      }

      linkedObligationFirstDueDate = rawValue.trim()
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

  const requestedLinkedObligation =
    linkedObligationInstallmentCount !== null ||
    linkedObligationFirstDueDate !== null

  if (
    requestedLinkedObligation &&
    (linkedObligationInstallmentCount === null ||
      linkedObligationFirstDueDate === null)
  ) {
    return {
      error:
        'Para crear la deuda vinculada debes enviar cuotas: y primera: juntos.',
    }
  }

  return {
    details: tokens.join(' ').trim(),
    paymentMethod,
    reimbursementStatus,
    linkedObligationInstallmentCount,
    linkedObligationFirstDueDate,
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
        linkedObligationInstallmentCount:
          extractedMetadata.linkedObligationInstallmentCount,
        linkedObligationFirstDueDate:
          extractedMetadata.linkedObligationFirstDueDate,
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
        linkedObligationInstallmentCount:
          extractedMetadata.linkedObligationInstallmentCount,
        linkedObligationFirstDueDate:
          extractedMetadata.linkedObligationFirstDueDate,
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
      linkedObligationInstallmentCount:
        extractedMetadata.linkedObligationInstallmentCount,
      linkedObligationFirstDueDate:
        extractedMetadata.linkedObligationFirstDueDate,
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

  const parsedLinkedObligationFirstDueDate =
    transaction.linkedObligationFirstDueDate
      ? parseDateString(transaction.linkedObligationFirstDueDate)
      : null

  if (
    transaction.linkedObligationFirstDueDate &&
    !parsedLinkedObligationFirstDueDate
  ) {
    return {
      error:
        'La fecha de la primera cuota no es valida. Usa DD-MM-YYYY o YYYY-MM-DD.',
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
      linkedObligationInstallmentCount:
        transaction.linkedObligationInstallmentCount ?? null,
      linkedObligationFirstDueDate: parsedLinkedObligationFirstDueDate,
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

    const shouldCreateLinkedObligation =
      transaction.linkedObligationInstallmentCount !== null &&
      transaction.linkedObligationInstallmentCount !== undefined &&
      transaction.linkedObligationFirstDueDate !== null &&
      transaction.linkedObligationFirstDueDate !== undefined

    if (shouldCreateLinkedObligation) {
      const canCreateLinkedObligation =
        transaction.type === 'income' ||
        (transaction.type === 'expense' &&
          isFinancingPaymentMethod(transaction.paymentMethod))

      if (!canCreateLinkedObligation) {
        failedLines.push(
          `Linea ${index + 1}: Solo puedes crear deuda vinculada con un ingreso por prestamo o un gasto pagado con tarjeta o prestamo.`
        )
        continue
      }

      const linkedObligationInstallmentCount =
        transaction.linkedObligationInstallmentCount as number
      const linkedObligationFirstDueDate =
        transaction.linkedObligationFirstDueDate as Date

      await prisma.$transaction(async (transactionClient) => {
        const createdAccount = await transactionClient.obligationAccount.create({
          data: {
            name: transaction.description,
            type: buildLinkedAccountType(transaction),
            loanTotalAmount: roundAmount(transaction.amount),
            installmentCount: linkedObligationInstallmentCount,
            loanFirstDueDate: linkedObligationFirstDueDate,
            notes: `Generada automaticamente desde el bot a partir del ${transaction.type === 'income' ? 'ingreso' : 'gasto'} "${transaction.description}" del ${transaction.date.toISOString().slice(0, 10)}`,
            userId: user.id,
          },
        })

        const installmentAmounts = splitAmountAcrossInstallments(
          transaction.amount,
          linkedObligationInstallmentCount
        )

        await transactionClient.obligation.createMany({
          data: installmentAmounts.map((installmentAmount, installmentIndex) => {
            const dueDate = buildInstallmentDueDate(
              linkedObligationFirstDueDate,
              installmentIndex
            )

            return {
              title: `${transaction.description} - Cuota ${installmentIndex + 1} de ${linkedObligationInstallmentCount}`,
              referenceMonth: buildReferenceMonthFromDate(dueDate),
              principalAmount: roundAmount(installmentAmount),
              interestAmount: 0,
              minimumPayment: null,
              dueDate,
              status: 'open',
              notes: `Generada automaticamente desde el bot con el mensaje "${line}"`,
              accountId: createdAccount.id,
            }
          }),
        })

        await transactionClient.transaction.create({
          data: {
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            paymentMethod: transaction.paymentMethod,
            reimbursementStatus: transaction.reimbursementStatus,
            date: transaction.date,
            userId: user.id,
            linkedObligationAccountId: createdAccount.id,
          },
        })
      })
    } else {
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
    }

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

async function processTelegramUpdate(update: TelegramUpdate) {
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
        'gasto 150000 hogar - Heladera pago:prestamo cuotas:12 primera:2026-08-10',
        'ingreso 500000 prestamos - Prestamo personal cuotas:10 primera:2026-08-10',
        'ingreso 120000 sueldo - Salario',
        'Si no envias fecha, uso la fecha actual.',
        'Si agregas cuotas y primera, creo tambien la deuda vinculada.',
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
