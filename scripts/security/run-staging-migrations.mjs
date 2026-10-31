import pg from 'pg'
import { spawn } from 'node:child_process'
import { validateMigrationTarget } from './migration-target.mjs'

let client
let phase = 'preflight'
try {
  const target = validateMigrationTarget(process.env)
  client = new pg.Client({ connectionString: target.connectionString, connectionTimeoutMillis: 15_000, statement_timeout: 15_000 })
  await client.connect()
  const identity = await client.query('SELECT current_user AS role')
  if (identity.rows[0]?.role !== 'postgres') throw new Error('Unexpected migration owner')
  // Session-scoped lock prevents concurrent executions of this runner. Released on disconnect.
  const lock = await client.query('SELECT pg_try_advisory_lock(844, 3) AS acquired')
  if (!lock.rows[0]?.acquired) throw new Error('Another migration job holds the release lock')
  console.log(`SEC-003 migration job: target ${target.label}; preflight passed`)
  phase = 'migration command'
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'db:migrate:up'], {
      env: { ...process.env, PAYLOAD_DB_MODE: 'legacy', PAYLOAD_DB_PUSH: 'false', PAYLOAD_DROP_DATABASE: 'false' },
      // Avoid forwarding driver/CLI errors that could contain connection credentials.
      stdio: 'ignore',
      timeout: 300_000,
      killSignal: 'SIGKILL',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0 && !signal ? resolve() : reject(new Error('Migration command did not finish successfully')))
  })
  phase = 'completeness verification'
  const { migrations } = await import('../../src/migrations/index.ts')
  const result = await client.query('SELECT name FROM public.payload_migrations')
  const applied = new Set(result.rows.map(row => row.name))
  if (migrations.some(({ name }) => !applied.has(name))) throw new Error('Migration history is incomplete')
  const schema = await client.query("SELECT to_regclass('public.useri') IS NOT NULL AND to_regclass('public.flash_engine_runs') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='articole' AND column_name='editorial_status') AS ready")
  if (!schema.rows[0]?.ready) throw new Error('Schema verification failed')
  console.log(`SEC-003 migration job PASS: ${migrations.length} expected migrations recorded; schema checks passed`)
} catch {
  // Deliberately redact underlying connection/CLI errors; never print the URL or password.
  console.error(`SEC-003 migration job FAILED during ${phase}; stop rollout and inspect through a secret-safe channel`)
  process.exitCode = 1
} finally {
  await client?.end()
}
