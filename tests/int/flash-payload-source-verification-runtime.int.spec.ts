import type { Payload } from 'payload'
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
  runFlashSourceVerificationFromPayloadReadOnly,
} from '@/lib/flash/runtimeEvidence/payloadSourceVerificationRuntime'

type FlashPayloadReader =
  Pick<
    Payload,
    'findByID' | 'find'
  >

function flash(
  surseFlash:
    FlashAi['surseFlash'],
): FlashAi {
  return {
    id: 77,
    surseFlash,
  } as unknown as FlashAi
}

function source(
  overrides:
    Partial<Surse> = {},
): Surse {
  return {
    id: 10,
    nume:
      'Example Source',
    url:
      'https://example.com',
    activa: true,
    allowIngestion: true,
    allowAutoPublish: true,
    editorialTrust: 'high',
    sourceRole: 'primary',
    citationMode:
      'paraphrase',
    ...overrides,
  } as unknown as Surse
}

function reader(
  flashDoc: FlashAi,
  sourceDocs:
    Surse[] = [],
): FlashPayloadReader {
  return {
    findByID:
      vi.fn(
        async () =>
          flashDoc,
      ),

    find:
      vi.fn(
        async () => ({
          docs:
            sourceDocs,
        }),
      ),
  } as unknown as
    FlashPayloadReader
}

const publicResolver =
  async () => [
    {
      address:
        '93.184.216.34',
      family: 4 as const,
    },
  ]

function successfulFetch(
  onFetch?: () => void,
): typeof fetch {
  return (async () => {
    onFetch?.()

    return new Response(
      'verified content',
      {
        status: 200,
        headers: {
          'content-type':
            'text/plain',
        },
      },
    )
  }) as typeof fetch
}

describe(
  'Flash Payload source verification runtime read-only',
  () => {
    it(
      'does not run verification when Flash has no source rows',
      async () => {
        let fetchCalls = 0

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([]),
            ),
            77,
            {
              fetchImpl:
                successfulFetch(
                  () => {
                    fetchCalls += 1
                  },
                ),

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          fetchCalls,
        ).toBe(0)

        expect(result)
          .toMatchObject({
            verificationCoverage:
              'notRun',
            verification: null,
            completeDecisionEvidence:
              null,
          })
      },
    )

    it(
      'runs complete verification when every row is retrievable',
      async () => {
        let fetchCalls = 0

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([
                {
                  id: 'row-1',
                  sursa: 10,
                  url:
                    'https://example.com/article',
                },
              ]),
              [
                source(),
              ],
            ),
            77,
            {
              fetchImpl:
                successfulFetch(
                  () => {
                    fetchCalls += 1
                  },
                ),

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          fetchCalls,
        ).toBe(1)

        expect(
          result
            .verificationCoverage,
        ).toBe(
          'complete',
        )

        expect(
          result.verification,
        ).not.toBeNull()

        expect(
          result
            .completeDecisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            true,
        })
      },
    )

    it(
      'does not fetch when ingestion is disabled',
      async () => {
        let fetchCalls = 0

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([
                {
                  id: 'row-1',
                  sursa: 10,
                  url:
                    'https://example.com/article',
                },
              ]),
              [
                source({
                  allowIngestion:
                    false,
                }),
              ],
            ),
            77,
            {
              fetchImpl:
                successfulFetch(
                  () => {
                    fetchCalls += 1
                  },
                ),

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          fetchCalls,
        ).toBe(0)

        expect(
          result
            .verificationCoverage,
        ).toBe(
          'notRun',
        )

        expect(
          result.verification,
        ).toBeNull()

        expect(
          result
            .completeDecisionEvidence,
        ).toBeNull()

        expect(
          result.plan.items[0]
            .skipReason,
        ).toBe(
          'ingestion_disabled',
        )
      },
    )

    it(
      'runs only eligible rows but marks mixed plan partial',
      async () => {
        let fetchCalls = 0

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([
                {
                  id: 'row-1',
                  sursa: 10,
                  url:
                    'https://example.com/a',
                },
                {
                  id: 'row-2',
                  sursa: 20,
                  url:
                    'https://second.example.com/b',
                },
              ]),
              [
                source(),
                source({
                  id: 20,
                  nume:
                    'Second Source',
                  url:
                    'https://second.example.com',
                  allowIngestion:
                    false,
                }),
              ],
            ),
            77,
            {
              fetchImpl:
                successfulFetch(
                  () => {
                    fetchCalls += 1
                  },
                ),

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          fetchCalls,
        ).toBe(1)

        expect(
          result.plan,
        ).toMatchObject({
          totalRows: 2,
          retrieveCount: 1,
          skipCount: 1,
        })

        expect(
          result
            .verificationCoverage,
        ).toBe(
          'partial',
        )

        expect(
          result.verification
            ?.decisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            true,
        })

        expect(
          result
            .completeDecisionEvidence,
        ).toBeNull()
      },
    )

    it(
      'does not present missing-source plan as complete verification',
      async () => {
        let fetchCalls = 0

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([
                {
                  id: 'row-1',
                  sursa: 10,
                  url:
                    'https://example.com/a',
                },
                {
                  id: 'row-2',
                  sursa: 99,
                  url:
                    'https://missing.example.com/b',
                },
              ]),
              [
                source(),
              ],
            ),
            77,
            {
              fetchImpl:
                successfulFetch(
                  () => {
                    fetchCalls += 1
                  },
                ),

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          fetchCalls,
        ).toBe(1)

        expect(
          result
            .verificationCoverage,
        ).toBe(
          'partial',
        )

        expect(
          result.plan.items[1]
            .skipReason,
        ).toBe(
          'source_not_found',
        )

        expect(
          result
            .completeDecisionEvidence,
        ).toBeNull()
      },
    )

    it(
      'returns complete false evidence when retrieval actually fails',
      async () => {
        const fetchImpl =
          (async () =>
            new Response(
              'server error',
              {
                status: 503,
              },
            )) as typeof fetch

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([
                {
                  id: 'row-1',
                  sursa: 10,
                  url:
                    'https://example.com/article',
                },
              ]),
              [
                source(),
              ],
            ),
            77,
            {
              fetchImpl,

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          result
            .verificationCoverage,
        ).toBe(
          'complete',
        )

        expect(
          result
            .completeDecisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            false,
        })

        expect(
          result.verification
            ?.retrievals[0]
            .failureReason,
        ).toBe(
          'http_error',
        )
      },
    )

    it(
      'allowAutoPublish false still permits complete retrieval verification',
      async () => {
        let fetchCalls = 0

        const result =
          await runFlashSourceVerificationFromPayloadReadOnly(
            reader(
              flash([
                {
                  id: 'row-1',
                  sursa: 10,
                  url:
                    'https://example.com/article',
                },
              ]),
              [
                source({
                  allowAutoPublish:
                    false,
                }),
              ],
            ),
            77,
            {
              fetchImpl:
                successfulFetch(
                  () => {
                    fetchCalls += 1
                  },
                ),

              networkPolicyOptions: {
                resolveHostname:
                  publicResolver,
              },
            },
          )

        expect(
          fetchCalls,
        ).toBe(1)

        expect(
          result
            .verificationCoverage,
        ).toBe(
          'complete',
        )

        expect(
          result
            .completeDecisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            true,
        })
      },
    )
  },
)
