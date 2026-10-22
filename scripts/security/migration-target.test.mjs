import test from 'node:test'
import assert from 'node:assert/strict'
import { validateMigrationTarget } from './migration-target.mjs'

const sha = 'a'.repeat(40)
const staging = {
  SEC003_RUN_MIGRATIONS: 'approved', SEC003_MIGRATION_TARGET: 'staging',
  SEC003_MIGRATION_APPROVED_SHA: sha, RAILWAY_GIT_COMMIT_SHA: sha,
  RAILWAY_PROJECT_ID: '44c37d0f-b300-4462-b001-31259ddae5dd',
  RAILWAY_ENVIRONMENT_ID: 'a589dc28-1c59-468c-9eb4-351fce8fa17b',
  RAILWAY_SERVICE_NAME: 'payload-migrations',
  DATABASE_URL: 'postgresql://postgres.tvtnpcqawaekhmhyfrnc:test-only@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=verify-full',
}
test('accepts only the approved staging session-pooler or direct target', () => {
  assert.equal(validateMigrationTarget(staging).label, 'staging')
  assert.equal(validateMigrationTarget({ ...staging, DATABASE_URL: 'postgresql://postgres:test-only@db.tvtnpcqawaekhmhyfrnc.supabase.co:5432/postgres?sslmode=verify-full' }).label, 'staging')
})
test('rejects wrong project, release, service, runtime mode and missing approval', () => {
  for (const change of [
    { SEC003_RUN_MIGRATIONS: '' }, { SEC003_MIGRATION_TARGET: 'production' },
    { RAILWAY_PROJECT_ID: '54c46ab1-ebab-491c-bdbe-571a3fce9ceb' },
    { RAILWAY_ENVIRONMENT_ID: 'wrong' }, { RAILWAY_SERVICE_NAME: '844-ai' },
    { SEC003_MIGRATION_APPROVED_SHA: 'b'.repeat(40) }, { PAYLOAD_DB_MODE: 'runtime' },
    { PAYLOAD_DROP_DATABASE: 'true' }, { PAYLOAD_DB_PUSH: 'true' },
  ]) assert.throws(() => validateMigrationTarget({ ...staging, ...change }))
})
test('rejects production, transaction pooler, insecure TLS and URL overrides', () => {
  for (const url of [
    staging.DATABASE_URL.replace('tvtnpcqawaekhmhyfrnc', 'hyapqvnubhwkwmwudeit'),
    staging.DATABASE_URL.replace(':5432/', ':6543/'),
    staging.DATABASE_URL.replace('verify-full', 'require'),
    staging.DATABASE_URL + '&options=-c%20role=postgres',
    staging.DATABASE_URL + '&sslmode=disable', 'malformed',
  ]) assert.throws(() => validateMigrationTarget({ ...staging, DATABASE_URL: url }))
})
test('CI path cannot select a hosted database', () => {
  const ci = { ...staging, CI: 'true', SEC003_MIGRATION_TARGET: 'ci', GITHUB_SHA: sha }
  assert.throws(() => validateMigrationTarget(ci))
  assert.equal(validateMigrationTarget({ ...ci, DATABASE_URL: 'postgresql://postgres:test-only@127.0.0.1:5432/ci' }).label, 'ephemeral-ci')
})
