export const NEWSLETTER_PENDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

type RetentionQueryResult = {
  rowCount: number | null
}

export type NewsletterRetentionQuery = (
  text: string,
  values: readonly [string],
) => Promise<RetentionQueryResult>

/**
 * Șterge atomic abonamentele newsletter neconfirmate
 * mai vechi de perioada de retenție.
 */
export async function stergeAbonamentePendingExpirate(
  query: NewsletterRetentionQuery,
  acum = new Date(),
): Promise<number> {
  const pragRetentie = new Date(
    acum.getTime() - NEWSLETTER_PENDING_RETENTION_MS,
  ).toISOString()

  const rezultat = await query(
    `DELETE FROM "newsletter"
WHERE "confirmat" = false
  AND "created_at" < $1`,
    [pragRetentie],
  )

  return rezultat.rowCount ?? 0
}
