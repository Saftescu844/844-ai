import {
  payloadClient,
} from '@/lib/payload'

export type ApplicationReadinessStatus =
  | 'ready'
  | 'not_ready'

export interface ApplicationReadinessResult {
  ok:
    boolean

  status:
    ApplicationReadinessStatus
}

export type ApplicationReadinessProbe =
  () => Promise<void>

async function defaultDatabaseProbe(): Promise<void> {
  const payload =
    await payloadClient()

  await payload
    .db
    .pool
    .query(
      'SELECT 1',
    )
}

/**
 * Readiness verifică doar dependența minimă necesară
 * pentru a servi aplicația în mod util: baza PostgreSQL.
 *
 * Nu expune detalii despre conexiune, schema DB sau eroare.
 */
export async function checkApplicationReadiness(
  probe:
    ApplicationReadinessProbe =
      defaultDatabaseProbe,
): Promise<ApplicationReadinessResult> {
  try {
    await probe()

    return {
      ok:
        true,

      status:
        'ready',
    }
  } catch {
    return {
      ok:
        false,

      status:
        'not_ready',
    }
  }
}
