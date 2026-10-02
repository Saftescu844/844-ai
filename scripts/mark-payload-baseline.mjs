import pg from 'pg'
import { execFileSync } from 'node:child_process'

const { Client } = pg

const EXPECTED_PROJECT_REF = 'tvtnpcqawaekhmhyfrnc'
const EXPECTED_CONFIRMATION = '844-ai-dev'
const BASELINE_NAME = '20260730_185012_baseline_current_schema'

const EXPECTED_SCHEMA = Object.freeze({
  table_count: 36,
  column_count: 325,
  enum_count: 27,
  index_count: 181,
  constraint_count: 87,
  sequence_count: 30,
  trigger_count: 0,
  schema_fingerprint: 'db9c37c3309690a0e776985308924b18',
})

const applyChanges = process.argv.includes('--apply')

const schemaQuery = `
  WITH obiecte AS (
    SELECT CONCAT_WS(
      '|',
      'COLUMN',
      table_name,
      ordinal_position::text,
      column_name,
      data_type,
      udt_name,
      is_nullable,
      COALESCE(column_default, '')
    ) AS obiect
    FROM information_schema.columns
    WHERE table_schema = 'public'

    UNION ALL

    SELECT CONCAT_WS(
      '|',
      'ENUM',
      t.typname,
      e.enumsortorder::text,
      e.enumlabel
    )
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'

    UNION ALL

    SELECT CONCAT_WS(
      '|',
      'INDEX',
      tablename,
      indexname,
      indexdef
    )
    FROM pg_indexes
    WHERE schemaname = 'public'

    UNION ALL

    SELECT CONCAT_WS(
      '|',
      'CONSTRAINT',
      rel.relname,
      con.conname,
      con.contype::text,
      pg_get_constraintdef(con.oid, true)
    )
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'

    UNION ALL

    SELECT CONCAT_WS(
      '|',
      'SEQUENCE',
      c.relname
    )
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'

    UNION ALL

    SELECT CONCAT_WS(
      '|',
      'TRIGGER',
      c.relname,
      t.tgname,
      pg_get_triggerdef(t.oid, true)
    )
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
  )
  SELECT
    (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    )::int AS table_count,

    (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
    )::int AS column_count,

    (
      SELECT COUNT(DISTINCT t.oid)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
    )::int AS enum_count,

    (
      SELECT COUNT(*)
      FROM pg_indexes
      WHERE schemaname = 'public'
    )::int AS index_count,

    (
      SELECT COUNT(*)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public'
    )::int AS constraint_count,

    (
      SELECT COUNT(*)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'S'
    )::int AS sequence_count,

    (
      SELECT COUNT(*)
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
    )::int AS trigger_count,

    MD5(
      STRING_AGG(obiect, E'\n' ORDER BY obiect)
    ) AS schema_fingerprint
  FROM obiecte
`

function getCurrentBranch() {
  try {
    return execFileSync(
      'git',
      ['branch', '--show-current'],
      { encoding: 'utf8' },
    ).trim()
  } catch {
    return 'unknown'
  }
}

function extractProjectRef(connectionString) {
  try {
    const url = new URL(connectionString)
    const username = decodeURIComponent(url.username)

    const usernameMatch = username.match(/postgres\.([a-z0-9]+)/i)
    const hostnameMatch = url.hostname.match(
      /^db\.([a-z0-9]+)\.supabase\.co$/i,
    )

    return usernameMatch?.[1] ?? hostnameMatch?.[1] ?? null
  } catch {
    return null
  }
}

function verifySchema(schema) {
  for (const [key, expectedValue] of Object.entries(EXPECTED_SCHEMA)) {
    const actualValue = schema[key]

    if (String(actualValue) !== String(expectedValue)) {
      throw new Error(
        `Schema diferită la ${key}: așteptat=${expectedValue}, actual=${actualValue}`,
      )
    }
  }
}

async function readMigrationRows(client) {
  const result = await client.query(`
    SELECT
      id,
      name,
      batch::int AS batch,
      created_at,
      updated_at
    FROM public.payload_migrations
    ORDER BY id
  `)

  return result.rows
}

function verifyMigrationState(rows) {
  const baselineRows = rows.filter(
    (row) => row.name === BASELINE_NAME,
  )

  const devRows = rows.filter(
    (row) => row.name === 'dev' && row.batch === -1,
  )

  if (baselineRows.length > 1) {
    throw new Error('Baseline-ul apare de mai multe ori în payload_migrations.')
  }

  if (baselineRows.length === 1) {
    if (devRows.length !== 0) {
      throw new Error(
        'Baseline-ul și înregistrarea dev există simultan. Este necesară verificare manuală.',
      )
    }

    return 'already_marked'
  }

  if (rows.length !== 1 || devRows.length !== 1) {
    throw new Error(
      'Starea payload_migrations nu este cea așteptată: un singur rând dev cu batch=-1.',
    )
  }

  return 'ready_to_mark'
}

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL lipsește.')
  }

  const projectRef = extractProjectRef(connectionString)
  const branch = getCurrentBranch()

  console.log({
    mode: applyChanges ? 'APPLY' : 'DRY_RUN',
    branch,
    databaseProjectRef: projectRef,
    baseline: BASELINE_NAME,
  })

  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Bază refuzată. Așteptat ${EXPECTED_PROJECT_REF}, detectat ${projectRef ?? 'necunoscut'}.`,
    )
  }

  if (process.env.PAYLOAD_DB_PUSH === 'true') {
    throw new Error(
      'PAYLOAD_DB_PUSH=true este activ. Baseline-ul nu poate fi marcat în această stare.',
    )
  }

  if (applyChanges && branch !== 'staging') {
    throw new Error(
      `Modul APPLY este permis numai pe branch-ul staging. Branch actual: ${branch}`,
    )
  }

  if (
    applyChanges &&
    process.env.BASELINE_CONFIRM !== EXPECTED_CONFIRMATION
  ) {
    throw new Error(
      `Confirmare absentă. Pentru APPLY este necesar BASELINE_CONFIRM=${EXPECTED_CONFIRMATION}.`,
    )
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    if (!applyChanges) {
      const schema = (await client.query(schemaQuery)).rows[0]
      verifySchema(schema)

      const migrations = await readMigrationRows(client)
      const status = verifyMigrationState(migrations)

      console.log({
        status,
        schema,
        migrations,
      })

      return
    }

    await client.query('BEGIN')

    try {
      await client.query(`SET LOCAL lock_timeout = '5s'`)
      await client.query(`SET LOCAL statement_timeout = '20s'`)
      await client.query(
        'LOCK TABLE public.payload_migrations IN EXCLUSIVE MODE',
      )

      const schema = (await client.query(schemaQuery)).rows[0]
      verifySchema(schema)

      const migrationsBefore = await readMigrationRows(client)
      const status = verifyMigrationState(migrationsBefore)

      if (status === 'already_marked') {
        await client.query('COMMIT')

        console.log({
          status,
          schema,
          migrations: migrationsBefore,
        })

        return
      }

      const deleted = await client.query(`
        DELETE FROM public.payload_migrations
        WHERE name = 'dev'
          AND batch = -1
      `)

      if (deleted.rowCount !== 1) {
        throw new Error(
          `Ștergerea rândului dev a afectat ${deleted.rowCount} rânduri, nu 1.`,
        )
      }

      const inserted = await client.query(
        `
          INSERT INTO public.payload_migrations (name, batch)
          VALUES ($1, 1)
          RETURNING
            id,
            name,
            batch::int AS batch,
            created_at,
            updated_at
        `,
        [BASELINE_NAME],
      )

      const migrationsAfter = await readMigrationRows(client)

      await client.query('COMMIT')

      console.log({
        status: 'baseline_marked',
        inserted: inserted.rows[0],
        schema,
        migrations: migrationsAfter,
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`EROARE: ${error.message}`)
  process.exit(1)
})
