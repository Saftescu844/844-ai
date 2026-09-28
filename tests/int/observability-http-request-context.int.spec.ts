import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createHttpRequestContext,
  finalizeHttpResponse,
  logHttpInternalFailure,
} from '@/lib/observability/httpRequestContext'

describe(
  'HTTP request observability context',
  () => {
    it(
      'creates a server-owned request ID without copying query data into the context',
      () => {
        const context =
          createHttpRequestContext(
            new Request(
              'https://example.test/api-newsletter?email=secret@example.test',
              {
                method:
                  'POST',
              },
            ),
            'api-newsletter',
            {
              nowMs:
                () =>
                  1000,

              requestIdFactory:
                () =>
                  'request-test-1',
            },
          )

        expect(
          context,
        ).toEqual({
          requestId:
            'request-test-1',

          component:
            'api-newsletter',

          method:
            'POST',

          path:
            '/api-newsletter',

          startedAtMs:
            1000,
        })
      },
    )

    it(
      'adds X-Request-ID and emits one sanitized completion event',
      async () => {
        const log =
          vi.spyOn(
            console,
            'log',
          ).mockImplementation(
            () =>
              undefined,
          )

        const context = {
          requestId:
            'request-test-2',

          component:
            'api-newsletter',

          method:
            'POST',

          path:
            '/api-newsletter',

          startedAtMs:
            1000,
        }

        const response =
          finalizeHttpResponse(
            context,
            Response.json(
              {
                ok:
                  true,
              },
              {
                status:
                  200,
              },
            ),
            () =>
              1025,
          )

        expect(
          response.headers.get(
            'X-Request-ID',
          ),
        ).toBe(
          'request-test-2',
        )

        await expect(
          response.json(),
        ).resolves.toEqual({
          ok:
            true,
        })

        expect(
          log,
        ).toHaveBeenCalledTimes(
          1,
        )

        const event =
          JSON.parse(
            String(
              log.mock.calls[0]?.[0],
            ),
          )

        expect(
          event,
        ).toMatchObject({
          event:
            'http.request.completed',

          component:
            'api-newsletter',

          status:
            'success',

          correlationId:
            'request-test-2',

          data: {
            method:
              'POST',

            path:
              '/api-newsletter',

            httpStatus:
              200,

            durationMs:
              25,
          },
        })

        vi.restoreAllMocks()
      },
    )

    it(
      'logs internal failure by stable code without serializing an Error object',
      () => {
        const error =
          vi.spyOn(
            console,
            'error',
          ).mockImplementation(
            () =>
              undefined,
          )

        logHttpInternalFailure(
          {
            requestId:
              'request-test-3',

            component:
              'api-account-register',

            method:
              'POST',

            path:
              '/api-account/register',

            startedAtMs:
              2000,
          },
          'ACCOUNT_REGISTER_PAYLOAD_UNAVAILABLE',
          () =>
            2010,
        )

        const raw =
          String(
            error.mock.calls[0]?.[0],
          )

        expect(
          raw,
        ).toContain(
          '"correlationId":"request-test-3"',
        )

        expect(
          raw,
        ).toContain(
          '"errorCode":"ACCOUNT_REGISTER_PAYLOAD_UNAVAILABLE"',
        )

        expect(
          raw,
        ).not.toContain(
          'stack',
        )

        vi.restoreAllMocks()
      },
    )
  },
)
