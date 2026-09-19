import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  BREVO_DEFAULT_FROM,
  brevoEmailAdapter,
  brevoRecipients,
} from '../../src/lib/brevo-email-adapter'
import {
  accountLanguage,
  passwordResetHTML,
  passwordResetSubject,
} from '../../src/lib/password-recovery-email'
import {
  claimPasswordRecoveryAttempt,
  passwordRecoveryRateLimitKey,
} from '../../src/lib/password-recovery-rate-limit'

describe('U14.7I password recovery email', () => {
  it('builds Romanian reset content with the encoded token', () => {
    const html =
      passwordResetHTML(
        'abc+/=',
        'ro',
        'https://staging.example',
      )

    expect(
      passwordResetSubject('ro'),
    ).toBe(
      'Resetează parola contului 844-ai.ro',
    )

    expect(html).toContain(
      'https://staging.example/ro/resetare-parola?token=abc%2B%2F%3D',
    )
    expect(html).toContain(
      'Linkul este valabil o oră.',
    )
  })

  it('builds English reset content and selects the account language safely', () => {
    expect(
      accountLanguage({
        limbaPreferata: 'en',
      }),
    ).toBe('en')

    expect(
      accountLanguage({
        limbaPreferata: 'de',
      }),
    ).toBe('ro')

    expect(
      passwordResetHTML(
        'token',
        'en',
        'https://staging.example',
      ),
    ).toContain(
      'https://staging.example/en/resetare-parola?token=token',
    )
  })
})

describe('U14.7I Brevo adapter contract', () => {
  it('normalizes Payload recipient shapes', () => {
    expect(
      brevoRecipients([
        'reader@example.com',
        {
          address:
            'admin@example.com',
          name: 'Admin',
        },
        '"Editor" <editor@example.com>',
      ]),
    ).toEqual([
      {
        email:
          'reader@example.com',
      },
      {
        email:
          'admin@example.com',
        name: 'Admin',
      },
      {
        email:
          'editor@example.com',
        name: 'Editor',
      },
    ])
  })

  it('exposes the expected Payload adapter identity and sender', () => {
    const adapter =
      brevoEmailAdapter()({
        payload: {} as never,
      })

    expect(adapter.name).toBe(
      'brevo-api',
    )
    expect(
      adapter.defaultFromAddress,
    ).toBe(
      BREVO_DEFAULT_FROM.address,
    )
    expect(
      adapter.defaultFromName,
    ).toBe(
      BREVO_DEFAULT_FROM.name,
    )
  })
})

describe('U14.7I password recovery rate limit', () => {
  it('hashes the client IP without storing it in the key', () => {
    const headers =
      new Headers({
        'x-forwarded-for':
          '203.0.113.40, 10.0.0.1',
      })

    const key =
      passwordRecoveryRateLimitKey(
        headers,
        'test-secret',
      )

    expect(key).toMatch(
      /^password-recovery:[a-f0-9]{64}$/,
    )
    expect(key).not.toContain(
      '203.0.113.40',
    )
  })

  it('allows attempts through the configured maximum', async () => {
    const allowed =
      await claimPasswordRecoveryAttempt(
        async () => ({
          rows: [
            {
              count: 5,
            },
          ],
        }),
        new Headers({
          'x-real-ip':
            '203.0.113.50',
        }),
        'test-secret',
        1000,
      )

    expect(allowed).toBe(true)
  })

  it('blocks attempts above the configured maximum', async () => {
    const allowed =
      await claimPasswordRecoveryAttempt(
        async () => ({
          rows: [
            {
              count: 6,
            },
          ],
        }),
        new Headers({
          'x-real-ip':
            '203.0.113.50',
        }),
        'test-secret',
        1000,
      )

    expect(allowed).toBe(false)
  })

  it('fails closed when the counter is malformed', async () => {
    const allowed =
      await claimPasswordRecoveryAttempt(
        async () => ({
          rows: [
            {
              count: 'invalid',
            },
          ],
        }),
        new Headers({
          'x-real-ip':
            '203.0.113.50',
        }),
        'test-secret',
        1000,
      )

    expect(allowed).toBe(false)
  })
})
