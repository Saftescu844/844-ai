import type { Pool } from 'pg'

/** Opt-in until the separate migration service and runtime login are provisioned. */
export function databaseRuntimeOptions(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.PAYLOAD_DB_MODE || 'legacy'
  if (!['legacy', 'runtime'].includes(mode)) {
    throw new Error('SEC-003: invalid PAYLOAD_DB_MODE')
  }
  if (mode === 'legacy') return { restricted: false }
  if (env.PAYLOAD_DB_PUSH === 'true' || env.PAYLOAD_DROP_DATABASE === 'true' || env.PAYLOAD_MIGRATING === 'true') {
    throw new Error('SEC-003: schema operations are forbidden in runtime mode')
  }
  if (env.MIGRATION_DATABASE_URL || env.DATABASE_ADMIN_URL) {
    throw new Error('SEC-003: migration credentials must live in a separate service')
  }
  let username: string
  try {
    const url = new URL(env.DATABASE_URL || '')
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
    username = decodeURIComponent(url.username).split('.')[0]
  } catch {
    throw new Error('SEC-003: invalid runtime connection configuration')
  }
  if (username !== 'payload_runtime') throw new Error('SEC-003: runtime requires payload_runtime')
  return { restricted: true }
}

/** Defense against misprovisioning; never prints connection strings or credentials. */
export async function assertRuntimeDatabase(pool: Pool, migrations: string[]) {
  const { rows: [role] } = await pool.query(`
    SELECT current_user AS name, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication,
      EXISTS (SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS memberships,
      EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
        AND has_schema_privilege(current_user,n.oid,'CREATE')) AS schema_create,
      EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND (c.relowner=r.oid OR
          (c.relkind IN ('r','p') AND has_table_privilege(current_user,c.oid,'TRUNCATE')))) AS owns_or_truncates,
      has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
      has_table_privilege(current_user,'public.payload_migrations','INSERT,UPDATE,DELETE,TRUNCATE') AS migration_write
    FROM pg_roles r WHERE rolname=current_user
  `)
  if (!role || role.name !== 'payload_runtime' || Object.entries(role).some(([k,v]) => k !== 'name' && v === true)) {
    throw new Error('SEC-003: runtime database role is overprivileged or unexpected')
  }
  const { rows } = await pool.query('SELECT name FROM public.payload_migrations WHERE name = ANY($1::text[])', [migrations])
  if (new Set(rows.map(row => row.name)).size !== new Set(migrations).size) {
    throw new Error('SEC-003: schema is not ready; run migrations in the separate migration service')
  }
}
