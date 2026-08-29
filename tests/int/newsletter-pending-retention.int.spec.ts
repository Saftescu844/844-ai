import { describe, expect, it } from 'vitest'

import {
  NEWSLETTER_PENDING_RETENTION_MS,
  stergeAbonamentePendingExpirate,
  type NewsletterRetentionQuery,
} from '@/lib/newsletter-pending-retention'

describe('newsletter pending retention cleanup', () => {
  it('deletes only unconfirmed subscriptions older than the retention cutoff', async () => {
    const apeluri: Array<{
      text: string
      values: readonly [string]
    }> = []

    const query: NewsletterRetentionQuery = async (text, values) => {
      apeluri.push({ text, values })
      return { rowCount: 3 }
    }

    const sterse = await stergeAbonamentePendingExpirate(
      query,
      new Date('2026-08-29T12:00:00.000Z'),
    )

    expect(sterse).toBe(3)
    expect(apeluri).toHaveLength(1)

    const apel = apeluri[0]

    expect(apel.text).toContain('DELETE FROM "newsletter"')
    expect(apel.text).toContain('"confirmat" = false')
    expect(apel.text).toContain('"created_at" < $1')
    expect(apel.values).toEqual(['2026-07-30T12:00:00.000Z'])
  })

  it('returns zero when PostgreSQL deletes no rows', async () => {
    const query: NewsletterRetentionQuery = async () => ({
      rowCount: 0,
    })

    await expect(
      stergeAbonamentePendingExpirate(
        query,
        new Date('2026-08-29T12:00:00.000Z'),
      ),
    ).resolves.toBe(0)
  })

  it('handles a null PostgreSQL rowCount as zero', async () => {
    const query: NewsletterRetentionQuery = async () => ({
      rowCount: null,
    })

    await expect(
      stergeAbonamentePendingExpirate(query),
    ).resolves.toBe(0)
  })

  it('uses an explicit thirty-day retention window', () => {
    expect(NEWSLETTER_PENDING_RETENTION_MS).toBe(
      30 * 24 * 60 * 60 * 1000,
    )
  })
})
