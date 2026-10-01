import { afterEach, describe, expect, it, vi } from 'vitest'

const originalSecret = process.env.PAYLOAD_SECRET
const originalSiteURL = process.env.SITE_URL
const originalBrevoKey = process.env.BREVO_API_KEY

async function loadModule() {
  vi.resetModules()

  process.env.PAYLOAD_SECRET = 'audit-007-test-secret'
  process.env.SITE_URL = 'https://example.test'
  process.env.BREVO_API_KEY = 'audit-007-test-brevo-key'

  return await import('@/lib/newsletter-email')
}

afterEach(() => {
  vi.restoreAllMocks()

  if (originalSecret === undefined) delete process.env.PAYLOAD_SECRET
  else process.env.PAYLOAD_SECRET = originalSecret

  if (originalSiteURL === undefined) delete process.env.SITE_URL
  else process.env.SITE_URL = originalSiteURL

  if (originalBrevoKey === undefined) delete process.env.BREVO_API_KEY
  else process.env.BREVO_API_KEY = originalBrevoKey
})

describe('newsletter confirmation email producer v2', () => {
  it('sends a lifecycle-bound confirmation URL without email in the URL', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }))

    const { trimiteConfirmare } = await loadModule()

    const email = 'alice@example.com'

    await trimiteConfirmare(42, email, 'ro')

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [endpoint, requestInit] = fetchMock.mock.calls[0]

    expect(endpoint).toBe('https://api.brevo.com/v3/smtp/email')

    const body = JSON.parse(String(requestInit?.body)) as {
      to: Array<{ email: string }>
      htmlContent: string
    }

    expect(body.to).toEqual([{ email }])

    const hrefMatch = body.htmlContent.match(
      /href="([^"]*confirmare-newsletter[^"]*)"/,
    )

    expect(hrefMatch).not.toBeNull()

    const href = hrefMatch?.[1] ?? ''
    const confirmationURL = new URL(href)

    expect(confirmationURL.origin).toBe('https://example.test')
    expect(confirmationURL.pathname).toBe('/ro/confirmare-newsletter')
    expect(confirmationURL.searchParams.get('i')).toBe('42')
    expect(confirmationURL.searchParams.get('e')).toBeNull()
    expect(confirmationURL.searchParams.get('t')).toBeTruthy()
    expect(confirmationURL.searchParams.get('s')).toBeTruthy()

    expect(href).not.toContain(email)
    expect(href).not.toContain(
      Buffer.from(email, 'utf8').toString('base64url'),
    )
  })
})
