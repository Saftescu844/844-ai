import { assertFlashRssDeployIdle, assertFlashRssDeployTarget } from '@/lib/flash/audit/flashRssDeployPreflight'

async function main() {
  assertFlashRssDeployTarget(process.env)
  const { Client } = await import('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000, query_timeout: 5_000,
    options: '-c default_transaction_read_only=on -c statement_timeout=5000' })
  try {
    await client.connect()
    await assertFlashRssDeployIdle(sql => client.query(sql))
    console.log('RSS_DEPLOY_PREFLIGHT_IDLE')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  // Do not expose connection strings, server errors or credentials.
  console.error(error instanceof Error && error.message === 'RSS_DEPLOY_PREFLIGHT_RUNNING_OR_UNRESOLVED'
    ? error.message : 'RSS_DEPLOY_PREFLIGHT_FAILED')
  process.exitCode = 1
})
