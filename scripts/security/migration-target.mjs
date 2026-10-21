// Staging-only hosted release gate. Production requires a separate reviewed rollout.
export function validateMigrationTarget(env) {
  if (env.SEC003_RUN_MIGRATIONS !== 'approved') throw new Error('Explicit migration execution gate is missing')
  if (env.PAYLOAD_DB_MODE === 'runtime' || env.PAYLOAD_DROP_DATABASE === 'true' || env.PAYLOAD_DB_PUSH === 'true') {
    throw new Error('Incompatible database mode')
  }
  let url
  try { url = new URL(env.DATABASE_URL) } catch { throw new Error('Invalid database configuration') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol')
  const ci = env.SEC003_MIGRATION_TARGET === 'ci'
  const actualSHA = ci ? env.GITHUB_SHA : env.RAILWAY_GIT_COMMIT_SHA
  if (!/^[a-f0-9]{40}$/.test(env.SEC003_MIGRATION_APPROVED_SHA || '') || env.SEC003_MIGRATION_APPROVED_SHA !== actualSHA) {
    throw new Error('Approved release commit does not match this job')
  }
  if (ci) {
    if (env.CI !== 'true' || url.hostname !== '127.0.0.1' || url.port !== '5432' || url.pathname !== '/ci' || url.username !== 'postgres' || url.search) {
      throw new Error('Refusing non-isolated CI target')
    }
    return { connectionString: url.toString(), label: 'ephemeral-ci' }
  }
  if (env.SEC003_MIGRATION_TARGET !== 'staging' ||
    env.RAILWAY_PROJECT_ID !== '44c37d0f-b300-4462-b001-31259ddae5dd' ||
    env.RAILWAY_ENVIRONMENT_ID !== 'a589dc28-1c59-468c-9eb4-351fce8fa17b' ||
    env.RAILWAY_SERVICE_NAME !== 'payload-migrations') throw new Error('Refusing unexpected Railway context')
  const ref = 'tvtnpcqawaekhmhyfrnc'
  const direct = url.hostname === `db.${ref}.supabase.co` && url.username === 'postgres'
  const pooler = url.hostname.endsWith('.pooler.supabase.com') && url.username === `postgres.${ref}`
  if ((!direct && !pooler) || url.pathname !== '/postgres' || url.port !== '5432' || !url.password) {
    throw new Error('Refusing unexpected staging database target')
  }
  // Session pooler/direct connection, certificate validation, no connection-option overrides.
  if (url.searchParams.get('sslmode') !== 'verify-full' || [...url.searchParams.keys()].some(k => k !== 'sslmode') || url.searchParams.getAll('sslmode').length !== 1) {
    throw new Error('Staging requires sslmode=verify-full with no extra URL options')
  }
  return { connectionString: url.toString(), label: 'staging' }
}
