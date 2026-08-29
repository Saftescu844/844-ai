import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  payloadClient: vi.fn(),
  trimiteConfirmare: vi.fn(),
  revendicaTrimitereConfirmare: vi.fn(),
}))

vi.mock('@/lib/payload', () => ({
  payloadClient: mocks.payloadClient,
}))

vi.mock('@/lib/newsletter-email', () => ({
  trimiteConfirmare: mocks.trimiteConfirmare,
}))

vi.mock('@/lib/newsletter-confirmation-cooldown', () => ({
  revendicaTrimitereConfirmare: mocks.revendicaTrimitereConfirmare,
}))

import { POST } from '@/app/api-newsletter/route'

function payloadMock() {
  return {
    find: vi.fn(),
    create: vi.fn(),
    db: {
      pool: {
        query: vi.fn(),
      },
    },
  }
}

function request(email = 'alice@example.com') {
  return new Request('http://localhost/api-newsletter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      limba: 'ro',
    }),
  })
}

async function expectGeneric(response: Response) {
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    ok: true,
    rezultat: 'verifica_emailul',
  })
}

describe('newsletter public anti-enumeration response', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the generic response for an already confirmed subscriber', async () => {
    const payload = payloadMock()

    payload.find.mockResolvedValue({
      docs: [
        {
          id: 10,
          email: 'alice@example.com',
          confirmat: true,
        },
      ],
    })

    mocks.payloadClient.mockResolvedValue(payload)

    const response = await POST(request())

    await expectGeneric(response)
    expect(mocks.trimiteConfirmare).not.toHaveBeenCalled()
  })

  it('returns the same generic response for pending subscriber in cooldown', async () => {
    const payload = payloadMock()

    payload.find.mockResolvedValue({
      docs: [
        {
          id: 11,
          email: 'alice@example.com',
          confirmat: false,
        },
      ],
    })

    mocks.payloadClient.mockResolvedValue(payload)
    mocks.revendicaTrimitereConfirmare.mockResolvedValue(false)

    const response = await POST(request())

    await expectGeneric(response)
    expect(mocks.trimiteConfirmare).not.toHaveBeenCalled()
  })

  it('returns the same response even when pending resend fails', async () => {
    const payload = payloadMock()

    payload.find.mockResolvedValue({
      docs: [
        {
          id: 12,
          email: 'alice@example.com',
          confirmat: false,
        },
      ],
    })

    mocks.payloadClient.mockResolvedValue(payload)
    mocks.revendicaTrimitereConfirmare.mockResolvedValue(true)
    mocks.trimiteConfirmare.mockRejectedValue(new Error('Brevo unavailable'))

    const response = await POST(request())

    await expectGeneric(response)
  })

  it('returns the same response for a newly created subscriber', async () => {
    const payload = payloadMock()

    payload.find.mockResolvedValue({ docs: [] })
    payload.create.mockResolvedValue({
      id: 13,
      email: 'alice@example.com',
      confirmat: false,
    })

    mocks.payloadClient.mockResolvedValue(payload)
    mocks.trimiteConfirmare.mockResolvedValue(undefined)

    const response = await POST(request())

    await expectGeneric(response)
    expect(mocks.trimiteConfirmare).toHaveBeenCalledWith(
      13,
      'alice@example.com',
      'ro',
    )
  })

  it('does not expose a concurrent unique-create failure', async () => {
    const payload = payloadMock()

    payload.find.mockResolvedValue({ docs: [] })
    payload.create.mockRejectedValue(
      new Error('duplicate key value violates unique constraint'),
    )

    mocks.payloadClient.mockResolvedValue(payload)

    const response = await POST(request())

    await expectGeneric(response)
  })

  it('keeps syntactically invalid email distinguishable as a client error', async () => {
    const response = await POST(request('not-an-email'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      eroare: 'email_invalid',
    })
  })
})
