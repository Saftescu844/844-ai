import assert from 'node:assert/strict'
import pg from 'pg'

import { migrations } from '../../src/migrations'

const databaseURL =
  process.env.DATABASE_URL

function guardedURL(): URL {
  assert.equal(
    process.env.CI,
    'true',
    'Migration completeness verification is CI-only',
  )

  assert.ok(
    databaseURL,
    'DATABASE_URL is required',
  )

  const url =
    new URL(
      databaseURL,
    )

  const localHosts =
    new Set([
      '127.0.0.1',
      'localhost',
      '::1',
    ])

  assert.ok(
    localHosts.has(
      url.hostname,
    ),
    'Refusing non-local database host: ' +
      url.hostname,
  )

  assert.ok(
    url.pathname ===
      '/ci' ||
      url.pathname ===
        '/migration_rehearsal',
    'Refusing unexpected CI database name: ' +
      url.pathname,
  )

  return url
}

const url =
  guardedURL()

const client =
  new pg.Client({
    connectionString:
      url.toString(),
  })

await client.connect()

try {
  const history =
    await client.query<{
      name:
        string
    }>(
      'SELECT name FROM public.payload_migrations ORDER BY id',
    )

  const applied =
    new Set(
      history.rows.map(
        row =>
          row.name,
      ),
    )

  const missing =
    migrations
      .map(
        migration =>
          migration.name,
      )
      .filter(
        name =>
          !applied.has(
            name,
          ),
      )

  assert.deepEqual(
    missing,
    [],
    'Missing Payload migrations: ' +
      missing.join(', '),
  )

  const schema =
    await client.query<{
      useri:
        string | null

      flash_engine_runs:
        string | null

      editorial_status:
        boolean
    }>(`
      SELECT
        to_regclass('public.useri')::text AS useri,
        to_regclass('public.flash_engine_runs')::text AS flash_engine_runs,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'articole'
            AND column_name = 'editorial_status'
        ) AS editorial_status
    `)

  assert.equal(
    schema.rows[0]?.useri,
    'useri',
    'Expected migrated useri table',
  )

  assert.equal(
    schema.rows[0]?.flash_engine_runs,
    'flash_engine_runs',
    'Expected migrated flash_engine_runs table',
  )

  assert.equal(
    schema.rows[0]?.editorial_status,
    true,
    'Expected migrated articole.editorial_status column',
  )

  process.stdout.write(
    'CI migration completeness PASS (' +
      url.pathname.slice(1) +
      ')\n',
  )
} finally {
  await client.end()
}
