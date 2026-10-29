import { describe, expect, it, vi } from 'vitest'
import { assertProductionScheduleEnvironment, productionScheduleAttemptCount, reserveProductionScheduleAttempt, selectAndReserveProductionCandidate } from '../../src/lib/flash/ingestion/flashProductionSchedulePolicy'

const now = Date.parse('2026-10-29T12:00:00Z')
const candidate = { sourceId: 5, concreteUrl: 'https://research.google/blog/a/', publishedAt: '2026-10-28T00:00:00Z' }
const source = (id: number, memory: unknown = []) => ({ id, allowIngestion: true, allowAutoPublish: false, rssCandidateSkipMemory: memory })
const env = { RAILWAY_PROJECT_ID: '54c46ab1-ebab-491c-bdbe-571a3fce9ceb', RAILWAY_ENVIRONMENT_ID: '12b22bbd-469f-4cb8-b418-cc2c8e40af6d', RAILWAY_SERVICE_ID: '6e954363-b055-4032-a501-f5615cc49932', RAILWAY_SERVICE_NAME: 'flash-rss-production-once', PAYLOAD_DB_PUSH: 'false', DATABASE_URL: 'postgresql://postgres.hyapqvnubhwkwmwudeit:test@aws-0-eu-central-1.pooler.supabase.com:6543/postgres' }

describe('Production scheduled preparation budget', () => {
  it('rejects every wrong target dimension and staging database before any runtime access', () => {
    expect(() => assertProductionScheduleEnvironment(env)).not.toThrow()
    for (const key of ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_SERVICE_ID', 'RAILWAY_SERVICE_NAME', 'PAYLOAD_DB_PUSH']) {
      expect(() => assertProductionScheduleEnvironment({ ...env, [key]: 'wrong' })).toThrow()
    }
    expect(() => assertProductionScheduleEnvironment({ ...env, DATABASE_URL: env.DATABASE_URL.replace('hyapqvnubhwkwmwudeit', 'tvtnpcqawaekhmhyfrnc') })).toThrow()
  })

  it('reserves before returning a candidate and charges failed/empty provider attempts', async () => {
    const saveMemory = vi.fn().mockResolvedValue(undefined)
    const result = await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5), source(6)], usedUrls: new Set(), now, dryRun: false, saveMemory })
    expect(result.outcome).toBe('selected')
    expect(saveMemory).toHaveBeenCalledTimes(1)
    const memory = saveMemory.mock.calls[0][1]
    expect(productionScheduleAttemptCount([memory], now + 1000)).toBe(1)
    const retry = await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5, memory), source(6)], usedUrls: new Set(), now: now + 1000, dryRun: false, saveMemory })
    expect(retry.outcome).toBe('empty')
    expect(saveMemory).toHaveBeenCalledTimes(1)
  })

  it('enforces two attempts across both sources over rolling24h, including midnight', async () => {
    const a = reserveProductionScheduleAttempt([], 'https://research.google/blog/a/', now - 23 * 3600000)
    const b = reserveProductionScheduleAttempt([], 'https://news.mit.edu/b', now - 3600000)
    const saveMemory = vi.fn()
    const result = await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5, a), source(6, b)], usedUrls: new Set(), now, dryRun: false, saveMemory })
    expect(result.outcome).toBe('budget_reached')
    expect(saveMemory).not.toHaveBeenCalled()
    expect(productionScheduleAttemptCount([a, b], now + 3600000)).toBe(1)
  })

  it('fails closed on malformed/future budget memory and on lost durable reservation', async () => {
    for (const memory of [{}, [{ url: candidate.concreteUrl, reason: 'production_scheduled_attempt', skippedAt: 'bad' }], reserveProductionScheduleAttempt([], candidate.concreteUrl, now + 1000)]) {
      expect(() => productionScheduleAttemptCount([memory], now)).toThrow()
    }
    await expect(selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5), source(6)], usedUrls: new Set(), now, dryRun: false, saveMemory: async () => { throw new Error('storage unavailable') } })).rejects.toThrow('storage unavailable')
  })

  it('dry-run neither reserves nor writes; disabled and AUTO-enabled sources are excluded', async () => {
    const saveMemory = vi.fn()
    expect((await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5), source(6)], usedUrls: new Set(), now, dryRun: true, saveMemory })).outcome).toBe('selected')
    expect(saveMemory).not.toHaveBeenCalled()
    for (const patch of [{ allowIngestion: false }, { allowAutoPublish: true }]) {
      expect((await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [{ ...source(5), ...patch }, source(6)], usedUrls: new Set(), now, dryRun: false, saveMemory })).outcome).toBe('empty')
    }
  })

  it('does not repeat any draft/published source URL or an attempted candidate for seven days', async () => {
    const saveMemory = vi.fn()
    expect((await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5), source(6)], usedUrls: new Set([candidate.concreteUrl]), now, dryRun: false, saveMemory })).outcome).toBe('empty')
    const memory = reserveProductionScheduleAttempt([], candidate.concreteUrl, now - 2 * 86400000)
    expect((await selectAndReserveProductionCandidate({ candidates: [candidate], sources: [source(5, memory), source(6)], usedUrls: new Set(), now, dryRun: false, saveMemory })).outcome).toBe('empty')
    expect(saveMemory).not.toHaveBeenCalled()
  })
})
