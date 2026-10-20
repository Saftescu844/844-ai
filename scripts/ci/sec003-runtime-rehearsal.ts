import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { assertRuntimeDatabase, databaseRuntimeOptions } from '../../src/lib/database-runtime'

// This script creates a role and test records. Refuse all hosted databases BEFORE connecting.
const source = new URL(process.env.DATABASE_URL || '')
assert.equal(process.env.CI, 'true')
assert.equal(source.hostname, '127.0.0.1')
assert.equal(source.pathname, '/ci')
assert.equal(source.port, '5432')
assert.equal(source.search, '')
assert.equal(source.username, 'postgres')
const owner = new pg.Client({ connectionString: source.toString() })
await owner.connect()
const password = randomBytes(24).toString('hex')
let runtime: pg.Pool | undefined
let payload: import('payload').Payload | undefined
try {
  await owner.query(await readFile(new URL('../security/sec003-provision-runtime.sql', import.meta.url), 'utf8'))
  // Generated, ephemeral CI password. Never logged; never used outside the service container.
  await owner.query(`ALTER ROLE payload_runtime LOGIN PASSWORD '${password}'`)
  source.username = 'payload_runtime'
  source.password = password
  runtime = new pg.Pool({ connectionString: source.toString() })
  await assertRuntimeDatabase(runtime, [])
  await assert.rejects(assertRuntimeDatabase(runtime, ['sec003_missing_migration']))
  const privilegedPool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await assert.rejects(assertRuntimeDatabase(privilegedPool, []))
  } finally {
    await privilegedPool.end()
  }
  for (const sql of [
    'CREATE TABLE public.sec003_forbidden(id int)',
    'ALTER TABLE public.useri ADD COLUMN sec003_forbidden text',
    'DROP TABLE public.newsletter_segment',
    'TRUNCATE public.newsletter',
    "DELETE FROM public.payload_migrations WHERE false",
    "INSERT INTO public.payload_migrations(name,batch) VALUES ('sec003_forbidden',999)",
    'CREATE ROLE sec003_forbidden',
    'SET ROLE postgres',
  ]) {
    await assert.rejects(runtime.query(sql), (e: unknown) => (e as { code?: string }).code === '42501')
  }
  const publicACL = await owner.query(`SELECT count(*)::int AS n FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated')) r(name)
    WHERE n.nspname='public' AND c.relkind='r'
    AND has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE')`)
  assert.equal(publicACL.rows[0].n, 0)
  const policies = await owner.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public' AND policyname='sec003_payload_runtime' AND roles=ARRAY['payload_runtime']::name[]")
  assert.equal(policies.rows[0].n, 5)

  process.env.DATABASE_URL = source.toString()
  process.env.PAYLOAD_DB_MODE = 'runtime'
  process.env.PAYLOAD_DB_PUSH = 'false'
  Object.assign(process.env, { NODE_ENV: 'production' })
  assert.equal(databaseRuntimeOptions().restricted, true)
  for (const invalid of [
    { PAYLOAD_DB_PUSH: 'true' }, { PAYLOAD_DROP_DATABASE: 'true' },
    { PAYLOAD_MIGRATING: 'true' }, { MIGRATION_DATABASE_URL: 'forbidden' },
    { DATABASE_ADMIN_URL: 'forbidden' }, { DATABASE_URL: 'not-a-url' },
    { DATABASE_URL: 'postgres://postgres:secret@localhost/ci' },
    { PAYLOAD_DB_MODE: 'typo' },
  ]) assert.throws(() => databaseRuntimeOptions({ ...process.env, ...invalid }))

  const { default: configPromise } = await import('../../src/payload.config')
  const config = await configPromise
  // No external email or AI calls. Exercise real application collections and DB adapter.
  config.email = () => ({ name: 'sec003-ci', defaultFromAddress: 'ci@example.invalid', defaultFromName: 'CI', sendEmail: async () => undefined })
  config.jobs.autoRun = []
  const { getPayload } = await import('payload')
  payload = await getPayload({ config })
  assert.equal(payload.db.prodMigrations, undefined)
  assert.equal(payload.db.push, false)
  assert.equal(payload.db.disableCreateDatabase, true)
  const user = await payload.create({ collection: 'useri', overrideAccess: true, disableVerificationEmail: true,
    data: { email: 'sec003@example.invalid', password, rol: 'admin', _verified: true } })
  const actor = { ...user, collection: 'useri' as const }
  const login = await payload.login({ collection: 'useri', data: { email: user.email, password } })
  assert.ok(login.token)
  const sessions = await runtime.query('SELECT count(*)::int AS n FROM public.useri_sessions WHERE _parent_id=$1', [user.id])
  assert.ok(sessions.rows[0].n > 0)
  await assert.rejects(payload.find({ collection: 'useri', overrideAccess: false }))
  await assert.rejects(payload.find({ collection: 'newsletter', overrideAccess: false }))
  const article = await payload.create({ collection: 'articole', draft: true, user: actor, overrideAccess: false,
    data: { titlu: 'SEC003 isolated draft', slug: 'sec003-isolated-draft', limba: 'ro', _status: 'draft' } })
  const updated = await payload.update({ collection: 'articole', id: article.id, draft: true, user: actor, overrideAccess: false,
    data: { titlu: 'SEC003 isolated saved draft' } })
  assert.equal(updated._status, 'draft')
  assert.equal(updated.titlu, 'SEC003 isolated saved draft')
  const versions = await payload.findVersions({ collection: 'articole', user: actor, overrideAccess: false, where: { parent: { equals: article.id } } })
  assert.ok(versions.totalDocs > 0)
  const publicArticles = await payload.find({ collection: 'articole', overrideAccess: false, where: { id: { equals: article.id } } })
  assert.equal(publicArticles.totalDocs, 0)
  const subscription = await payload.create({ collection: 'newsletter', user: actor, overrideAccess: false,
    data: { email: 'sec003-news@example.invalid', segment: ['general'], limba: 'ro' } })
  assert.deepEqual(subscription.segment, ['general'])
  await payload.update({ collection: 'newsletter', id: subscription.id, user: actor, overrideAccess: false, data: { confirmat: true } })
  const comment = await payload.create({ collection: 'comentarii', user: actor, overrideAccess: false,
    data: { continut: 'Isolated rehearsal', autor: user.id, articol: article.id, status: 'asteptare' } })
  await payload.update({ collection: 'comentarii', id: comment.id, user: actor, overrideAccess: false, data: { status: 'aprobat' } })
  await payload.delete({ collection: 'comentarii', id: comment.id, user: actor, overrideAccess: false })
  await payload.delete({ collection: 'newsletter', id: subscription.id, user: actor, overrideAccess: false })
  await payload.find({ collection: 'search', overrideAccess: false })
  const job = await payload.jobs.queue({ task: 'evaluateFlashEngine', queue: 'sec003-isolated',
    input: { flashId: 1, model: 'ci-no-provider', allowProviderRequests: false } })
  assert.ok(job.id)
  await payload.delete({ collection: 'payload-jobs', id: job.id, overrideAccess: true })
  console.log('SEC-003 PASS: privilege denials, ACLs, RLS, real Payload login/session, draft/version, newsletter, comments, search read and job queue/delete')
} finally {
  await payload?.destroy()
  await runtime?.end()
  await owner.end()
}
