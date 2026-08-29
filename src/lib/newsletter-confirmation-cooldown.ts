export const NEWSLETTER_CONFIRMATION_COOLDOWN_MS = 10 * 60 * 1000

type CooldownQueryResult = {
  rowCount: number | null
}

export type NewsletterCooldownQuery = (
  text: string,
  values: readonly [string, string | number, string],
) => Promise<CooldownQueryResult>

/**
 * Revendică atomic dreptul de a trimite un nou email de confirmare.
 *
 * SQL-ul este static, iar valorile sunt transmise separat ca parametri.
 * Astfel, două cereri concurente pentru același abonament nu pot revendica
 * simultan aceeași fereastră de cooldown.
 */
export async function revendicaTrimitereConfirmare(
  query: NewsletterCooldownQuery,
  abonamentId: string | number,
  acum = new Date(),
): Promise<boolean> {
  const revendicatLa = acum.toISOString()
  const pragCooldown = new Date(
    acum.getTime() - NEWSLETTER_CONFIRMATION_COOLDOWN_MS,
  ).toISOString()

  const rezultat = await query(
    `UPDATE "newsletter"
SET "confirmation_last_sent_at" = $1
WHERE "id" = $2
  AND "confirmat" = false
  AND (
    "confirmation_last_sent_at" IS NULL
    OR "confirmation_last_sent_at" <= $3
  )
RETURNING "id"`,
    [revendicatLa, abonamentId, pragCooldown],
  )

  return rezultat.rowCount === 1
}
