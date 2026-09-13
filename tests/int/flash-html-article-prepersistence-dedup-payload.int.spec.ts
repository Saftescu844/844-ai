import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { FlashAi } from '@/payload-types'

import {
  evaluateFlashArticlePrePersistenceDedupReadOnly,
} from '@/lib/flash/ingestion/payloadArticleCandidatePrePersistenceDedupReadOnly'
import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

type EvaluatorPayload =
  Parameters<
    typeof evaluateFlashArticlePrePersistenceDedupReadOnly
  >[0]

function normalizedCandidate(
  overrides:
    Partial<FlashNormalizedArticleCandidate> = {},
): FlashNormalizedArticleCandidate {
  return {
    sourceId: 4,
    sourceName:
      'Comisia Europeană — AI Act',
    sourceRole: 'primary',
    editorialTrust: 'high',
    citationMode: 'paraphrase',
    allowAutoPublish: false,
    language: 'en',
    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    title:
      'Fourth GPAI Signatory Taskforce meeting',
    contentType: 'NEWS ARTICLE',
    sourcePublicationDateRaw:
      '03 August 2026',
    sourcePublicationDate:
      '2026-08-03',
    lead:
      'Lead text',
    bodyParagraphs: [
      'Body paragraph',
    ],
    bodyText:
      'Body paragraph',
    ...overrides,
  }
}

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id: 20,
    titlu:
      'Different Flash title',
    slug:
      'different-flash-title',
    limba: 'en',
    versiuneAlternativa: null,
    pilon: 1,
    flashType: 'announcement',
    informationStatus: 'official',
    riskLevel: 'low',
    isHealthRelated: false,
    disclaimerTypes: [],
    surseFlash: [],
    editorialStatus: 'draft',
    automationDecision: 'review',
    generatAutomat: false,
    createdAt:
      '2026-09-13T08:00:00.000Z',
    updatedAt:
      '2026-09-13T08:00:00.000Z',
    _status: 'draft',
    ...overrides,
  } as FlashAi
}

function payloadReader(
  findResults:
    FlashAi[][],
): EvaluatorPayload {
  const find =
    vi.fn()

  for (const docs of findResults) {
    find.mockResolvedValueOnce({
      docs,
      totalDocs: docs.length,
    })
  }

  return {
    find,
  } as EvaluatorPayload
}

describe(
  'Flash article pre-persistence Payload dedup',
  () => {
    it(
      'detectează URL-ul canonic deja folosit de un Flash',
      async () => {
        const candidate =
          normalizedCandidate()

        const duplicate =
          flash({
            id: 30,
            surseFlash: [
              {
                url:
                  candidate.canonicalUrl,
              },
            ],
          })

        const payload =
          payloadReader([
            [duplicate],
            [],
          ])

        const result =
          await evaluateFlashArticlePrePersistenceDedupReadOnly(
            payload,
            candidate,
          )

        expect(
          result.evidence
            .sourceDuplicateFound,
        ).toBe(true)

        expect(
          result.evidence.reasons,
        ).toContain(
          'canonical_source_url_match',
        )

        expect(
          result.evidence
            .finalDedupPending,
        ).toBe(true)
      },
    )

    it(
      'detectează eventFingerprint grounded identic independent de limbă',
      async () => {
        const candidate =
          normalizedCandidate()

        const eventFingerprint =
          'grounded-event-fingerprint'

        const eventMatch =
          flash({
            id: 33,
            limba: 'ro',
            eventFingerprint,
          })

        const payload =
          payloadReader([
            [],
            [eventMatch],
            [],
          ])

        const result =
          await evaluateFlashArticlePrePersistenceDedupReadOnly(
            payload,
            candidate,
            {
              eventFingerprint,
            },
          )

        expect(
          result.evidence
            .eventFingerprintDuplicateFound,
        ).toBe(true)

        expect(
          result.evidence.reasons,
        ).toContain(
          'event_fingerprint_match',
        )

        expect(
          result.evidence
            .finalDedupPending,
        ).toBe(false)

        expect(
          payload.find,
        ).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            collection: 'flash-ai',
            draft: true,
            overrideAccess: true,
            where: {
              eventFingerprint: {
                equals:
                  eventFingerprint,
              },
            },
          }),
        )
      },
    )

    it(
      'detectează sourceFingerprint identic doar ca semnal de review',
      async () => {
        const candidate =
          normalizedCandidate()

        const sourceFingerprint =
          '084f1199b4915a604c578316b8a4ef6fd15097952ef38a97be960e1771a663a0'

        const fingerprintMatch =
          flash({
            id: 32,
            sourceFingerprint,
          })

        const payload =
          payloadReader([
            [],
            [fingerprintMatch],
            [],
          ])

        const result =
          await evaluateFlashArticlePrePersistenceDedupReadOnly(
            payload,
            candidate,
            {
              sourceFingerprint,
            },
          )

        expect(
          result.evidence
            .sourceFingerprintReviewSignal,
        ).toBe(true)

        expect(
          result.evidence.reasons,
        ).toContain(
          'source_fingerprint_match',
        )

        expect(
          result.evidence
            .finalDedupPending,
        ).toBe(true)

        expect(
          payload.find,
        ).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            collection: 'flash-ai',
            draft: true,
            overrideAccess: true,
            where: {
              sourceFingerprint: {
                equals:
                  sourceFingerprint,
              },
            },
          }),
        )
      },
    )

    it(
      'detectează titlul normalizat doar în aceeași limbă',
      async () => {
        const candidate =
          normalizedCandidate()

        const titleMatch =
          flash({
            id: 31,
            titlu:
              'FOURTH GPAI   SIGNATORY TASKFORCE MEETING!',
          })

        const payload =
          payloadReader([
            [],
            [titleMatch],
          ])

        const result =
          await evaluateFlashArticlePrePersistenceDedupReadOnly(
            payload,
            candidate,
          )

        expect(
          result.evidence
            .titleReviewSignal,
        ).toBe(true)

        expect(
          result.evidence.reasons,
        ).toContain(
          'normalized_title_match',
        )
      },
    )

    it(
      'interoghează URL-ul canonic și eșantionul aceleiași limbi fără write-uri',
      async () => {
        const candidate =
          normalizedCandidate()

        const payload =
          payloadReader([
            [],
            [],
          ])

        const result =
          await evaluateFlashArticlePrePersistenceDedupReadOnly(
            payload,
            candidate,
          )

        expect(result).toMatchObject({
          candidateCount: 0,
          evidence: {
            sourceDuplicateFound: false,
            eventFingerprintDuplicateFound: false,
            sourceFingerprintReviewSignal: false,
            titleReviewSignal: false,
            finalDedupPending: true,
            reasons: [
              'missing_event_fingerprint',
            ],
            matches: [],
          },
        })

        expect(
          payload.find,
        ).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            collection: 'flash-ai',
            draft: true,
            overrideAccess: true,
            where: {
              'surseFlash.url': {
                equals:
                  candidate.canonicalUrl,
              },
            },
          }),
        )

        expect(
          payload.find,
        ).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            collection: 'flash-ai',
            draft: true,
            overrideAccess: true,
            sort: '-createdAt',
            where: {
              limba: {
                equals: 'en',
              },
            },
          }),
        )
      },
    )

    it(
      'deduplică același Flash întors de ambele interogări',
      async () => {
        const candidate =
          normalizedCandidate()

        const same =
          flash({
            id: 40,
            titlu:
              candidate.title,
            surseFlash: [
              {
                url:
                  candidate.canonicalUrl,
              },
            ],
          })

        const payload =
          payloadReader([
            [same],
            [same],
          ])

        const result =
          await evaluateFlashArticlePrePersistenceDedupReadOnly(
            payload,
            candidate,
          )

        expect(
          result.candidateCount,
        ).toBe(1)

        expect(
          result.evidence.matches,
        ).toEqual([
          {
            id: 40,
            reasons: [
              'canonical_source_url_match',
              'normalized_title_match',
            ],
          },
        ])
      },
    )

    it(
      'limitează eșantionul de titluri la maximum 500',
      async () => {
        const payload =
          payloadReader([
            [],
            [],
          ])

        await evaluateFlashArticlePrePersistenceDedupReadOnly(
          payload,
          normalizedCandidate(),
          {
            titleSampleLimit: 5000,
          },
        )

        expect(
          payload.find,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            limit: 500,
            sort: '-createdAt',
          }),
        )
      },
    )
  },
)
