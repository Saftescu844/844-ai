import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  parsePublicAccountInput,
} from '../../src/lib/public-account'
import {
  publicAuthorName,
  publicRelationshipId,
  serializePublicComment,
} from '../../src/lib/public-comments'
import {
  claimPublicRegistrationAttempt,
  publicRegistrationRateLimitKey,
} from '../../src/lib/public-registration-rate-limit'

describe('U14.7I public account contract', () => {
  it('normalizes a valid registration payload', () => {
    expect(
      parsePublicAccountInput({
        email: '  USER@Example.COM ',
        parola: '1234567890',
        nume: '  Ana Pop ',
        limba: 'en',
      }),
    ).toEqual({
      ok: true,
      value: {
        email: 'user@example.com',
        parola: '1234567890',
        nume: 'Ana Pop',
        limba: 'en',
      },
    })
  })

  it('defaults the public language to Romanian', () => {
    const result =
      parsePublicAccountInput({
        email: 'user@example.com',
        parola: '1234567890',
        nume: 'Ana',
        limba: 'de',
      })

    expect(result).toEqual({
      ok: true,
      value: {
        email: 'user@example.com',
        parola: '1234567890',
        nume: 'Ana',
        limba: 'ro',
      },
    })
  })

  it('rejects malformed email addresses', () => {
    expect(
      parsePublicAccountInput({
        email: 'invalid',
        parola: '1234567890',
        nume: 'Ana',
      }),
    ).toEqual({
      ok: false,
      camp: 'email',
    })
  })

  it('rejects passwords shorter than ten characters', () => {
    expect(
      parsePublicAccountInput({
        email: 'user@example.com',
        parola: '123456789',
        nume: 'Ana',
      }),
    ).toEqual({
      ok: false,
      camp: 'parola',
    })
  })

  it('rejects display names outside the allowed range', () => {
    expect(
      parsePublicAccountInput({
        email: 'user@example.com',
        parola: '1234567890',
        nume: 'A',
      }),
    ).toEqual({
      ok: false,
      camp: 'nume',
    })
  })
})

describe('U14.7I public comments serialization', () => {
  it('extracts relationship IDs from IDs and populated objects', () => {
    expect(
      publicRelationshipId(5),
    ).toBe(5)

    expect(
      publicRelationshipId({
        id: 9,
        continut: 'ignored',
      }),
    ).toBe(9)

    expect(
      publicRelationshipId(null),
    ).toBeNull()
  })

  it('uses only the public display name from the author relation', () => {
    expect(
      publicAuthorName({
        id: 7,
        nume: 'Gabriel',
        email: 'secret@example.com',
        rol: 'admin',
      }),
    ).toBe('Gabriel')
  })

  it('falls back safely when the author has no public name', () => {
    expect(
      publicAuthorName({
        id: 7,
        email: 'secret@example.com',
      }),
    ).toBe('Cititor 844-ai')
  })

  it('serializes only the public comment contract', () => {
    const result =
      serializePublicComment({
        id: 11,
        continut: 'Comentariu public',
        createdAt:
          '2026-09-19T10:00:00.000Z',
        raspunsLa: {
          id: 4,
          status: 'aprobat',
        },
        autor: {
          id: 7,
          nume: 'Gabriel',
          email: 'secret@example.com',
          rol: 'admin',
          nivelAbonament: 'complet',
        },
      })

    expect(result).toEqual({
      id: 11,
      continut: 'Comentariu public',
      createdAt:
        '2026-09-19T10:00:00.000Z',
      raspunsLa: 4,
      autor: {
        nume: 'Gabriel',
      },
    })

    expect(
      JSON.stringify(result),
    ).not.toContain('secret@example.com')
    expect(
      JSON.stringify(result),
    ).not.toContain('admin')
    expect(
      JSON.stringify(result),
    ).not.toContain('complet')
  })
})


describe('U14.7I public registration rate limit', () => {
  it('hashes the client IP without storing it in the key', () => {
    const headers =
      new Headers({
        'x-forwarded-for':
          '203.0.113.10, 10.0.0.1',
      })

    const key =
      publicRegistrationRateLimitKey(
        headers,
        'test-secret',
      )

    expect(key).toMatch(
      /^public-register:[a-f0-9]{64}$/,
    )
    expect(key).not.toContain(
      '203.0.113.10',
    )

    expect(
      publicRegistrationRateLimitKey(
        headers,
        'test-secret',
      ),
    ).toBe(key)
  })

  it('does not create a shared global bucket when client IP is unavailable', () => {
    expect(
      publicRegistrationRateLimitKey(
        new Headers(),
        'test-secret',
      ),
    ).toBeNull()
  })

  it('allows attempts through the configured maximum', async () => {
    const headers =
      new Headers({
        'x-real-ip': '203.0.113.20',
      })

    const allowed =
      await claimPublicRegistrationAttempt(
        async () => ({
          rows: [
            {
              count: 5,
            },
          ],
        }),
        headers,
        'test-secret',
        1000,
      )

    expect(allowed).toBe(true)
  })

  it('blocks attempts above the configured maximum', async () => {
    const headers =
      new Headers({
        'x-real-ip': '203.0.113.20',
      })

    const allowed =
      await claimPublicRegistrationAttempt(
        async () => ({
          rows: [
            {
              count: 6,
            },
          ],
        }),
        headers,
        'test-secret',
        1000,
      )

    expect(allowed).toBe(false)
  })

  it('fails closed when the rate-limit counter is malformed', async () => {
    const headers =
      new Headers({
        'x-real-ip': '203.0.113.20',
      })

    const allowed =
      await claimPublicRegistrationAttempt(
        async () => ({
          rows: [
            {
              count: 'invalid',
            },
          ],
        }),
        headers,
        'test-secret',
        1000,
      )

    expect(allowed).toBe(false)
  })
})
