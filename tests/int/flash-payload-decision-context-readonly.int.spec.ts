import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import {
  loadFlashDecisionContextByIdReadOnly,
} from '@/lib/flash/payloadDecisionContextReadOnly'

type ContextPayload =
  Parameters<
    typeof loadFlashDecisionContextByIdReadOnly
  >[0]

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id: 1,
    titlu:
      'Flash test',
    slug:
      'flash-test',
    limba:
      'ro',
    versiuneAlternativa:
      null,
    pilon:
      1,
    flashType:
      'announcement',
    informationStatus:
      'official',
    riskLevel:
      'low',
    isHealthRelated:
      false,
    disclaimerTypes:
      [],
    surseFlash: [
      {
        sursa:
          100,
        url:
          'https://example.com/source',
        primary:
          true,
      },
    ],
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

function source(
  overrides:
    Partial<Surse> = {},
): Surse {
  return {
    id:
      100,
    nume:
      'Sursă test',
    url:
      'https://example.com',
    sourceRole:
      'primary',
    editorialTrust:
      'high',
    citationMode:
      'paraphrase',
    allowIngestion:
      true,
    allowAutoPublish:
      true,

    nivelIncredere:
      'primar',
    tipCitarePermis:
      'parafrazare',
    permiteAutoGenerare:
      true,

    activa:
      true,

    createdAt:
      '2026-09-05T08:00:00.000Z',
    updatedAt:
      '2026-09-05T08:00:00.000Z',

    ...overrides,
  } as Surse
}

function payloadReader({
  flashes,
  sources = [
    source(),
  ],
}: {
  flashes:
    FlashAi[]
  sources?:
    Surse[]
}): ContextPayload {
  const flashMap =
    new Map(
      flashes.map(
        item => [
          item.id,
          item,
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
        const item =
          flashMap.get(
            Number(id),
          )

        if (!item) {
          throw new Error(
            `Flash ${id} not found`,
          )
        }

        return item
      },
    )

  const find =
    vi.fn()
      .mockResolvedValue({
        docs:
          sources,
        totalDocs:
          sources.length,
      })

  return {
    findByID,
    find,
  } as ContextPayload
}

describe(
  'Flash Payload read-only decision context',
  () => {
    it(
      'maps Flash metadata and a registered source',
      async () => {
        const ro =
          flash({
            versiuneAlternativa:
              2,
          })

        const en =
          flash({
            id:
              2,
            limba:
              'en',
            versiuneAlternativa:
              1,
          })

        const result =
          await loadFlashDecisionContextByIdReadOnly(
            payloadReader({
              flashes: [
                ro,
                en,
              ],
            }),
            ro.id,
          )

        expect(
          result.flash,
        ).toEqual({
          informationStatus:
            'official',
          riskLevel:
            'low',
          isHealthRelated:
            false,
          clinicalValidationStatus:
            undefined,
          disclaimerTypes:
            [],
        })

        expect(
          result
            .pairCompleteness,
        ).toEqual({
          roComplete:
            true,
          enComplete:
            true,
        })

        expect(
          result.sources,
        ).toEqual([
          {
            registered:
              true,
            active:
              true,
            hasConcreteURL:
              true,
            allowIngestion:
              true,
            allowAutoPublish:
              true,
            editorialTrust:
              'high',
          },
        ])
      },
    )

    it(
      'preserves source policy that disables AUTO',
      async () => {
        const result =
          await loadFlashDecisionContextByIdReadOnly(
            payloadReader({
              flashes: [
                flash(),
              ],

              sources: [
                source({
                  allowAutoPublish:
                    false,
                  editorialTrust:
                    'restricted',
                }),
              ],
            }),
            1,
          )

        expect(
          result.sources[0],
        ).toMatchObject({
          registered:
            true,
          allowAutoPublish:
            false,
          editorialTrust:
            'restricted',
        })
      },
    )

    it(
      'marks an unresolved registry relation as unregistered',
      async () => {
        const result =
          await loadFlashDecisionContextByIdReadOnly(
            payloadReader({
              flashes: [
                flash(),
              ],

              sources:
                [],
            }),
            1,
          )

        expect(
          result.sources[0],
        ).toEqual({
          registered:
            false,
          active:
            false,
          hasConcreteURL:
            true,
          allowIngestion:
            false,
          allowAutoPublish:
            false,
          editorialTrust:
            'restricted',
        })
      },
    )

    it(
      'rejects an invalid concrete source URL',
      async () => {
        const result =
          await loadFlashDecisionContextByIdReadOnly(
            payloadReader({
              flashes: [
                flash({
                  surseFlash: [
                    {
                      sursa:
                        100,
                      url:
                        'not-a-url',
                    },
                  ],
                }),
              ],
            }),
            1,
          )

        expect(
          result
            .sources[0]
            .hasConcreteURL,
        ).toBe(false)
      },
    )

    it(
      'reports incomplete bilingual pair without treating it as runtime uncertainty',
      async () => {
        const result =
          await loadFlashDecisionContextByIdReadOnly(
            payloadReader({
              flashes: [
                flash({
                  versiuneAlternativa:
                    null,
                }),
              ],
            }),
            1,
          )

        expect(
          result
            .pairCompleteness,
        ).toEqual({
          roComplete:
            true,
          enComplete:
            false,
        })

        expect(
          result.alternativeId,
        ).toBeNull()
      },
    )
  },
)
