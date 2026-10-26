import { describe, expect, it, vi } from 'vitest'
import type { FlashNormalizedArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import type { FlashArticlePersistenceReadiness } from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'
import { buildVerifiedFlashEditorialLexicalContent } from '@/lib/flash/editorialContentLexical'
import { reuseFlashPairClassification } from '@/lib/flash/ingestion/flashPairClassificationReuse'
import { buildFlashAiStagingWriteInput } from '@/lib/flash/ingestion/flashAiStagingWriteInput'
import { createFlashAiAtomicReviewPair } from '@/lib/flash/ingestion/payloadFlashAiAtomicReviewPairWriter'

function fixture() {
  const canonicalUrl =
    'https://example.com/en/news/grounded-event'

  const candidate = {
    sourceId:
      4,

    canonicalUrl,

    sourcePublicationDate:
      '2026-09-17',
  } as FlashNormalizedArticleCandidate

  const readiness = {
    canCreateFlashAiDraft:
      true,

    verifiedEditorial: {
      editorialTitle:
        'Titlu editorial verificat',

      lexicalContent:
        buildVerifiedFlashEditorialLexicalContent([
          Array.from({ length: 6 }, () =>
            'Conținut editorial verificat pentru handoff-ul STAGING.',
          ).join(' '),
        ]),
    },

    sourceGroundedValues: {
      sourceId:
        4,

      sourceName:
        'Comisia Europeană',

      language:
        'en',

      sourceTitle:
        'Original English title',

      canonicalUrl,

      sourcePublishedAt:
        '2026-09-17',

      sourceFingerprint:
        'source-fingerprint',

      eventFingerprint:
        'event-fingerprint',
    },

    classification: {
      pilonId:
        1,

      flashType:
        'regulation',

      informationStatus:
        'official',

      riskLevel:
        'medium',

      isHealthRelated:
        false,
    },

    draftControls: {
      editorialStatus:
        'draft',

      automationDecision:
        'review',

      payloadStatus:
        'draft',
    },

    deferredDecisions:
      [],

    blockers:
      [],

    reviewSignals:
      [],

    evidence: {
      sourceVerificationPassed:
        true,

      sourceDuplicateFound:
        false,

      eventFingerprintDuplicateFound:
        false,

      sourceFingerprintReviewSignal:
        false,

      titleReviewSignal:
        false,

      finalDedupPending:
        false,

      classificationAvailable:
        true,
    },
  } as FlashArticlePersistenceReadiness

  return {
    candidate,
    readiness,
  }
}

function reuseInput() {
  const { candidate, readiness } = fixture()
  Object.assign(candidate, {
    sourceName: 'Example', sourceRole: 'primary', editorialTrust: 'high',
    allowAutoPublish: false, language: 'en', title: 'Source article',
    lead: 'Source lead', bodyText: 'Source content', bodyParagraphs: ['Source content'],
    primaryEvidenceUrls: ['https://example.com/paper'],
  })
  return {
    handoff: { targetLanguage: 'ro', candidate: structuredClone(candidate), readiness },
    candidate, sourceFingerprint: 'source-fingerprint', eventFingerprint: 'event-fingerprint' as string | null,
    allowedPilons: [{ id: 1, name: 'Example' }],
  }
}

describe('Shared RO/EN classification', () => {
  it('reuses all bounded metadata from an eligible RO handoff', () => {
    const input = reuseInput()
    input.handoff.readiness.classification!.subcategorie = 'diagnostic'
    expect(reuseFlashPairClassification(input)).toEqual(input.handoff.readiness.classification)
  })

  it.each([
    ['sourceId', 9], ['canonicalUrl', 'https://example.com/other'],
    ['title', 'Changed title'], ['bodyText', 'Changed content'],
    ['bodyParagraphs', ['Changed paragraph']], ['sourceRole', 'secondary'],
    ['sourcePublicationDate', '2026-10-01'],
    ['primaryEvidenceUrls', ['https://example.com/other-paper']],
  ] as const)('rejects source drift in %s', (field, value) => {
    const input = reuseInput()
    Object.assign(input.candidate, { [field]: value })
    expect(() => reuseFlashPairClassification(input)).toThrow('identical source')
  })

  it.each(['sourceFingerprint', 'eventFingerprint'] as const)('rejects changed %s', field => {
    const input = reuseInput()
    input[field] = 'different'
    expect(() => reuseFlashPairClassification(input)).toThrow('identical source')
  })

  it('rejects a pillar no longer allowed by the source', () => {
    const input = reuseInput()
    input.allowedPilons = [{ id: 2, name: 'Other' }]
    expect(() => reuseFlashPairClassification(input)).toThrow('source-configured pilons')
  })

  it('rejects unbounded classification fields', () => {
    const input = reuseInput()
    Object.assign(input.handoff.readiness.classification!, { publish: true })
    expect(() => reuseFlashPairClassification(input)).toThrow()
  })

  it('accepts the existing primary high-trust pending-identity review bridge', () => {
    const input = reuseInput()
    input.eventFingerprint = null
    input.handoff.readiness.sourceGroundedValues.eventFingerprint = null
    input.handoff.readiness.evidence.finalDedupPending = true
    input.handoff.readiness.reviewSignals = ['event_identity_pending']
    expect(reuseFlashPairClassification(input)).toEqual(input.handoff.readiness.classification)
  })

  it('rejects EN handoffs and ineligible readiness', () => {
    const input = reuseInput()
    input.handoff.targetLanguage = 'en'
    input.handoff.readiness.targetLanguage = 'en'
    expect(() => reuseFlashPairClassification(input)).toThrow('validated RO')
    input.handoff.targetLanguage = 'ro'
    input.handoff.readiness.targetLanguage = 'ro'
    input.handoff.readiness.canCreateFlashAiDraft = false
    expect(() => reuseFlashPairClassification(input)).toThrow('eligible persistence readiness')
  })

  it.each([
    ['pilon', 2], ['flashType', 'announcement'], ['informationStatus', 'preliminary'],
    ['riskLevel', 'high'], ['isHealthRelated', true],
    ['subcategorie', 'diagnostic'], ['subcategorieEducatie', 'cercetare'],
  ] as const)('blocks divergent %s before dedup, transaction or writes', async (field, value) => {
    const { candidate, readiness } = reuseInput().handoff
    const ro = buildFlashAiStagingWriteInput({ candidate, readiness })
    const en = structuredClone(ro)
    en.projection.limba = 'en'
    Object.assign(en.projection, { [field]: value })
    const payload = { find: vi.fn(), create: vi.fn(), update: vi.fn(), db: { beginTransaction: vi.fn() } }
    await expect(createFlashAiAtomicReviewPair({ payload: payload as never, ro, en })).rejects.toThrow(/identical/)
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.db.beginTransaction).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('allows matching metadata through dedup into one reciprocal review-only transaction', async () => {
    const { candidate, readiness } = reuseInput().handoff
    const ro = buildFlashAiStagingWriteInput({ candidate, readiness })
    const en = structuredClone(ro)
    en.projection.limba = 'en'
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 }),
      update: vi.fn().mockImplementation(async ({ id, data }) => ({ id, ...data })),
      db: { beginTransaction: vi.fn().mockResolvedValue('tx'),
        commitTransaction: vi.fn(), rollbackTransaction: vi.fn() },
    }
    const result = await createFlashAiAtomicReviewPair({ payload: payload as never, ro, en })
    expect(result).toMatchObject({ roId: 1, enId: 2 })
    expect(payload.db.beginTransaction).toHaveBeenCalledOnce()
    expect(payload.db.commitTransaction).toHaveBeenCalledWith('tx')
    expect(payload.db.rollbackTransaction).not.toHaveBeenCalled()
    for (const [call] of payload.create.mock.calls) {
      expect(call.req).toEqual({ transactionID: 'tx' })
      expect(call.data._status).toBe('draft')
    }
    expect(payload.update.mock.calls.map(([call]) => call.data)).toEqual([
      { versiuneAlternativa: 2, editorialStatus: 'review', automationDecision: 'review', _status: 'draft' },
      { versiuneAlternativa: 1, editorialStatus: 'review', automationDecision: 'review', _status: 'draft' },
    ])
  })
})
