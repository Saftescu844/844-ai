// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import type { Payload } from 'payload'
import type { Surse } from '@/payload-types'
import type { FlashAiStagingWriteInput } from '@/lib/flash/ingestion/flashAiStagingWriteInput'
import { STUDENT_SIM_PILOT, assertStudentSimPilotTarget, assertStudentSimPilotBounds,
  assertStudentSimPilotSource, planStudentSimPilotSource, readStudentSimPilotSource,
  assertStudentSimPilotEvidence, assertStudentSimPilotHandoffs, studentSimPilotChildOptions } from '@/lib/flash/ingestion/studentSimStagingPilot'
import { planFlashRssIngestionSources } from '@/lib/flash/ingestion/rssCandidateIngestion'

const environment = { RAILWAY_PROJECT_ID: '44c37d0f-b300-4462-b001-31259ddae5dd',
  RAILWAY_ENVIRONMENT_ID: 'a589dc28-1c59-468c-9eb4-351fce8fa17b', RAILWAY_SERVICE_ID: STUDENT_SIM_PILOT.serviceId,
  PAYLOAD_DB_PUSH: 'false' }
const target = { environment, sourceId: 10, articleUrl: STUDENT_SIM_PILOT.articleUrl }
const source = { id: 10, nume: 'Microsoft Research', url: STUDENT_SIM_PILOT.sourceUrl,
  feedRSS: STUDENT_SIM_PILOT.feedUrl, activa: true, allowIngestion: false, allowAutoPublish: false,
  sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase', discoveryMethod: 'rss',
  discoveryUrl: null, pilon: [1, 3, 4, 5], maxCandidatesPerScan: 10, maxCandidatesPerDay: 40 } as Surse
const fakePayload = (docs = [structuredClone(source)]) => {
  const find = vi.fn().mockResolvedValue({ docs })
  return { payload: { find } as unknown as Pick<Payload, 'find'>, find }
}
const handoff = (): FlashAiStagingWriteInput => ({ candidate: { sourceId: 10, canonicalUrl: STUDENT_SIM_PILOT.articleUrl,
  sourceRole: 'primary', editorialTrust: 'standard', allowAutoPublish: false,
  primaryEvidenceUrls: [STUDENT_SIM_PILOT.primaryEvidenceUrl] },
  projection: { eventFingerprint: STUDENT_SIM_PILOT.eventFingerprint } }) as FlashAiStagingWriteInput

describe('exact StudentSim staging pilot policy', () => {
  it('accepts only the reviewed one-off request without a registry change', () => {
    const before = structuredClone(source)
    expect(() => assertStudentSimPilotTarget(target)).not.toThrow()
    expect(() => assertStudentSimPilotBounds(1, 1, 30)).not.toThrow()
    expect(() => assertStudentSimPilotSource(source)).not.toThrow()
    expect(source).toEqual(before)
  })
  it.each([
    { RAILWAY_PROJECT_ID: '54c46ab1-ebab-491c-bdbe-571a3fce9ceb' },
    { RAILWAY_ENVIRONMENT_ID: 'different' }, { RAILWAY_SERVICE_ID: 'd479e8ea-00a4-4b58-87a0-fc3221f4679c' },
    { RAILWAY_SERVICE_ID: '' }, { PAYLOAD_DB_PUSH: 'true' },
  ])('rejects production, the hourly worker and unverified environment settings before source access', extra => {
    expect(() => assertStudentSimPilotTarget({ ...target, environment: { ...environment, ...extra } })).toThrow()
  })
  it.each([
    { sourceId: 9 }, { sourceId: null }, { articleUrl: null },
    { articleUrl: STUDENT_SIM_PILOT.articleUrl + '?tracking=1' },
    { articleUrl: STUDENT_SIM_PILOT.articleUrl.replace('simulating-student-learning-for-better-ai-tutoring', 'other-article') },
    { allowProduction: true }, { readOnlyPilot: true },
  ])('rejects unreviewed targets and mixing the override with other execution modes', extra => {
    expect(() => assertStudentSimPilotTarget({ ...target, ...extra })).toThrow()
  })
  it.each([[null, 1, 30], [1, null, 30], [10, 1, 30], [1, 3, 30], [0, 1, 30], [1, 1, 60]])(
    'requires one candidate, one attempt and unchanged freshness: %s / %s / %s', (items, attempts, days) => {
      expect(() => assertStudentSimPilotBounds(items, attempts, days!)).toThrow()
    })
  it.each([
    { id: 6 }, { activa: false }, { allowIngestion: true }, { allowIngestion: undefined }, { allowAutoPublish: true },
    { sourceRole: 'secondary' }, { editorialTrust: 'high' }, { editorialTrust: 'restricted' }, { citationMode: 'shortQuote' },
    { url: 'https://www.microsoft.com/' }, { feedRSS: STUDENT_SIM_PILOT.feedUrl + '?tracking=1' },
    { discoveryMethod: 'html' }, { discoveryUrl: STUDENT_SIM_PILOT.sourceUrl }, { pilon: [1, 2, 3, 4, 5] }, { pilon: [3] },
  ])('refuses source-policy drift rather than enabling or upgrading the source', extra => {
    expect(() => assertStudentSimPilotSource({ ...source, ...extra } as Surse)).toThrow()
  })
  it('leaves ordinary child requests unchanged and opts the exact pilot into grounded evidence', () => {
    expect(studentSimPilotChildOptions(false)).toEqual([])
    expect(studentSimPilotChildOptions(true)).toEqual(['--allow-staging-studentsim-pilot', '--require-grounded-event-identity'])
  })
  it('reads only source #10 and reuses ordinary RSS assessment, without calling update/create', async () => {
    const { payload, find } = fakePayload()
    const before = structuredClone(source)
    const plans = await planStudentSimPilotSource(payload)
    expect(find).toHaveBeenCalledExactlyOnceWith({ collection: 'surse', depth: 0, overrideAccess: true, limit: 1,
      where: { id: { equals: 10 } } })
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({ sourceId: 10, ready: true, allowAutoPublish: false,
      registeredSourceUrl: STUDENT_SIM_PILOT.sourceUrl, feedUrl: STUDENT_SIM_PILOT.feedUrl })
    expect(source).toEqual(before)
  })
  it('does not change the default planner query that excludes disabled ingestion', async () => {
    const { payload, find } = fakePayload([])
    await planFlashRssIngestionSources(payload, { includeHtml: true })
    expect(find.mock.calls[0]![0].where.and).toContainEqual({ allowIngestion: { equals: true } })
  })
  it('fails before planning when the registry record is missing or changed', async () => {
    await expect(planStudentSimPilotSource(fakePayload([]).payload)).rejects.toThrow()
    await expect(planStudentSimPilotSource(fakePayload([{ ...source, allowAutoPublish: true }]).payload)).rejects.toThrow()
  })
  it('re-reading immediately before persistence detects a changed source policy', async () => {
    const { payload, find } = fakePayload()
    await planStudentSimPilotSource(payload)
    find.mockResolvedValueOnce({ docs: [{ ...source, allowIngestion: true }] })
    await expect(readStudentSimPilotSource(payload)).rejects.toThrow()
  })
  it('compares an observed identifier and never invents one from absent or different evidence', () => {
    expect(() => assertStudentSimPilotEvidence([STUDENT_SIM_PILOT.primaryEvidenceUrl])).not.toThrow()
    for (const urls of [[], ['https://arxiv.org/abs/2608.17528'], [STUDENT_SIM_PILOT.primaryEvidenceUrl, 'https://arxiv.org/abs/2601.00001']]) {
      expect(() => assertStudentSimPilotEvidence(urls)).toThrow()
    }
  })
  it('accepts both handoffs only with the exact observed paper identity and source policy', () => {
    expect(() => assertStudentSimPilotHandoffs(handoff(), handoff())).not.toThrow()
    const en = handoff(); en.projection.eventFingerprint = null
    expect(() => assertStudentSimPilotHandoffs(handoff(), en)).toThrow()
    en.projection.eventFingerprint = 'flash-event:v1:other'
    expect(() => assertStudentSimPilotHandoffs(handoff(), en)).toThrow()
    en.projection.eventFingerprint = STUDENT_SIM_PILOT.eventFingerprint
    en.candidate.canonicalUrl = STUDENT_SIM_PILOT.sourceUrl
    expect(() => assertStudentSimPilotHandoffs(handoff(), en)).toThrow()
  })
})


describe('StudentSim pilot CLI boundary', { timeout: 30_000 }, () => {
  it.each([
    ['hourly worker', 'd479e8ea-00a4-4b58-87a0-fc3221f4679c', '1'],
    ['multiple attempts', STUDENT_SIM_PILOT.serviceId, '3'],
  ])('rejects %s before Payload initialization or provider work', (_name, serviceId, attempts) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/flash-rss-stage-next.ts',
      '--allow-provider-requests', '--allow-staging-rss-stage-next', '--allow-staging-studentsim-pilot',
      '--model', 'unused-test-model', '--source-id', '10', '--candidate-url', STUDENT_SIM_PILOT.articleUrl,
      '--max-items', '1', '--max-attempts', attempts], { encoding: 'utf8', timeout: 15_000,
      env: { ...process.env, ...environment, RAILWAY_SERVICE_ID: serviceId,
        DATABASE_URL: 'postgresql://postgres.tvtnpcqawaekhmhyfrnc:unused@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
        OPENAI_API_KEY: 'unused-test-key' } })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('RSS_BOOTSTRAP_FAILED')
    expect(result.stdout).not.toContain('RSS_DATABASE_FAILED')
    expect(result.stderr).toContain('FLASH_RSS_STAGE_NEXT_FAILED')
  })
})
