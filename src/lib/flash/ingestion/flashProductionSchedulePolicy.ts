import { assertFlashAiProductionWriteAllowed } from './flashAiProductionWriteGuard'
import { canonicalFlashRssCandidateUrl } from './rssCandidateSkipMemory'

export const PRODUCTION_RSS_SOURCE_IDS = [5, 6] as const
export const PRODUCTION_RSS_ATTEMPTS_PER_24H = 2
export const PRODUCTION_RSS_WINDOW_MS = 24 * 60 * 60 * 1000
export const PRODUCTION_RSS_MEMORY_MS = 7 * PRODUCTION_RSS_WINDOW_MS
export const PRODUCTION_RSS_ATTEMPT_REASON = 'production_scheduled_attempt'

export function assertProductionScheduleEnvironment(env: NodeJS.ProcessEnv): void {
  const required = {
    RAILWAY_PROJECT_ID: '54c46ab1-ebab-491c-bdbe-571a3fce9ceb',
    RAILWAY_ENVIRONMENT_ID: '12b22bbd-469f-4cb8-b418-cc2c8e40af6d',
    RAILWAY_SERVICE_ID: '6e954363-b055-4032-a501-f5615cc49932',
    RAILWAY_SERVICE_NAME: 'flash-rss-production-once',
    PAYLOAD_DB_PUSH: 'false',
  }
  const invalid = Object.entries(required).filter(([key, value]) => env[key] !== value).map(([key]) => key)
  if (invalid.length) throw new Error(`Production schedule environment mismatch: ${invalid.join(', ')}.`)
  assertFlashAiProductionWriteAllowed({ allowWrite: true, databaseUrl: env.DATABASE_URL })
}

type Entry = { url: string; reason: string; skippedAt: string }

/** Reserve attempts before AI, including attempts that fail or create no pair. */
export function productionScheduleMemory(value: unknown, now: number): Entry[] {
  if (!Number.isFinite(now)) throw new Error('Invalid production schedule clock.')
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) throw new Error('Invalid production schedule memory.')
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid production schedule memory entry.')
    const row = item as Record<string, unknown>
    const url = typeof row.url === 'string' ? canonicalFlashRssCandidateUrl(row.url) : null
    const time = typeof row.skippedAt === 'string' ? Date.parse(row.skippedAt) : NaN
    if (!url || !Number.isFinite(time) || time > now || typeof row.reason !== 'string') {
      throw new Error('Invalid production schedule memory entry.')
    }
    return time > now - PRODUCTION_RSS_MEMORY_MS
      ? [{ url, reason: row.reason, skippedAt: new Date(time).toISOString() }]
      : []
  })
}

export function productionScheduleAttemptCount(memories: unknown[], now: number): number {
  return memories.flatMap(value => productionScheduleMemory(value, now)).filter(entry =>
    entry.reason === PRODUCTION_RSS_ATTEMPT_REASON && Date.parse(entry.skippedAt) > now - PRODUCTION_RSS_WINDOW_MS,
  ).length
}

export function reserveProductionScheduleAttempt(memory: unknown, url: string, now: number): Entry[] {
  const canonical = canonicalFlashRssCandidateUrl(url)
  if (!canonical) throw new Error('Invalid production schedule candidate URL.')
  const entries = productionScheduleMemory(memory, now)
  if (entries.some(entry => entry.url === canonical)) throw new Error('Production candidate already attempted.')
  // Never silently evict a recent reservation from the budget ledger.
  if (entries.length >= 100) throw new Error('Production schedule memory capacity reached.')
  return [{ url: canonical, reason: PRODUCTION_RSS_ATTEMPT_REASON, skippedAt: new Date(now).toISOString() }, ...entries]
}

export interface ProductionScheduleSource { id: number; allowIngestion?: boolean | null; allowAutoPublish?: boolean | null; rssCandidateSkipMemory?: unknown }
export interface ProductionScheduleCandidate { sourceId: number; concreteUrl: string; publishedAt: string | null }

/** Shared read-only planning for preflight and the fresh locked reservation. */
export function planProductionScheduleCandidates<T extends ProductionScheduleCandidate>({
  candidates, sources, usedUrls, now,
}: {
  candidates: T[]; sources: ProductionScheduleSource[]; usedUrls: Set<string>; now: number
}): { candidates: T[]; attemptsIn24h: number } {
  if (sources.length !== 2 || !PRODUCTION_RSS_SOURCE_IDS.every(id => sources.some(source => source.id === id))) {
    throw new Error('Production schedule requires both registered source records.')
  }
  const attemptsIn24h = productionScheduleAttemptCount(sources.map(source => source.rssCandidateSkipMemory), now)
  if (attemptsIn24h >= PRODUCTION_RSS_ATTEMPTS_PER_24H) return { candidates: [], attemptsIn24h }
  const eligible = sources.filter(source => source.allowIngestion === true && source.allowAutoPublish === false)
  const seen = new Set(sources.flatMap(source => productionScheduleMemory(source.rssCandidateSkipMemory, now)).map(entry => entry.url))
  const ordered = candidates.filter(item => {
    const url = canonicalFlashRssCandidateUrl(item.concreteUrl)
    return url && eligible.some(source => source.id === item.sourceId) && !usedUrls.has(url) && !seen.has(url)
  }).sort((a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '') || a.sourceId - b.sourceId || a.concreteUrl.localeCompare(b.concreteUrl))
  return { candidates: ordered, attemptsIn24h }
}

/** Called under a database transaction advisory lock by the production adapter. */
export async function selectAndReserveProductionCandidate<T extends ProductionScheduleCandidate>({
  candidates, sources, usedUrls, now, dryRun, saveMemory,
}: {
  candidates: T[]; sources: ProductionScheduleSource[]; usedUrls: Set<string>; now: number; dryRun: boolean
  saveMemory: (id: number, memory: Entry[]) => Promise<void>
}): Promise<{ outcome: 'empty' | 'budget_reached' | 'selected'; candidate?: T; attemptsIn24h: number }> {
  const planned = planProductionScheduleCandidates({ candidates, sources, usedUrls, now })
  const { attemptsIn24h } = planned
  if (attemptsIn24h >= PRODUCTION_RSS_ATTEMPTS_PER_24H) return { outcome: 'budget_reached', attemptsIn24h }
  const candidate = planned.candidates[0]
  if (!candidate) return { outcome: 'empty', attemptsIn24h }
  if (!dryRun) {
    const source = sources.find(item => item.id === candidate.sourceId)!
    await saveMemory(source.id, reserveProductionScheduleAttempt(source.rssCandidateSkipMemory, candidate.concreteUrl, now))
  }
  return { outcome: 'selected', candidate, attemptsIn24h: attemptsIn24h + (dryRun ? 0 : 1) }
}
