import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import {
  evaluateFlashPairCompletenessByIdReadOnly,
} from '@/lib/flash/runtimeEvidence/payloadPairCompletenessReadOnlyEvaluator'

type EvaluatorPayload =
  Parameters<
    typeof evaluateFlashPairCompletenessByIdReadOnly
  >[0]

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id: 10,
    titlu:
      'Flash test',
    slug:
      'flash-test',
    limba:
      'ro',
    versiuneAlternativa:
      null,
    pilon: 1,
    flashType:
      'announcement',
    informationStatus:
      'official',
    riskLevel:
      'low',
    isHealthRelated:
      false,
    disclaimerTypes: [],
    surseFlash: [],
    editorialStatus:
      'draft',
    automationDecision:
      'review',
    generatAutomat:
      false,
    createdAt:
      '2026-09-05T08:00:00.000Z',
    updatedAt:
      '2026-09-05T08:00:00.000Z',
    _status:
      'draft',
    ...overrides,
  } as FlashAi
}

function payloadReader(
  docs:
    FlashAi[],
): EvaluatorPayload {
  const map =
    new Map(
      docs.map(
        doc => [
          doc.id,
          doc,
        ],
      ),
    )

  const findByID =
    vi.fn(
      async ({
        id,
      }: {
        id:
          number | string
      }) => {
        const doc =
          map.get(
            Number(id),
          )

        if (!doc) {
          throw new Error(
            `Flash ${id} not found`,
          )
        }

        return doc
      },
    )

  return {
    findByID,
  } as EvaluatorPayload
}

describe(
  'Flash Payload read-only pair completeness evaluator',
  () => {
    it(
      'RO fără alternativă înseamnă RO complet și EN lipsă',
      async () => {
        const candidate =
          flash()

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              candidate,
            ]),
            candidate.id,
          )

        expect(
          result.evidence,
        ).toEqual({
          roComplete: true,
          enComplete: false,
        })

        expect(
          result.alternativeId,
        ).toBeNull()
      },
    )

    it(
      'EN fără alternativă înseamnă EN complet și RO lipsă',
      async () => {
        const candidate =
          flash({
            limba: 'en',
          })

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              candidate,
            ]),
            candidate.id,
          )

        expect(
          result.evidence,
        ).toEqual({
          roComplete: false,
          enComplete: true,
        })
      },
    )

    it(
      'RO legat de EN produce pereche completă',
      async () => {
        const ro =
          flash({
            id: 10,
            limba: 'ro',
            versiuneAlternativa:
              20,
          })

        const en =
          flash({
            id: 20,
            limba: 'en',
            versiuneAlternativa:
              10,
          })

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              ro,
              en,
            ]),
            ro.id,
          )

        expect(
          result.evidence,
        ).toEqual({
          roComplete: true,
          enComplete: true,
        })

        expect(
          result.alternativeLanguage,
        ).toBe('en')
      },
    )

    it(
      'EN legat de RO produce aceeași pereche completă',
      async () => {
        const ro =
          flash({
            id: 10,
            limba: 'ro',
          })

        const en =
          flash({
            id: 20,
            limba: 'en',
            versiuneAlternativa:
              10,
          })

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              ro,
              en,
            ]),
            en.id,
          )

        expect(
          result.evidence,
        ).toEqual({
          roComplete: true,
          enComplete: true,
        })
      },
    )

    it(
      'alternativa în aceeași limbă nu completează cealaltă limbă',
      async () => {
        const first =
          flash({
            id: 10,
            limba: 'ro',
            versiuneAlternativa:
              20,
          })

        const second =
          flash({
            id: 20,
            limba: 'ro',
          })

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              first,
              second,
            ]),
            first.id,
          )

        expect(
          result.evidence,
        ).toEqual({
          roComplete: true,
          enComplete: false,
        })
      },
    )

    it(
      'acceptă și relația Payload populată ca obiect',
      async () => {
        const en =
          flash({
            id: 20,
            limba: 'en',
          })

        const ro =
          flash({
            id: 10,
            limba: 'ro',
            versiuneAlternativa:
              en,
          })

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              ro,
              en,
            ]),
            ro.id,
          )

        expect(
          result.alternativeId,
        ).toBe(20)

        expect(
          result.evidence,
        ).toEqual({
          roComplete: true,
          enComplete: true,
        })
      },
    )

    it(
      'self-link nu poate fabrica o pereche bilingvă',
      async () => {
        const candidate =
          flash({
            versiuneAlternativa:
              10,
          })

        const result =
          await evaluateFlashPairCompletenessByIdReadOnly(
            payloadReader([
              candidate,
            ]),
            candidate.id,
          )

        expect(
          result.evidence,
        ).toEqual({
          roComplete: true,
          enComplete: false,
        })
      },
    )
  },
)
