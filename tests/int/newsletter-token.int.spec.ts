import { afterEach, describe, expect, it, vi } from 'vitest'

const originalSecret = process.env.PAYLOAD_SECRET
const originalSiteURL = process.env.SITE_URL

async function loadModule() {
  vi.resetModules()
  process.env.PAYLOAD_SECRET = 'audit-007-test-secret'
  process.env.SITE_URL = 'https://example.test'

  return await import('@/lib/newsletter-email')
}

afterEach(() => {
  vi.restoreAllMocks()

  if (originalSecret === undefined) delete process.env.PAYLOAD_SECRET
  else process.env.PAYLOAD_SECRET = originalSecret

  if (originalSiteURL === undefined) delete process.env.SITE_URL
  else process.env.SITE_URL = originalSiteURL
})

describe('newsletter confirmation token v2', () => {
  it('builds a confirmation URL without exposing the email', async () => {
    const { construiesteLinkConfirmare, verificaTokenConfirmare } = await loadModule()

    const email = 'alice@example.com'
    const link = construiesteLinkConfirmare(42, email, 'ro')
    const url = new URL(link)

    const id = url.searchParams.get('i')
    const ts = url.searchParams.get('t')
    const sig = url.searchParams.get('s')

    expect(id).toBe('42')
    expect(url.searchParams.get('e')).toBeNull()
    expect(url.toString()).not.toContain(
      Buffer.from(email, 'utf8').toString('base64url'),
    )

    expect(
      verificaTokenConfirmare(id ?? '', email, ts ?? '', sig ?? ''),
    ).toBe(true)
  })

  it('binds the token to both subscription id and email', async () => {
    const { construiesteLinkConfirmare, verificaTokenConfirmare } = await loadModule()

    const email = 'alice@example.com'
    const url = new URL(construiesteLinkConfirmare(42, email, 'en'))

    const ts = url.searchParams.get('t') ?? ''
    const sig = url.searchParams.get('s') ?? ''

    expect(verificaTokenConfirmare('42', email, ts, sig)).toBe(true)
    expect(verificaTokenConfirmare('43', email, ts, sig)).toBe(false)
    expect(verificaTokenConfirmare('42', 'other@example.com', ts, sig)).toBe(false)
  })

  it('rejects an expired confirmation token', async () => {
    const now = 1_800_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const { construiesteLinkConfirmare, verificaTokenConfirmare } = await loadModule()

    const email = 'alice@example.com'
    const url = new URL(construiesteLinkConfirmare(42, email, 'ro'))

    const ts = url.searchParams.get('t') ?? ''
    const sig = url.searchParams.get('s') ?? ''

    vi.spyOn(Date, 'now').mockReturnValue(now + 8 * 86400000)

    expect(verificaTokenConfirmare('42', email, ts, sig)).toBe(false)
  })
})
