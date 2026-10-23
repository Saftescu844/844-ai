// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { FlashRssControlledFailure, FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'
import { runFlashRssStageNextAttempts } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'
import type { Payload } from 'payload'
import { FlashEngineRuns } from '@/collections/FlashEngineRuns'

function fixture() {
  const lines: string[] = []
  const create = vi.fn().mockResolvedValue({ id: 17 })
  const update = vi.fn().mockResolvedValue({ id: 17 })
  const payload = { create, update } as unknown as Pick<Payload, 'create' | 'update'>
  let time = 1000
  const audit = new FlashRssRunDiagnostics(line => lines.push(line), () => time)
  return { audit, payload, create, update, lines, tick: () => { time += 250 } }
}

describe('RSS diagnostics without provider or database requests', () => {
  it('keeps article IDs mandatory for evaluations but permits an RSS run before an article exists', () => {
    const field = FlashEngineRuns.fields.find(field => 'name' in field && field.name === 'flashIdSnapshot') as {
      validate: (value: number | null, options: { data: { runKind?: string } }) => boolean | string
    }
    expect(field.validate(null, { data: { runKind: 'rss-ingestion' } })).toBe(true)
    expect(field.validate(null, { data: { runKind: 'evaluation' } })).not.toBe(true)
    expect(field.validate(null, { data: {} })).not.toBe(true)
    expect(field.validate(7, { data: { runKind: 'evaluation' } })).toBe(true)
    expect(field.validate(1.5, { data: { runKind: 'rss-ingestion' } })).not.toBe(true)
  })

  it('retains a bounded child failure category without raw exception details', async () => {
    const f = fixture()
    await f.audit.start(f.payload, 'test-model', 'test-sha')
    await f.audit.checkpoint('generation-en')
    const error = new FlashRssControlledFailure('RSS_CHILD_SIGNAL')
    await f.audit.finish(true, error.code)
    expect(f.update.mock.lastCall?.[0].data).toMatchObject({ errorCode: 'RSS_CHILD_SIGNAL',
      evidenceSummary: { stage: 'generation-en' } })
  })

  it('records an empty scan without inventing an article ID or editorial decision', async () => {
    const f = fixture()
    await f.audit.start(f.payload, 'test-model', 'test-sha')
    await f.audit.checkpoint('candidate-selection', null)
    f.tick()
    f.audit.result('empty')
    await f.audit.finish()
    const data = f.create.mock.calls[0][0].data
    expect(data).toMatchObject({ runKind: 'rss-ingestion', status: 'running', provider: 'openai' })
    expect(data).not.toHaveProperty('flashIdSnapshot')
    expect(data).not.toHaveProperty('flash')
    expect(f.update.mock.lastCall?.[0].data).toMatchObject({ status: 'completed',
      evidenceSummary: { outcome: 'empty', attemptedCount: 0, durationMs: 250 } })
  })

  it('records RO/EN success and uses only the audit collection', async () => {
    const f = fixture()
    await f.audit.start(f.payload, 'test-model', 'test-sha')
    f.audit.candidate(1, 6)
    await f.audit.checkpoint('generation-ro')
    await f.audit.checkpoint('generation-en')
    await f.audit.checkpoint('pair-persistence')
    f.audit.result('pair-created', { roId: 44, enId: 45 })
    await f.audit.finish()
    expect(f.update.mock.lastCall?.[0].data.evidenceSummary).toMatchObject({ roId: 44, enId: 45,
      attemptedCount: 1, outcome: 'pair-created' })
    expect([...f.create.mock.calls, ...f.update.mock.calls].every(([arg]) => arg.collection === 'flash-engine-runs')).toBe(true)
    expect(JSON.parse(f.lines.at(-1)!)).toMatchObject({ status: 'success', correlationId: f.audit.runId })
  })

  it('correlates filtering, final rejection memory and skips across three candidates', async () => {
    const f = fixture()
    await f.audit.start(f.payload, 'test-model', 'test-sha')
    f.audit.scan({ selectedSourceCount: 2, discoveredCount: 20, eligibleCandidateCount: 3,
      filteredExistingCandidateCount: 7, filteredRememberedRejectedCandidateCount: 10,
      existingSourceUrlCount: 23, rememberedRejectedUrlCount: 10 })
    await runFlashRssStageNextAttempts({ candidates: [1, 2, 3, 4], maxAttempts: 3,
      processCandidate: async (_, attempt) => {
        f.audit.candidate(attempt, 6)
        await f.audit.checkpoint('generation-ro')
        f.audit.skipped(attempt === 1 ? 'article_retrieval_http_error' : 'event_identity_not_grounded')
        return 'skip'
      } })
    f.audit.setRememberedRejectedUrlCount(11)
    f.audit.result('no-eligible-candidate')
    await f.audit.finish()
    expect(f.update.mock.lastCall?.[0].data).toMatchObject({ status: 'completed', evidenceSummary: {
      selectedSourceCount: 2, discoveredCount: 20, eligibleCandidateCount: 3,
      filteredExistingCandidateCount: 7, filteredRememberedRejectedCandidateCount: 10,
      existingSourceUrlCount: 23, rememberedRejectedUrlCount: 11,
      attemptedCount: 3, skippedCount: 3, lastSkipReason: 'event_identity_not_grounded', outcome: 'no-eligible-candidate' } })
  })

  it('leaves a running checkpoint if execution disappears, without pretending to know the cause', async () => {
    const f = fixture()
    await f.audit.start(f.payload, 'test-model', 'test-sha')
    await f.audit.checkpoint('generation-en', 6)
    expect(f.create.mock.calls[0][0].data.status).toBe('running')
    expect(f.update.mock.lastCall?.[0].data).toEqual({ evidenceSummary: expect.objectContaining({ stage: 'generation-en' }) })
    expect(f.update.mock.calls.some(([arg]) => arg.data.completedAt)).toBe(false)
  })

  it('records a controlled stage error and never accepts arbitrary exception content', async () => {
    const f = fixture()
    await f.audit.start(f.payload, 'test-model', 'test-sha')
    await f.audit.checkpoint('feed-retrieval', 5)
    await f.audit.finish(true)
    expect(f.update.mock.lastCall?.[0].data).toMatchObject({ status: 'failed', errorCode: 'RSS_FEED_RETRIEVAL_FAILED' })
    await f.audit.finish(true)
    expect(f.update).toHaveBeenCalledTimes(2)
  })

  it('provides safe fallback when database initialization or audit finalization fails', async () => {
    const f = fixture()
    await f.audit.checkpoint('database')
    await f.audit.finish(true)
    expect(f.create).not.toHaveBeenCalled()
    expect(JSON.parse(f.lines.at(-1)!)).toMatchObject({ data: { errorCode: 'RSS_DATABASE_FAILED' } })
    const g = fixture()
    await g.audit.start(g.payload, 'test-model', 'test-sha')
    g.update.mockRejectedValue(new Error('secret=do-not-log provider body'))
    await expect(g.audit.finish()).rejects.toThrow('RSS_AUDIT_FINALIZATION_FAILED')
    expect(g.lines.join('')).not.toContain('do-not-log')
    expect(JSON.parse(g.lines.at(-1)!)).toMatchObject({ data: { errorCode: 'RSS_AUDIT_FINALIZATION_FAILED' } })
  })
})
