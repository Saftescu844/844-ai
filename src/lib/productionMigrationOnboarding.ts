import type {
  Pool,
  PoolClient,
} from 'pg'

export const PRODUCTION_BASELINE_MIGRATION =
  '20260730_185012_baseline_current_schema'

export type ProductionOnboardingPreflight = {
  current_user: string
  dev_markers: number
  baseline_markers: number
  published_rows: number
  published_without_date: number
  mismatches: number
  legacy_status_exists: boolean
  payload_status_exists: boolean
  editorial_status_exists: boolean
}

export type ProductionOnboardingResult = {
  preflight: ProductionOnboardingPreflight
  aligned_rows: number
  postflight: {
    dev_markers: number
    baseline_markers: number
    mismatches: number
  }
}

async function readPreflight(
  db:
    | Pool
    | PoolClient,
): Promise<ProductionOnboardingPreflight> {
  const result =
    await db.query<ProductionOnboardingPreflight>(`
      SELECT
        current_user::text AS current_user,
        (
          SELECT count(*)::int
          FROM public.payload_migrations
          WHERE name = 'dev'
            AND batch = -1
        ) AS dev_markers,
        (
          SELECT count(*)::int
          FROM public.payload_migrations
          WHERE name = '${PRODUCTION_BASELINE_MIGRATION}'
        ) AS baseline_markers,
        (
          SELECT count(*)::int
          FROM public.articole
          WHERE status = 'published'
        ) AS published_rows,
        (
          SELECT count(*)::int
          FROM public.articole
          WHERE status = 'published'
            AND published_at IS NULL
        ) AS published_without_date,
        (
          SELECT count(*)::int
          FROM public.articole
          WHERE _status IS DISTINCT FROM status
        ) AS mismatches,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'articole'
            AND column_name = 'status'
        ) AS legacy_status_exists,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'articole'
            AND column_name = '_status'
        ) AS payload_status_exists,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'articole'
            AND column_name = 'editorial_status'
        ) AS editorial_status_exists
    `)

  const preflight =
    result.rows[0]

  if (!preflight) {
    throw new Error(
      'Production onboarding preflight returned no row.',
    )
  }

  return preflight
}

export function assertProductionOnboardingReady(
  preflight:
    ProductionOnboardingPreflight,
): void {
  if (
    preflight.current_user !==
      'postgres'
  ) {
    throw new Error(
      `Migration role must be postgres, received ${preflight.current_user}.`,
    )
  }

  if (
    !preflight
      .legacy_status_exists ||
    !preflight
      .payload_status_exists ||
    preflight
      .editorial_status_exists
  ) {
    throw new Error(
      'Legacy article publication schema is not in the expected pre-cutover state.',
    )
  }

  if (
    preflight.dev_markers !== 1 ||
    preflight.baseline_markers !== 0
  ) {
    throw new Error(
      [
        'Unexpected payload_migrations state.',
        `dev/-1=${preflight.dev_markers},`,
        `baseline=${preflight.baseline_markers}.`,
      ].join(
        ' ',
      ),
    )
  }

  if (
    preflight
      .published_without_date !==
    0
  ) {
    throw new Error(
      [
        'Legacy published rows without published_at detected:',
        String(
          preflight
            .published_without_date,
        ),
      ].join(
        ' ',
      ),
    )
  }
}

export async function inspectProductionMigrationOnboarding(
  pool:
    Pool,
): Promise<ProductionOnboardingPreflight> {
  const preflight =
    await readPreflight(
      pool,
    )

  assertProductionOnboardingReady(
    preflight,
  )

  return preflight
}

export async function applyProductionMigrationOnboarding(
  pool:
    Pool,
): Promise<ProductionOnboardingResult> {
  const client =
    await pool.connect()

  try {
    await client.query(
      'BEGIN',
    )

    try {
      await client.query(
        `SET LOCAL lock_timeout = '5s'`,
      )

      await client.query(
        `SET LOCAL statement_timeout = '30s'`,
      )

      await client.query(
        'LOCK TABLE public.articole IN SHARE ROW EXCLUSIVE MODE',
      )

      await client.query(
        'LOCK TABLE public.payload_migrations IN EXCLUSIVE MODE',
      )

      const preflight =
        await readPreflight(
          client,
        )

      assertProductionOnboardingReady(
        preflight,
      )

      const aligned =
        await client.query(`
          UPDATE public.articole
          SET _status = status
          WHERE _status IS DISTINCT FROM status
        `)

      const alignedCheck =
        await client.query<{
          mismatches: number
        }>(`
          SELECT count(*)::int AS mismatches
          FROM public.articole
          WHERE _status IS DISTINCT FROM status
        `)

      if (
        alignedCheck
          .rows[0]
          ?.mismatches !== 0
      ) {
        throw new Error(
          'Article native status alignment did not reach zero mismatches.',
        )
      }

      const removed =
        await client.query(`
          DELETE FROM public.payload_migrations
          WHERE name = 'dev'
            AND batch = -1
        `)

      if (
        removed.rowCount !== 1
      ) {
        throw new Error(
          `Expected to remove exactly one legacy dev marker, removed ${removed.rowCount ?? 0}.`,
        )
      }

      const inserted =
        await client.query(`
          INSERT INTO public.payload_migrations
            (
              name,
              batch,
              updated_at,
              created_at
            )
          VALUES
            (
              '${PRODUCTION_BASELINE_MIGRATION}',
              1,
              now(),
              now()
            )
        `)

      if (
        inserted.rowCount !== 1
      ) {
        throw new Error(
          'Expected to insert exactly one baseline migration marker.',
        )
      }

      const postflight =
        await client.query<{
          dev_markers: number
          baseline_markers: number
          mismatches: number
        }>(`
          SELECT
            (
              SELECT count(*)::int
              FROM public.payload_migrations
              WHERE name = 'dev'
                AND batch = -1
            ) AS dev_markers,
            (
              SELECT count(*)::int
              FROM public.payload_migrations
              WHERE name = '${PRODUCTION_BASELINE_MIGRATION}'
            ) AS baseline_markers,
            (
              SELECT count(*)::int
              FROM public.articole
              WHERE _status IS DISTINCT FROM status
            ) AS mismatches
        `)

      const after =
        postflight.rows[0]

      if (
        !after ||
        after.dev_markers !== 0 ||
        after.baseline_markers !== 1 ||
        after.mismatches !== 0
      ) {
        throw new Error(
          'Production onboarding postflight invariants failed.',
        )
      }

      await client.query(
        'COMMIT',
      )

      return {
        preflight,
        aligned_rows:
          aligned.rowCount ??
          0,
        postflight:
          after,
      }
    } catch (error) {
      await client.query(
        'ROLLBACK',
      )

      throw error
    }
  } finally {
    client.release()
  }
}
