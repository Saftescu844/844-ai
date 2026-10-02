import crypto from 'crypto'

const WINDOW_MS =
  30 * 60 * 1000
const MAX_ATTEMPTS = 5

type QueryResult = {
  rows?: Array<{
    count?: unknown
  }>
}

type QueryFn = (
  sql: string,
  values: readonly unknown[],
) => Promise<QueryResult>

function clientIp(
  headers: Headers,
): string | null {
  const forwarded =
    headers.get('x-forwarded-for')

  if (forwarded) {
    const first =
      forwarded
        .split(',')[0]
        ?.trim()

    if (first) {
      return first
    }
  }

  const realIp =
    headers.get('x-real-ip')?.trim()

  return realIp || null
}

export function passwordRecoveryRateLimitKey(
  headers: Headers,
  secret: string,
): string | null {
  const ip = clientIp(headers)

  if (!ip || !secret) {
    return null
  }

  const digest =
    crypto
      .createHmac('sha256', secret)
      .update(ip)
      .digest('hex')

  return `password-recovery:${digest}`
}

export async function claimPasswordRecoveryAttempt(
  query: QueryFn,
  headers: Headers,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const key =
    passwordRecoveryRateLimitKey(
      headers,
      secret,
    )

  if (!key) {
    return true
  }

  const cutoff =
    now - WINDOW_MS

  const result =
    await query(
      `
        INSERT INTO "payload_kv" ("key", "data")
        VALUES (
          $1,
          jsonb_build_object(
            'windowStart',
            $2::bigint,
            'count',
            1
          )
        )
        ON CONFLICT ("key") DO UPDATE
        SET "data" = CASE
          WHEN COALESCE(
            ("payload_kv"."data"->>'windowStart')::bigint,
            0
          ) <= $3::bigint
          THEN jsonb_build_object(
            'windowStart',
            $2::bigint,
            'count',
            1
          )
          ELSE jsonb_set(
            "payload_kv"."data",
            '{count}',
            to_jsonb(
              COALESCE(
                ("payload_kv"."data"->>'count')::integer,
                0
              ) + 1
            ),
            true
          )
        END
        RETURNING
          COALESCE(
            ("data"->>'count')::integer,
            0
          ) AS "count"
      `,
      [key, now, cutoff],
    )

  const rawCount =
    result.rows?.[0]?.count

  const count =
    typeof rawCount === 'number'
      ? rawCount
      : Number(rawCount)

  if (!Number.isFinite(count)) {
    return false
  }

  return count <= MAX_ATTEMPTS
}

export const PASSWORD_RECOVERY_RATE_LIMIT = {
  maxAttempts: MAX_ATTEMPTS,
  windowMs: WINDOW_MS,
} as const
