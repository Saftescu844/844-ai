import { describe, expect, it } from 'vitest'

import {
  NEWSLETTER_CONFIRMATION_COOLDOWN_MS,
  revendicaTrimitereConfirmare,
  type NewsletterCooldownQuery,
} from '@/lib/newsletter-confirmation-cooldown'

describe('newsletter confirmation resend cooldown', () => {
  it('claims the resend window when PostgreSQL updates exactly one row', async () => {
    const apeluri: Array<{
      text: string
      values: readonly [string, string | number, string]
    }> = []

    const query: NewsletterCooldownQuery = async (text, values) => {
      apeluri.push({ text, values })
      return { rowCount: 1 }
    }

    const acum = new Date('2026-08-29T12:00:00.000Z')

    const revendicat = await revendicaTrimitereConfirmare(
      query,
      42,
      acum,
    )

    expect(revendicat).toBe(true)
    expect(apeluri).toHaveLength(1)

    const apel = apeluri[0]

    expect(apel.text).toContain('UPDATE "newsletter"')
    expect(apel.text).toContain('"confirmation_last_sent_at" = $1')
    expect(apel.text).toContain('"id" = $2')
    expect(apel.text).toContain('"confirmat" = false')
    expect(apel.text).toContain('"confirmation_last_sent_at" <= $3')
    expect(apel.text).toContain('RETURNING "id"')

    expect(apel.values).toEqual([
      '2026-08-29T12:00:00.000Z',
      42,
      '2026-08-29T11:50:00.000Z',
    ])
  })

  it('rejects the resend claim when no row satisfies the cooldown predicate', async () => {
    const query: NewsletterCooldownQuery = async () => ({
      rowCount: 0,
    })

    const revendicat = await revendicaTrimitereConfirmare(
      query,
      42,
      new Date('2026-08-29T12:00:00.000Z'),
    )

    expect(revendicat).toBe(false)
  })

  it('keeps user-controlled subscription id outside the SQL text', async () => {
    const abonamentId = '1; DROP TABLE newsletter;--'

    let sqlExecutat = ''
    let parametri:
      | readonly [string, string | number, string]
      | undefined

    const query: NewsletterCooldownQuery = async (text, values) => {
      sqlExecutat = text
      parametri = values

      return { rowCount: 1 }
    }

    await revendicaTrimitereConfirmare(
      query,
      abonamentId,
      new Date('2026-08-29T12:00:00.000Z'),
    )

    expect(sqlExecutat).not.toContain(abonamentId)
    expect(parametri?.[1]).toBe(abonamentId)
  })

  it('uses an explicit ten-minute cooldown window', () => {
    expect(NEWSLETTER_CONFIRMATION_COOLDOWN_MS).toBe(10 * 60 * 1000)
  })
})
