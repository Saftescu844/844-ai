import type {
  EmailAdapter,
} from 'payload'

const BREVO_ENDPOINT =
  'https://api.brevo.com/v3/smtp/email'

export const BREVO_DEFAULT_FROM = {
  address: 'newsletter@844-ai.ro',
  name: '844-ai.ro',
} as const

type BrevoRecipient = {
  email: string
  name?: string
}

function parseAddress(
  value: unknown,
): BrevoRecipient | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return null
    }

    const match =
      trimmed.match(
        /^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/,
      )

    if (match) {
      const name = match[1]?.trim()
      const email = match[2]?.trim()

      if (!email) {
        return null
      }

      return name
        ? { email, name }
        : { email }
    }

    return { email: trimmed }
  }

  if (
    value &&
    typeof value === 'object' &&
    'address' in value &&
    typeof value.address === 'string'
  ) {
    const email = value.address.trim()

    if (!email) {
      return null
    }

    const name =
      'name' in value &&
      typeof value.name === 'string'
        ? value.name.trim()
        : ''

    return name
      ? { email, name }
      : { email }
  }

  return null
}

export function brevoRecipients(
  value: unknown,
): BrevoRecipient[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      brevoRecipients(item),
    )
  }

  const parsed = parseAddress(value)

  return parsed ? [parsed] : []
}

function messageText(
  value: unknown,
): string | undefined {
  return typeof value === 'string'
    ? value
    : undefined
}

type BrevoMessage = {
  html?: unknown
  subject?: unknown
  text?: unknown
  to?: unknown
}

export async function sendBrevoEmail(
  message: BrevoMessage,
): Promise<void> {
  const apiKey =
    process.env.BREVO_API_KEY || ''

  if (!apiKey) {
    throw new Error(
      'BREVO_API_KEY nu este configurată',
    )
  }

  const to =
    brevoRecipients(message.to)

  if (to.length === 0) {
    throw new Error(
      'Emailul Brevo nu are destinatari valizi',
    )
  }

  const subject =
    typeof message.subject === 'string'
      ? message.subject
      : ''

  if (!subject) {
    throw new Error(
      'Emailul Brevo nu are subiect',
    )
  }

  const htmlContent =
    messageText(message.html)
  const textContent =
    messageText(message.text)

  const resp = await fetch(
    BREVO_ENDPOINT,
    {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_DEFAULT_FROM.name,
          email: BREVO_DEFAULT_FROM.address,
        },
        to,
        subject,
        ...(htmlContent
          ? { htmlContent }
          : {}),
        ...(textContent
          ? { textContent }
          : {}),
      }),
    },
  )

  if (!resp.ok) {
    const detail = await resp.text()

    throw new Error(
      `Brevo ${resp.status}: ${detail}`,
    )
  }
}

export function brevoEmailAdapter():
  EmailAdapter<void> {
  return () => ({
    name: 'brevo-api',
    defaultFromAddress:
      BREVO_DEFAULT_FROM.address,
    defaultFromName:
      BREVO_DEFAULT_FROM.name,
    sendEmail: async (message) => {
      await sendBrevoEmail(message)
    },
  })
}
