import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  retrieveFlashSource,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'

describe(
  'Flash source retriever network policy integration',
  () => {
    it(
      'blochează destinație privată înainte de primul fetch',
      async () => {
        let fetchCalls = 0

        const fetchImpl =
          (async () => {
            fetchCalls += 1

            return new Response(
              'should not run',
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            {
              id: 'source-1',

              registeredSourceUrl:
                'https://example.com',

              concreteUrl:
                'https://example.com/article',
            },
            {
              fetchImpl,

              networkPolicyOptions: {
                resolveHostname:
                  async () => [
                    {
                      address:
                        '192.168.1.10',
                      family: 4,
                    },
                  ],
              },
            },
          )

        expect(fetchCalls)
          .toBe(0)

        expect(
          result.failureReason,
        ).toBe(
          'network_policy_blocked',
        )

        expect(
          result.networkPolicyReason,
        ).toBe(
          'dns_non_public_address',
        )

        expect(
          result.candidate.retrieved,
        ).toBe(false)
      },
    )

    it(
      'permite destinație publică și execută fetch',
      async () => {
        let fetchCalls = 0

        const fetchImpl =
          (async () => {
            fetchCalls += 1

            return new Response(
              'public content',
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
          await retrieveFlashSource(
            {
              id: 'source-1',

              registeredSourceUrl:
                'https://example.com',

              concreteUrl:
                'https://example.com/article',
            },
            {
              fetchImpl,

              networkPolicyOptions: {
                resolveHostname:
                  async () => [
                    {
                      address:
                        '93.184.216.34',
                      family: 4,
                    },
                  ],
              },
            },
          )

        expect(fetchCalls)
          .toBe(1)

        expect(
          result.failureReason,
        ).toBeNull()

        expect(
          result.networkPolicyReason,
        ).toBeNull()
      },
    )

    it(
      'verifică politica din nou înainte de redirect',
      async () => {
        let resolverCalls = 0
        let fetchCalls = 0

        const fetchImpl =
          (async () => {
            fetchCalls += 1

            if (
              fetchCalls === 1
            ) {
              return new Response(
                null,
                {
                  status: 302,

                  headers: {
                    location:
                      '/final',
                  },
                },
              )
            }

            return new Response(
              'should not run',
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            {
              id: 'source-1',

              registeredSourceUrl:
                'https://example.com',

              concreteUrl:
                'https://example.com/start',
            },
            {
              fetchImpl,

              networkPolicyOptions: {
                resolveHostname:
                  async () => {
                    resolverCalls += 1

                    if (
                      resolverCalls === 1
                    ) {
                      return [
                        {
                          address:
                            '93.184.216.34',
                          family: 4,
                        },
                      ]
                    }

                    return [
                      {
                        address:
                          '10.0.0.5',
                        family: 4,
                      },
                    ]
                  },
              },
            },
          )

        expect(fetchCalls)
          .toBe(1)

        expect(resolverCalls)
          .toBe(2)

        expect(
          result.failureReason,
        ).toBe(
          'network_policy_blocked',
        )

        expect(
          result.networkPolicyReason,
        ).toBe(
          'dns_non_public_address',
        )
      },
    )

    it(
      'network policy failure rămâne retrieval failure controlat',
      async () => {
        const result =
          await retrieveFlashSource(
            {
              id: 'source-1',

              registeredSourceUrl:
                'http://127.0.0.1',

              concreteUrl:
                'http://127.0.0.1/admin',
            },
            {
              fetchImpl:
                (async () => {
                  throw new Error(
                    'must not fetch',
                  )
                }) as typeof fetch,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'network_policy_blocked',
        )

        expect(
          result.networkPolicyReason,
        ).toBe(
          'non_public_ip',
        )

        expect(
          result.candidate,
        ).toMatchObject({
          retrieved: false,
          contentAvailable: false,
        })
      },
    )
  },
)
