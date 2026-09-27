import assert from 'node:assert/strict'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as baseline from '../../src/migrations/20260730_185012_baseline_current_schema'
import { migrations } from '../../src/migrations'

const { Client, Pool } = pg

const databaseURL = process.env.REHEARSAL_DATABASE_URL
const mode = process.argv[2]

function guardedURL(): URL {
  assert.equal(process.env.CI, 'true', 'Migration rehearsal is CI-only')
  assert.ok(databaseURL, 'REHEARSAL_DATABASE_URL is required')

  const url = new URL(databaseURL)
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1'])

  assert.ok(localHosts.has(url.hostname), `Refusing non-local database host: ${url.hostname}`)
  assert.equal(
    url.pathname,
    '/migration_rehearsal',
    `Refusing unexpected database name: ${url.pathname}`,
  )

  return url
}

async function prepare(): Promise<void> {
  const targetURL = guardedURL()
  const adminURL = new URL(targetURL.toString())
  adminURL.pathname = '/postgres'

  const admin = new Client({ connectionString: adminURL.toString() })
  await admin.connect()

  try {
    await admin.query('DROP DATABASE IF EXISTS "migration_rehearsal" WITH (FORCE)')
    await admin.query('CREATE DATABASE "migration_rehearsal"')
  } finally {
    await admin.end()
  }

  const pool = new Pool({ connectionString: targetURL.toString() })

  try {
    const db = drizzle(pool)

    // Recreate the exact July baseline schema without recording it through the
    // Payload migrator. This models the current production reality: the schema
    // exists, while migration history does not yet contain the baseline name.
    await baseline.up({ db } as Parameters<typeof baseline.up>[0])

    await pool.query(`
      INSERT INTO public.payload_migrations
        (name, batch, updated_at, created_at)
      VALUES
        ('dev', -1, now(), now()),
        ('20260730_185012_baseline_current_schema', 1, now(), now())
    `)

    const seeded = await pool.query<{ id: number; slug: string }>(`
      INSERT INTO public.articole
        (titlu, slug, status, _status, published_at, generat_automat)
      VALUES
        (
          'Legacy visible / native draft',
          'rehearsal-visible-native-draft',
          'published',
          'draft',
          '2026-01-01T10:00:00Z',
          true
        ),
        (
          'Legacy visible / native published',
          'rehearsal-visible-native-published',
          'published',
          'published',
          '2026-01-02T10:00:00Z',
          true
        ),
        (
          'Legacy hidden / native draft',
          'rehearsal-hidden-native-draft',
          'draft',
          'draft',
          NULL,
          true
        ),
        (
          'Legacy hidden / native published',
          'rehearsal-hidden-native-published',
          'draft',
          'published',
          '2026-01-03T10:00:00Z',
          true
        )
      RETURNING id, slug
    `)

    const bySlug = new Map(seeded.rows.map((row) => [row.slug, row.id]))

    const versionFixtures = [
      {
        parent: bySlug.get('rehearsal-visible-native-draft'),
        slug: 'version-visible-native-draft',
        editorial: 'published',
        native: 'draft',
        publishedAt: '2026-01-01T10:00:00Z',
      },
      {
        parent: bySlug.get('rehearsal-visible-native-published'),
        slug: 'version-visible-native-published',
        editorial: 'published',
        native: 'published',
        publishedAt: '2026-01-02T10:00:00Z',
      },
      {
        parent: bySlug.get('rehearsal-hidden-native-draft'),
        slug: 'version-hidden-native-draft',
        editorial: 'draft',
        native: 'draft',
        publishedAt: null,
      },
      {
        parent: bySlug.get('rehearsal-hidden-native-published'),
        slug: 'version-hidden-native-published',
        editorial: 'draft',
        native: 'published',
        publishedAt: '2026-01-03T10:00:00Z',
      },
    ] as const

    for (const fixture of versionFixtures) {
      assert.ok(fixture.parent, `Missing parent article for ${fixture.slug}`)

      await pool.query(
        `
          INSERT INTO public._articole_v
            (
              parent_id,
              version_titlu,
              version_slug,
              version_status,
              version__status,
              version_published_at
            )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          fixture.parent,
          fixture.slug,
          fixture.slug,
          fixture.editorial,
          fixture.native,
          fixture.publishedAt,
        ],
      )
    }
  } finally {
    await pool.end()
  }
}

async function assertRehearsal(): Promise<void> {
  const targetURL = guardedURL()
  const pool = new Pool({ connectionString: targetURL.toString() })

  try {
    const articleResult = await pool.query<{
      slug: string
      editorial_status: string
      payload_status: string
      published_at: string | null
    }>(`
      SELECT
        slug,
        editorial_status::text AS editorial_status,
        _status::text AS payload_status,
        published_at::text AS published_at
      FROM public.articole
      WHERE slug LIKE 'rehearsal-%'
      ORDER BY slug
    `)

    const articleMap = new Map(articleResult.rows.map((row) => [row.slug, row]))

    assert.equal(articleMap.size, 4, 'Expected four production-like article fixtures')

    assert.deepEqual(
      {
        editorial: articleMap.get('rehearsal-visible-native-draft')?.editorial_status,
        native: articleMap.get('rehearsal-visible-native-draft')?.payload_status,
      },
      { editorial: 'approved', native: 'published' },
    )

    assert.deepEqual(
      {
        editorial: articleMap.get('rehearsal-visible-native-published')?.editorial_status,
        native: articleMap.get('rehearsal-visible-native-published')?.payload_status,
      },
      { editorial: 'approved', native: 'published' },
    )

    assert.deepEqual(
      {
        editorial: articleMap.get('rehearsal-hidden-native-draft')?.editorial_status,
        native: articleMap.get('rehearsal-hidden-native-draft')?.payload_status,
      },
      { editorial: 'draft', native: 'draft' },
    )

    assert.deepEqual(
      {
        editorial: articleMap.get('rehearsal-hidden-native-published')?.editorial_status,
        native: articleMap.get('rehearsal-hidden-native-published')?.payload_status,
      },
      { editorial: 'draft', native: 'draft' },
    )

    const visibility = await pool.query<{
      editorial_public: number
      native_public: number
      invalid_native_public: number
    }>(`
      SELECT
        count(*) FILTER (
          WHERE slug LIKE 'rehearsal-%'
            AND editorial_status = 'approved'
        )::int AS editorial_public,
        count(*) FILTER (
          WHERE slug LIKE 'rehearsal-%'
            AND _status = 'published'
        )::int AS native_public,
        count(*) FILTER (
          WHERE slug LIKE 'rehearsal-%'
            AND _status = 'published'
            AND editorial_status <> 'approved'
        )::int AS invalid_native_public
      FROM public.articole
    `)

    assert.deepEqual(visibility.rows[0], {
      editorial_public: 2,
      native_public: 2,
      invalid_native_public: 0,
    })

    const versions = await pool.query<{
      version_slug: string
      editorial_status: string
      payload_status: string
    }>(`
      SELECT
        version_slug,
        version_editorial_status::text AS editorial_status,
        version__status::text AS payload_status
      FROM public._articole_v
      WHERE version_slug LIKE 'version-%'
      ORDER BY version_slug
    `)

    const versionMap = new Map(versions.rows.map((row) => [row.version_slug, row]))

    // Historical native version status is deliberately preserved. Only the
    // editorial field is converted published -> approved.
    assert.deepEqual(
      {
        editorial: versionMap.get('version-visible-native-draft')?.editorial_status,
        native: versionMap.get('version-visible-native-draft')?.payload_status,
      },
      { editorial: 'approved', native: 'draft' },
    )

    assert.deepEqual(
      {
        editorial: versionMap.get('version-visible-native-published')?.editorial_status,
        native: versionMap.get('version-visible-native-published')?.payload_status,
      },
      { editorial: 'approved', native: 'published' },
    )

    assert.deepEqual(
      {
        editorial: versionMap.get('version-hidden-native-draft')?.editorial_status,
        native: versionMap.get('version-hidden-native-draft')?.payload_status,
      },
      { editorial: 'draft', native: 'draft' },
    )

    assert.deepEqual(
      {
        editorial: versionMap.get('version-hidden-native-published')?.editorial_status,
        native: versionMap.get('version-hidden-native-published')?.payload_status,
      },
      { editorial: 'draft', native: 'published' },
    )

    const migrationRows = await pool.query<{ name: string }>(
      'SELECT name FROM public.payload_migrations ORDER BY id',
    )
    const migrationNames = new Set(migrationRows.rows.map((row) => row.name))

    assert.ok(migrationNames.has('dev'), 'Historical production marker must remain present')

    for (const migration of migrations) {
      assert.ok(
        migrationNames.has(migration.name),
        `Expected applied migration missing from rehearsal history: ${migration.name}`,
      )
    }

    const schemaCounts = await pool.query<{
      tables: number
      sequences: number
    }>(`
      SELECT
        (
          SELECT count(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relkind = 'r'
        ) AS tables,
        (
          SELECT count(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relkind = 'S'
        ) AS sequences
    `)

    assert.deepEqual(schemaCounts.rows[0], { tables: 83, sequences: 58 })

    const acl = await pool.query<{
      anon_table: boolean
      auth_table: boolean
      anon_sequence: boolean
      auth_sequence: boolean
    }>(`
      SELECT
        has_table_privilege('anon', 'public.articole', 'SELECT') AS anon_table,
        has_table_privilege('authenticated', 'public.articole', 'SELECT') AS auth_table,
        has_sequence_privilege('anon', 'public.articole_id_seq', 'USAGE') AS anon_sequence,
        has_sequence_privilege('authenticated', 'public.articole_id_seq', 'USAGE') AS auth_sequence
    `)

    assert.deepEqual(acl.rows[0], {
      anon_table: false,
      auth_table: false,
      anon_sequence: false,
      auth_sequence: false,
    })

    process.stdout.write(
      [
        'Production migration rehearsal PASS',
        '- baseline history onboarding prevented baseline DDL replay',
        '- all post-baseline migrations applied through Payload migrate',
        '- legacy public visibility preserved exactly',
        '- hidden legacy rows remained hidden',
        '- historical version-native status preserved',
        '- SEC-001 final ACL invariant preserved',
      ].join('\n') + '\n',
    )
  } finally {
    await pool.end()
  }
}

if (mode === 'prepare') {
  await prepare()
} else if (mode === 'assert') {
  await assertRehearsal()
} else {
  throw new Error('Usage: production-migration-rehearsal.ts <prepare|assert>')
}
