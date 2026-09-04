import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  runFlashSourceVerificationRuntimePipeline as runRuntimePipeline,
} from '@/lib/flash/runtimeEvidence/sourceVerificationRuntimePipeline'

import type {
  FlashSourceRetrieverOptions,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'

const publicResolver =
  async () => [
    {
      address:
        '93.184.216.34',
      family: 4 as const,
    },
  ]

async function runFlashSourceVerificationRuntimePipeline(
  sources:
    FlashSourceRetrievalInput[],
  options:
    FlashSourceRetrieverOptions = {},
) {
  return runRuntimePipeline(
    sources,
    {
      networkPolicyOptions: {
        resolveHostname:
          publicResolver,
      },

      ...options,
    },
  )
}

import type {
  FlashSourceRetrievalInput,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'

function source(
  overrides:
    Partial<FlashSourceRetrievalInput> = {},
): FlashSourceRetrievalInput {
  return {
    id: 'source-1',

    registeredSourceUrl:
      'https://example.com',

    concreteUrl:
      'https://example.com/article',

    ...overrides,
  }
}

function successfulFetch(
  body = 'source content',
): typeof fetch {
  return (async () =>
    new Response(
      body,
      {
        status: 200,
        headers: {
          'content-type':
            'text/html; charset=utf-8',
        },
      },
    )) as typeof fetch
}

describe(
  'Flash source verification runtime pipeline',
  () => {
    it(
      'fără surse nu trece source verification',
      async () => {
        const result =
          await runFlashSourceVerificationRuntimePipeline(
            [],
            {
              fetchImpl:
                successfulFetch(),
            },
          )

        expect(
          result.retrievals,
        ).toEqual([])

        expect(
          result.sourceVerification
            .sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.decisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            false,
        })
      },
    )

    it(
      'o sursă retrasă cu succes produce sourceVerificationPassed true',
      async () => {
        const result =
          await runFlashSourceVerificationRuntimePipeline(
            [
              source(),
            ],
            {
              fetchImpl:
                successfulFetch(),
            },
          )

        expect(
          result.retrievals,
        ).toHaveLength(1)

        expect(
          result.retrievals[0]
            .failureReason,
        ).toBeNull()

        expect(
          result.sourceVerification
            .sourceVerificationPassed,
        ).toBe(true)

        expect(
          result.decisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            true,
        })
      },
    )

    it(
      'toate sursele trebuie să treacă retrieval și verificarea',
      async () => {
        const fetchImpl =
          (async (
            input,
          ): Promise<Response> => {
            const url =
              String(input)

            if (
              url.includes(
                'second.test',
              )
            ) {
              return new Response(
                'temporary failure',
                {
                  status: 503,
                  headers: {
                    'content-type':
                      'text/plain',
                  },
                },
              )
            }

            return new Response(
              'valid source',
              {
                status: 200,
                headers: {
                  'content-type':
                    'text/plain',
                },
              },
            )
          }) as typeof fetch

        const result =
          await runFlashSourceVerificationRuntimePipeline(
            [
              source({
                id: 'source-1',
              }),

              source({
                id: 'source-2',

                registeredSourceUrl:
                  'https://second.test',

                concreteUrl:
                  'https://second.test/article',
              }),
            ],
            {
              fetchImpl,
            },
          )

        expect(
          result.retrievals,
        ).toHaveLength(2)

        expect(
          result.retrievals[0]
            .failureReason,
        ).toBeNull()

        expect(
          result.retrievals[1]
            .failureReason,
        ).toBe(
          'http_error',
        )

        expect(
          result.sourceVerification
            .sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.decisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            false,
        })
      },
    )

    it(
      'un domeniu nepotrivit eșuează înainte de fetch și păstrează rezultatul controlat',
      async () => {
        let fetchCalls = 0

        const fetchImpl =
          (async () => {
            fetchCalls += 1

            return new Response(
              'should not run',
              {
                status: 200,
              },
            )
          }) as typeof fetch

        const result =
          await runFlashSourceVerificationRuntimePipeline(
            [
              source({
                concreteUrl:
                  'https://other.test/article',
              }),
            ],
            {
              fetchImpl,
            },
          )

        expect(fetchCalls)
          .toBe(0)

        expect(
          result.retrievals[0]
            .failureReason,
        ).toBe(
          'source_identity_mismatch',
        )

        expect(
          result.decisionEvidence
            .sourceVerificationPassed,
        ).toBe(false)
      },
    )

    it(
      'păstrează candidate-urile verificate pentru fiecare sursă',
      async () => {
        const result =
          await runFlashSourceVerificationRuntimePipeline(
            [
              source({
                id: 'primary',
              }),

              source({
                id: 'secondary',

                registeredSourceUrl:
                  'https://second.test',

                concreteUrl:
                  'https://second.test/report',
              }),
            ],
            {
              fetchImpl:
                successfulFetch(
                  'available material',
                ),
            },
          )

        expect(
          result.retrievals.map(
            retrieval =>
              retrieval.candidate.id,
          ),
        ).toEqual([
          'primary',
          'secondary',
        ])

        expect(
          result.sourceVerification
            .evaluatedSources.map(
              evaluated => ({
                id: evaluated.id,
                verified:
                  evaluated.verified,
              }),
            ),
        ).toEqual([
          {
            id: 'primary',
            verified: true,
          },
          {
            id: 'secondary',
            verified: true,
          },
        ])

        expect(
          result.decisionEvidence
            .sourceVerificationPassed,
        ).toBe(true)
      },
    )
  },
)
