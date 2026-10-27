import { FLASH_ENGINE_STAGING_RAILWAY_TARGET } from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'
import { assertFlashAiStagingWriteAllowed } from '@/lib/flash/ingestion/flashAiStagingWriteGuard'

export const FLASH_RSS_RUNNING_RUN_QUERY = `SELECT id FROM flash_engine_runs
WHERE run_kind = 'rss-ingestion' AND status = 'running' LIMIT 1`

/** Guard runs before importing a database client or opening a connection. */
export function assertFlashRssDeployTarget(env: NodeJS.ProcessEnv) {
  if (env.RAILWAY_PROJECT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.projectId ||
    env.RAILWAY_ENVIRONMENT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.environmentId ||
    env.RAILWAY_SERVICE_ID !== 'd479e8ea-00a4-4b58-87a0-fc3221f4679c' || env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('RSS_DEPLOY_PREFLIGHT_TARGET_REJECTED')
  }
  assertFlashAiStagingWriteAllowed({ allowWrite: true, databaseUrl: env.DATABASE_URL })
}

/** No age cutoff: an old running audit can be unresolved rather than inactive. */
export async function assertFlashRssDeployIdle(query: (sql: string) => Promise<{ rows: unknown[] }>) {
  const result = await query(FLASH_RSS_RUNNING_RUN_QUERY)
  if (!Array.isArray(result.rows)) throw new Error('RSS_DEPLOY_PREFLIGHT_INVALID_RESULT')
  if (result.rows.length) throw new Error('RSS_DEPLOY_PREFLIGHT_RUNNING_OR_UNRESOLVED')
}
