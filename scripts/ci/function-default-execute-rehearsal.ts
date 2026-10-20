import assert from 'node:assert/strict'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { up, down } from '../../src/migrations/20261020_110000_sec002_function_default_execute'

assert.equal(process.env.CI, 'true', 'SEC-002 rehearsal is CI-only')
assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required')
const url = new URL(process.env.DATABASE_URL)
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Local CI database required')
assert.ok(['/ci', '/migration_rehearsal'].includes(url.pathname), 'Unexpected database name')

const client = new pg.Client({ connectionString: url.toString() })
await client.connect()
const db = drizzle(client)
const upArgs = { db } as unknown as Parameters<typeof up>[0]
const downArgs = { db } as unknown as Parameters<typeof down>[0]

async function protectedState() {
  // Compare ACLs, ownership and RLS of all pre-existing relations; compare all
  // other default ACLs as well, including app_prod2 and managed-schema defaults.
  return (await client.query(`
    SELECT jsonb_build_object(
      'relations', (
        SELECT jsonb_agg(jsonb_build_array(oid, relowner, relacl::text,
          relrowsecurity, relforcerowsecurity) ORDER BY oid)
        FROM pg_class WHERE relnamespace = 'public'::regnamespace
      ),
      'other_defaults', (
        SELECT jsonb_agg(jsonb_build_array(defaclrole, defaclnamespace,
          defaclobjtype, defaclacl::text)
          ORDER BY defaclrole, defaclnamespace, defaclobjtype)
        FROM pg_default_acl
        WHERE NOT (defaclrole = 'postgres'::regrole
          AND defaclobjtype = 'f' AND defaclnamespace = 0)
      )
    ) AS state
  `)).rows[0].state
}

async function privileges(signature: string) {
  return (await client.query(`
    SELECT has_function_privilege('anon', $1, 'EXECUTE') AS anon,
      has_function_privilege('authenticated', $1, 'EXECUTE') AS authenticated,
      has_function_privilege('service_role', $1, 'EXECUTE') AS service_role
  `, [signature])).rows[0]
}

async function rejectsAtSavepoint(operation: () => Promise<void>) {
  await client.query('SAVEPOINT expected_rejection')
  try {
    await assert.rejects(operation, /SEC-002/)
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT expected_rejection')
    await client.query('RELEASE SAVEPOINT expected_rejection')
  }
}

try {
  await client.query('BEGIN')
  // Reproduce Supabase's explicit public-schema service_role default. The
  // minimal CI cluster does not provision managed Supabase defaults itself.
  await client.query('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role')
  const before = await protectedState()

  // Start from the real applied migration, rehearse rollback, then the fix.
  await down(downArgs)
  const defaults = await client.query(`
    SELECT count(*)::int AS overrides FROM pg_default_acl
    WHERE defaclrole = 'postgres'::regrole AND defaclobjtype = 'f'
      AND defaclnamespace = 0
  `)
  assert.equal(defaults.rows[0].overrides, 0, 'down must restore the exact audited baseline')

  await client.query(`
    CREATE SCHEMA sec002_ci_probe;
    CREATE FUNCTION sec002_ci_probe.existing() RETURNS integer
      LANGUAGE sql AS 'SELECT 1';
  `)
  const legacyACL = (await client.query(`
    SELECT proacl::text FROM pg_proc
    WHERE oid = 'sec002_ci_probe.existing()'::regprocedure
  `)).rows[0]
  assert.equal((await privileges('sec002_ci_probe.existing()')).anon, true)

  await rejectsAtSavepoint(async () => {
    await client.query('ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO authenticated')
    await up(upArgs)
  })
  await rejectsAtSavepoint(async () => {
    await client.query("CREATE FUNCTION public.sec002_ci_drift() RETURNS integer LANGUAGE sql AS 'SELECT 1'")
    await up(upArgs)
  })
  await rejectsAtSavepoint(async () => {
    await client.query('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon')
    await up(upArgs)
  })

  await up(upArgs)
  assert.deepEqual(await protectedState(), before, 'Other defaults, table ACLs, ownership and RLS must not change')
  assert.deepEqual((await client.query(`
    SELECT proacl::text FROM pg_proc
    WHERE oid = 'sec002_ci_probe.existing()'::regprocedure
  `)).rows[0], legacyACL, 'Existing function ACL must be preserved')

  await client.query(`
    CREATE FUNCTION public.sec002_ci_future() RETURNS integer LANGUAGE sql AS 'SELECT 2';
    CREATE FUNCTION sec002_ci_probe.future() RETURNS integer LANGUAGE sql AS 'SELECT 3';
  `)
  assert.deepEqual(await privileges('public.sec002_ci_future()'), {
    anon: false, authenticated: false, service_role: true,
  })
  assert.deepEqual(await privileges('sec002_ci_probe.future()'), {
    anon: false, authenticated: false, service_role: false,
  })

  // Check actual execution as both unprivileged roles, not just catalog ACLs.
  for (const role of ['anon', 'authenticated']) {
    await client.query('SAVEPOINT denied_execution')
    await client.query(`SET LOCAL ROLE ${role}`)
    try {
      await assert.rejects(
        () => client.query('SELECT public.sec002_ci_future()'),
        (error: unknown) => (error as { code?: string }).code === '42501',
      )
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT denied_execution')
      await client.query('RELEASE SAVEPOINT denied_execution')
    }
  }

  await rejectsAtSavepoint(async () => {
    await client.query('ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO service_role')
    await down(downArgs)
  })

  await down(downArgs)
  // Rollback only affects future objects, never reopens functions made by up.
  assert.equal((await privileges('public.sec002_ci_future()')).anon, false)
  await client.query("CREATE FUNCTION public.sec002_ci_after_down() RETURNS integer LANGUAGE sql AS 'SELECT 4'")
  assert.equal((await privileges('public.sec002_ci_after_down()')).anon, true)

  console.log('SEC-002 PASS: up/down, effective execution, drift guards, global scope and existing ACL preservation')
} finally {
  try {
    await client.query('ROLLBACK')
  } finally {
    await client.end()
  }
}
