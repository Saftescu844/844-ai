import { describe, expect, it, vi } from 'vitest'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import {
  evaluateFlashByIdReadOnly,
  type FlashRuntimeEvidence,
} from '@/lib/flash/payloadReadOnlyEvaluator'

type EvaluatorPayload =
  Parameters<
    typeof evaluateFlashByIdReadOnly
  >[0]

const flash = (
  overrides: Partial<FlashAi> = {},
): FlashAi =>
  ({
    id: 1,
    titlu: 'Flash test',
    slug: 'flash-test',
    limba: 'ro',
    pilon: 1,
    flashType: 'announcement',
    informationStatus: 'official',
    riskLevel: 'low',
    isHealthRelated: false,
    disclaimerTypes: [],
    surseFlash: [
      {
        sursa: 100,
        url: 'https://example.com/source',
        primary: true,
      },
    ],
    editorialStatus: 'draft',
    automationDecision: 'review',
    updatedAt: '2026-09-02T10:00:00.000Z',
    createdAt: '2026-09-02T10:00:00.000Z',
    _status: 'draft',
    ...overrides,
  }) as unknown as FlashAi

const source = (
  overrides: Partial<Surse> = {},
): Surse =>
  ({
    id: 100,
    nume: 'Sursă test',
    url: 'https://example.com',
    sourceRole: 'primary',
    editorialTrust: 'high',
    citationMode: 'paraphrase',
    allowIngestion: true,
    allowAutoPublish: true,

    // Legacy — păstrate de schema actuală.
    nivelIncredere: 'primar',
    tipCitarePermis: 'parafrazare',
    permiteAutoGenerare: true,

    activa: true,
    updatedAt: '2026-09-02T10:00:00.000Z',
    createdAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  }) as Surse

const validEvidence = (
  overrides: Partial<FlashRuntimeEvidence> = {},
): FlashRuntimeEvidence => ({
  dedupPassed: true,
  sourceVerificationPassed: true,
  factsSupportedBySources: true,
  materialContradictions: false,
  engineCertain: true,

  safetyGateTriggered: false,
  importantMedicalInterpretation: false,
  extraordinaryClaimNeedsReview: false,
  regulatoryStatusUnclear: false,

  obviousDuplicate: false,
  unverifiableSources: false,
  fabricatedInformation: false,
  fabricatedCitations: false,

  individualDiagnosis: false,
  individualTreatmentRecommendation: false,
  medicationChange: false,
  dangerousInstructions: false,
  fundamentalEditorialViolation: false,

  ...overrides,
})

function payloadReader({
  primary,
  alternative = null,
  sources = [source()],
}: {
  primary: FlashAi
  alternative?: FlashAi | null
  sources?: Surse[]
}): EvaluatorPayload {
  const findByID = vi.fn(
    async ({
      collection,
      id,
    }: {
      collection: string
      id: number
    }) => {
      if (collection !== 'flash-ai') {
        throw new Error(
          `Unexpected collection: ${collection}`,
        )
      }

      if (id === primary.id) {
        return primary
      }

      if (
        alternative !== null &&
        id === alternative.id
      ) {
        return alternative
      }

      throw new Error(
        `Flash ${id} not found`,
      )
    },
  )

  const find = vi.fn(
    async ({
      collection,
    }: {
      collection: string
    }) => {
      if (collection !== 'surse') {
        throw new Error(
          `Unexpected collection: ${collection}`,
        )
      }

      return {
        docs: sources,
        totalDocs: sources.length,
      }
    },
  )

  return {
    findByID,
    find,
  } as unknown as EvaluatorPayload
}

describe(
  'Flash Payload read-only evaluator',
  () => {
    it(
      'RO + EN + sursă eligibilă poate ajunge la AUTO',
      async () => {
        const ro = flash({
          id: 1,
          limba: 'ro',
          versiuneAlternativa: 2,
        })

        const en = flash({
          id: 2,
          limba: 'en',
          versiuneAlternativa: 1,
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
              alternative: en,
            }),
            ro.id,
            validEvidence(),
          )

        expect(result).toEqual({
          flashId: 1,
          roComplete: true,
          enComplete: true,
          sourceCount: 1,
          result: {
            decision: 'autoPublish',
            reasons: [
              'auto_publish_gates_passed',
            ],
          },
        })
      },
    )

    it(
      'funcționează și când documentul evaluat este EN',
      async () => {
        const en = flash({
          id: 2,
          limba: 'en',
          versiuneAlternativa: 1,
        })

        const ro = flash({
          id: 1,
          limba: 'ro',
          versiuneAlternativa: 2,
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: en,
              alternative: ro,
            }),
            en.id,
            validEvidence(),
          )

        expect(result.roComplete).toBe(true)
        expect(result.enComplete).toBe(true)
        expect(result.result.decision)
          .toBe('autoPublish')
      },
    )

    it(
      'lipsa versiunii EN trimite Flash-ul la REVIEW',
      async () => {
        const ro = flash({
          limba: 'ro',
          versiuneAlternativa: null,
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
            }),
            ro.id,
            validEvidence(),
          )

        expect(result.enComplete).toBe(false)
        expect(result.result.decision)
          .toBe('review')
        expect(result.result.reasons)
          .toContain('missing_en_version')
      },
    )

    it(
      'o sursă restricted nu poate intra în AUTO',
      async () => {
        const ro = flash({
          versiuneAlternativa: 2,
        })

        const en = flash({
          id: 2,
          limba: 'en',
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
              alternative: en,
              sources: [
                source({
                  editorialTrust:
                    'restricted',
                }),
              ],
            }),
            ro.id,
            validEvidence(),
          )

        expect(result.result).toEqual({
          decision: 'review',
          reasons: [
            'source_auto_publish_disabled',
          ],
        })
      },
    )

    it(
      'o sursă concretă dar neînregistrată nu este validată',
      async () => {
        const ro = flash({
          versiuneAlternativa: 2,
          surseFlash: [
            {
              url: 'https://example.com/source',
              primary: true,
            },
          ],
        })

        const en = flash({
          id: 2,
          limba: 'en',
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
              alternative: en,
              sources: [],
            }),
            ro.id,
            validEvidence(),
          )

        expect(result.result.decision)
          .toBe('review')
        expect(result.result.reasons)
          .toContain(
            'sources_not_validated',
          )
      },
    )

    it(
      'un URL concret invalid face sursa nevalidă',
      async () => {
        const ro = flash({
          versiuneAlternativa: 2,
          surseFlash: [
            {
              sursa: 100,
              url: 'not-a-valid-url',
              primary: true,
            },
          ],
        })

        const en = flash({
          id: 2,
          limba: 'en',
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
              alternative: en,
            }),
            ro.id,
            validEvidence(),
          )

        expect(result.result.reasons)
          .toContain(
            'sources_not_validated',
          )
      },
    )

    it(
      'un Flash fără surse merge la REVIEW',
      async () => {
        const ro = flash({
          versiuneAlternativa: 2,
          surseFlash: [],
        })

        const en = flash({
          id: 2,
          limba: 'en',
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
              alternative: en,
              sources: [],
            }),
            ro.id,
            validEvidence(),
          )

        expect(result.sourceCount).toBe(0)
        expect(result.result.decision)
          .toBe('review')
        expect(result.result.reasons)
          .toContain(
            'sources_not_validated',
          )
      },
    )

    it(
      'un gate BLOCK din evidence păstrează prioritatea maximă',
      async () => {
        const ro = flash({
          versiuneAlternativa: 2,
        })

        const en = flash({
          id: 2,
          limba: 'en',
        })

        const result =
          await evaluateFlashByIdReadOnly(
            payloadReader({
              primary: ro,
              alternative: en,
            }),
            ro.id,
            validEvidence({
              individualDiagnosis: true,
              engineCertain: false,
            }),
          )

        expect(result.result).toEqual({
          decision: 'blocked',
          reasons: [
            'individual_diagnosis',
          ],
        })
      },
    )
  },
)
