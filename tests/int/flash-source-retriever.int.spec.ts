import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  retrieveFlashSource as retrieveFlashSourceRuntime,
  type FlashSourceRetrievalInput,
  type FlashSourceRetrieverOptions,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'

const publicResolver =
  async () => [
    {
      address:
        '93.184.216.34',
      family: 4 as const,
    },
  ]

async function retrieveFlashSource(
  input:
    FlashSourceRetrievalInput,
  options:
    FlashSourceRetrieverOptions = {},
) {
  return retrieveFlashSourceRuntime(
    input,
    {
      networkPolicyOptions: {
        resolveHostname:
          publicResolver,
      },

      ...options,
    },
  )
}

import {
  evaluateFlashSourceVerification,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'

type FetchInput =
  Parameters<typeof fetch>[0]

type FetchStep = (
  input: FetchInput,
  init?: RequestInit,
) => Response | Promise<Response>

interface RecordedFetchCall {
  url: string
  init?: RequestInit
}

function createSequentialFetch(
  steps: FetchStep[],
): {
  fetchImpl: typeof fetch
  calls: RecordedFetchCall[]
} {
  const calls:
    RecordedFetchCall[] = []

  let index = 0

  const fetchImpl =
    (async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      calls.push({
        url: String(input),
        init,
      })

      const step =
        steps[index]

      index += 1

      if (!step) {
        throw new Error(
          'Unexpected fetch call',
        )
      }

      return await step(
        input,
        init,
      )
    }) as typeof fetch

  return {
    fetchImpl,
    calls,
  }
}

function textResponse(
  text: string,
  status = 200,
): Response {
  return new Response(
    text,
    {
      status,
      headers: {
        'content-type':
          'text/html; charset=utf-8',
      },
    },
  )
}

function redirectResponse(
  location?: string,
): Response {
  const headers =
    new Headers()

  if (location !== undefined) {
    headers.set(
      'location',
      location,
    )
  }

  return new Response(
    null,
    {
      status: 302,
      headers,
    },
  )
}

function baseInput(
  overrides: Partial<{
    id: string
    registeredSourceUrl: string
    concreteUrl: string
  }> = {},
) {
  return {
    id: 'source-1',

    registeredSourceUrl:
      'https://example.com',

    concreteUrl:
      'https://example.com/article',

    ...overrides,
  }
}

describe(
  'Flash source retriever',
  () => {
    it(
      'respinge URL-ul de registru invalid înainte de fetch',
      async () => {
        let calls = 0

        const fetchImpl =
          (async () => {
            calls += 1

            return textResponse(
              'should not run',
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            baseInput({
              registeredSourceUrl:
                'not-a-url',
            }),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'invalid_registered_url',
        )

        expect(
          result.candidate.retrieved,
        ).toBe(false)

        expect(calls).toBe(0)
      },
    )

    it(
      'respinge URL-ul concret invalid înainte de fetch',
      async () => {
        let calls = 0

        const fetchImpl =
          (async () => {
            calls += 1

            return textResponse(
              'should not run',
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            baseInput({
              concreteUrl:
                'not-a-url',
            }),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'invalid_concrete_url',
        )

        expect(calls).toBe(0)
      },
    )

    it(
      'retrage cu succes conținut text',
      async () => {
        const {
          fetchImpl,
          calls,
        } =
          createSequentialFetch([
            () =>
              textResponse(
                '<html>Flash source</html>',
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBeNull()

        expect(
          result.statusCode,
        ).toBe(200)

        expect(
          result.candidate,
        ).toMatchObject({
          retrieved: true,
          contentAvailable: true,

          finalUrl:
            'https://example.com/article',
        })

        expect(
          result.textContent,
        ).toBe(
          '<html>Flash source</html>',
        )

        expect(
          result.bytesRead,
        ).toBeGreaterThan(0)

        expect(calls).toHaveLength(1)
      },
    )

    it(
      'normalizează www și acceptă subdomeniul sursei',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              textResponse(
                'subdomain content',
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput({
              registeredSourceUrl:
                'https://www.example.com',

              concreteUrl:
                'https://news.example.com/article',
            }),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBeNull()

        expect(
          result.candidate.retrieved,
        ).toBe(true)
      },
    )

    it(
      'respinge domeniul nepotrivit înainte de request',
      async () => {
        let calls = 0

        const fetchImpl =
          (async () => {
            calls += 1

            return textResponse(
              'should not run',
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            baseInput({
              concreteUrl:
                'https://other.test/article',
            }),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'source_identity_mismatch',
        )

        expect(calls).toBe(0)
      },
    )

    it(
      'urmează redirect relativ în interiorul aceleiași surse',
      async () => {
        const {
          fetchImpl,
          calls,
        } =
          createSequentialFetch([
            () =>
              redirectResponse(
                '/final',
              ),

            () =>
              textResponse(
                'final content',
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput({
              concreteUrl:
                'https://example.com/start',
            }),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBeNull()

        expect(
          result.candidate.finalUrl,
        ).toBe(
          'https://example.com/final',
        )

        expect(
          calls.map(
            call => call.url,
          ),
        ).toEqual([
          'https://example.com/start',
          'https://example.com/final',
        ])
      },
    )

    it(
      'respinge redirectul către alt domeniu',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              redirectResponse(
                'https://other.test/article',
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'redirect_identity_mismatch',
        )

        expect(
          result.candidate.retrieved,
        ).toBe(false)
      },
    )

    it(
      'gestionează redirect fără Location',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              redirectResponse(),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'redirect_without_location',
        )

        expect(
          result.statusCode,
        ).toBe(302)
      },
    )

    it(
      'gestionează Location invalid fără excepție necontrolată',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              redirectResponse(
                'http://[',
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'redirect_identity_mismatch',
        )
      },
    )

    it(
      'oprește lanțul când este depășită limita de redirecturi',
      async () => {
        const {
          fetchImpl,
          calls,
        } =
          createSequentialFetch([
            () =>
              redirectResponse(
                '/second',
              ),

            () =>
              redirectResponse(
                '/third',
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput({
              concreteUrl:
                'https://example.com/first',
            }),
            {
              fetchImpl,
              maxRedirects: 1,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'redirect_limit_exceeded',
        )

        expect(calls).toHaveLength(2)
      },
    )

    it.each([
      404,
      500,
    ])(
      'tratează HTTP %i drept retrieval nereușit',
      async status => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              textResponse(
                'error',
                status,
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'http_error',
        )

        expect(
          result.statusCode,
        ).toBe(status)

        expect(
          result.candidate.retrieved,
        ).toBe(false)
      },
    )

    it(
      'transformă eroarea de rețea într-un rezultat controlat',
      async () => {
        const fetchImpl =
          (async () => {
            throw new Error(
              'offline',
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'network_error',
        )

        expect(
          result.candidate.retrieved,
        ).toBe(false)
      },
    )

    it(
      'transformă timeout-ul din fetch într-un rezultat controlat',
      async () => {
        const fetchImpl =
          (async (
            _input: FetchInput,
            init?: RequestInit,
          ): Promise<Response> => {
            const signal =
              init?.signal

            if (!signal) {
              throw new Error(
                'Missing abort signal',
              )
            }

            return await new Promise<Response>(
              (
                _resolve,
                reject,
              ) => {
                const abort =
                  () => {
                    reject(
                      new DOMException(
                        'Aborted',
                        'AbortError',
                      ),
                    )
                  }

                if (signal.aborted) {
                  abort()
                  return
                }

                signal.addEventListener(
                  'abort',
                  abort,
                  {
                    once: true,
                  },
                )
              },
            )
          }) as typeof fetch

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
              timeoutMs: 10,
            },
          )

        expect(
          result.failureReason,
        ).toBe('timeout')

        expect(
          result.candidate.retrieved,
        ).toBe(false)
      },
    )

    it(
      'transformă timeout-ul din citirea body-ului într-un rezultat controlat',
      async () => {
        const fetchImpl =
          (async (
            _input: FetchInput,
            init?: RequestInit,
          ): Promise<Response> => {
            const signal =
              init?.signal

            if (!signal) {
              throw new Error(
                'Missing abort signal',
              )
            }

            const stream =
              new ReadableStream<Uint8Array>({
                start(
                  controller,
                ) {
                  const abort =
                    () => {
                      controller.error(
                        new DOMException(
                          'Aborted',
                          'AbortError',
                        ),
                      )
                    }

                  if (
                    signal.aborted
                  ) {
                    abort()
                    return
                  }

                  signal.addEventListener(
                    'abort',
                    abort,
                    {
                      once: true,
                    },
                  )
                },
              })

            return new Response(
              stream,
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
            baseInput(),
            {
              fetchImpl,
              timeoutMs: 10,
            },
          )

        expect(
          result.failureReason,
        ).toBe('timeout')

        expect(
          result.statusCode,
        ).toBe(200)

        expect(
          result.candidate.retrieved,
        ).toBe(false)
      },
    )

    it(
      'marchează body-ul text gol drept content unavailable',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              new Response(
                '   ',
                {
                  status: 200,
                  headers: {
                    'content-type':
                      'text/plain',
                  },
                },
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBe(
          'empty_content',
        )

        expect(
          result.candidate,
        ).toMatchObject({
          retrieved: true,
          contentAvailable: false,
        })
      },
    )

    it(
      'acceptă un PDF binar ne-gol ca material disponibil',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              new Response(
                new Uint8Array([
                  0x25,
                  0x50,
                  0x44,
                  0x46,
                ]),
                {
                  status: 200,
                  headers: {
                    'content-type':
                      'application/pdf',
                  },
                },
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        expect(
          result.failureReason,
        ).toBeNull()

        expect(
          result.candidate
            .contentAvailable,
        ).toBe(true)

        expect(
          result.bytesRead,
        ).toBe(4)

        expect(
          result.textContent,
        ).toBeNull()
      },
    )

    it(
      'respectă limita maximă de bytes citită',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              new Response(
                'abcdefghij',
                {
                  status: 200,
                  headers: {
                    'content-type':
                      'text/plain',
                  },
                },
              ),
          ])

        const result =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
              maxBytes: 4,
            },
          )

        expect(
          result.failureReason,
        ).toBeNull()

        expect(
          result.bytesRead,
        ).toBe(4)

        expect(
          result.textContent,
        ).toBe('abcd')
      },
    )

    it(
      'folosește GET, redirect manual și headerele de retrieval',
      async () => {
        const {
          fetchImpl,
          calls,
        } =
          createSequentialFetch([
            () =>
              textResponse(
                'content',
              ),
          ])

        await retrieveFlashSource(
          baseInput(),
          {
            fetchImpl,
          },
        )

        const request =
          calls[0]

        expect(
          request.init?.method,
        ).toBe('GET')

        expect(
          request.init?.redirect,
        ).toBe('manual')

        const headers =
          new Headers(
            request.init?.headers,
          )

        expect(
          headers.get(
            'user-agent',
          ),
        ).toBe(
          '844-ai-source-retriever/1.0',
        )

        expect(
          headers.get('accept'),
        ).toContain(
          'text/html',
        )

        expect(
          request.init?.signal,
        ).toBeInstanceOf(
          AbortSignal,
        )
      },
    )

    it(
      'produce candidate compatibil cu source verification evidence',
      async () => {
        const {
          fetchImpl,
        } =
          createSequentialFetch([
            () =>
              textResponse(
                'verified source',
              ),
          ])

        const retrieval =
          await retrieveFlashSource(
            baseInput(),
            {
              fetchImpl,
            },
          )

        const verification =
          evaluateFlashSourceVerification([
            retrieval.candidate,
          ])

        expect(
          retrieval.failureReason,
        ).toBeNull()

        expect(
          verification
            .sourceVerificationPassed,
        ).toBe(true)
      },
    )
  },
)
