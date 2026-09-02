import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { FlashAi } from '@/payload-types'

import {
  evaluateFlashDedupByIdReadOnly,
} from '@/lib/flash/runtimeEvidence/payloadDedupReadOnlyEvaluator'

type EvaluatorPayload =
  Parameters<
    typeof evaluateFlashDedupByIdReadOnly
  >[0]

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id: 10,
    titlu: 'OpenAI lansează o platformă educațională',
    slug: 'openai-platforma-educationala',
    limba: 'ro',
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
    eventFingerprint:
      'event-openai-education-2026',
    sourceFingerprint:
      'source-openai-release',
    createdAt:
      '2026-09-02T12:00:00.000Z',
    updatedAt:
      '2026-09-02T12:00:00.000Z',
    _status: 'draft',
    ...overrides,
  } as FlashAi
}

function payloadReader(
  candidate: FlashAi,
  findResults:
    FlashAi[][],
): EvaluatorPayload {
  const findByID =
    vi.fn()
      .mockResolvedValue(candidate)

  const find =
    vi.fn()

  for (const docs of findResults) {
    find.mockResolvedValueOnce({
      docs,
      totalDocs: docs.length,
    })
  }

  return {
    findByID,
    find,
  } as EvaluatorPayload
}

describe(
  'Flash Payload read-only dedup evaluator',
  () => {
    it(
      'detectează eventFingerprint identic ca duplicat evident',
      async () => {
        const candidate =
          flash()

        const duplicate =
          flash({
            id: 20,
            limba: 'en',
            titlu:
              'OpenAI launches an education platform',
            sourceFingerprint:
              'different-source',
          })

        const payload =
          payloadReader(
            candidate,
            [
              [candidate, duplicate],
              [candidate],
              [candidate],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(
          result.evidence
            .obviousDuplicate,
        ).toBe(true)

        expect(
          result.evidence.reasons,
        ).toContain(
          'event_fingerprint_match',
        )
      },
    )

    it(
      'sourceFingerprint identic produce semnal de review, nu duplicat evident',
      async () => {
        const candidate =
          flash()

        const sourceMatch =
          flash({
            id: 20,
            eventFingerprint:
              'different-event',
            titlu:
              'Actualizare diferită',
          })

        const payload =
          payloadReader(
            candidate,
            [
              [candidate],
              [candidate, sourceMatch],
              [candidate],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(
          result.evidence
            .dedupPassed,
        ).toBe(false)

        expect(
          result.evidence
            .obviousDuplicate,
        ).toBe(false)

        expect(
          result.evidence.reasons,
        ).toContain(
          'source_fingerprint_match',
        )
      },
    )

    it(
      'detectează titlu echivalent după normalizare în eșantionul aceleiași limbi',
      async () => {
        const candidate =
          flash()

        const titleMatch =
          flash({
            id: 20,
            titlu:
              'OPENAI   lanseaza o platforma educationala!',
            eventFingerprint:
              'different-event',
            sourceFingerprint:
              'different-source',
          })

        const payload =
          payloadReader(
            candidate,
            [
              [candidate],
              [candidate],
              [candidate, titleMatch],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(
          result.evidence
            .obviousDuplicate,
        ).toBe(false)

        expect(
          result.evidence.reasons,
        ).toContain(
          'normalized_title_match',
        )
      },
    )

    it(
      'ignoră perechea RO/EN chiar dacă are același eventFingerprint',
      async () => {
        const candidate =
          flash({
            versiuneAlternativa: 20,
          })

        const alternative =
          flash({
            id: 20,
            limba: 'en',
            titlu:
              'OpenAI launches an education platform',
          })

        const payload =
          payloadReader(
            candidate,
            [
              [candidate, alternative],
              [candidate, alternative],
              [candidate],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(
          result.alternativeId,
        ).toBe(20)

        expect(
          result.evidence
            .dedupPassed,
        ).toBe(true)

        expect(
          result.evidence.matches,
        ).toEqual([])
      },
    )

    it(
      'ignoră documentul candidat însuși',
      async () => {
        const candidate =
          flash()

        const payload =
          payloadReader(
            candidate,
            [
              [candidate],
              [candidate],
              [candidate],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(
          result.evidence
            .dedupPassed,
        ).toBe(true)

        expect(
          result.evidence.matches,
        ).toEqual([])
      },
    )

    it(
      'lipsa eventFingerprint oprește dedup PASS chiar fără alte potriviri',
      async () => {
        const candidate =
          flash({
            eventFingerprint: null,
          })

        const payload =
          payloadReader(
            candidate,
            [
              [candidate],
              [candidate],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(
          result.evidence
            .dedupPassed,
        ).toBe(false)

        expect(
          result.evidence.reasons,
        ).toEqual([
          'missing_event_fingerprint',
        ])
      },
    )

    it(
      'un Flash fără potriviri trece deduplicarea',
      async () => {
        const candidate =
          flash()

        const payload =
          payloadReader(
            candidate,
            [
              [candidate],
              [candidate],
              [candidate],
            ],
          )

        const result =
          await evaluateFlashDedupByIdReadOnly(
            payload,
            candidate.id,
          )

        expect(result).toMatchObject({
          flashId: 10,
          alternativeId: null,
          candidateCount: 1,
          evidence: {
            dedupPassed: true,
            obviousDuplicate: false,
            reasons: [],
            matches: [],
          },
        })
      },
    )

    it(
      'limitează eșantionul de titluri la maximum 500',
      async () => {
        const candidate =
          flash()

        const payload =
          payloadReader(
            candidate,
            [
              [candidate],
              [candidate],
              [candidate],
            ],
          )

        await evaluateFlashDedupByIdReadOnly(
          payload,
          candidate.id,
          {
            titleSampleLimit: 5000,
          },
        )

        expect(
          payload.find,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            collection: 'flash-ai',
            limit: 500,
            sort: '-createdAt',
          }),
        )
      },
    )
  },
)
