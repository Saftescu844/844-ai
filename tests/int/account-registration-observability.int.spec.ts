import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks =
  vi.hoisted(
    () => ({
      payloadClient:
        vi.fn(),

      trimiteConfirmareCont:
        vi.fn(),

      claimPublicRegistrationAttempt:
        vi.fn(),
    }),
  )

vi.mock(
  '@/lib/payload',
  () => ({
    payloadClient:
      mocks.payloadClient,
  }),
)

vi.mock(
  '@/lib/account-email',
  () => ({
    trimiteConfirmareCont:
      mocks.trimiteConfirmareCont,
  }),
)

vi.mock(
  '@/lib/public-registration-rate-limit',
  () => ({
    claimPublicRegistrationAttempt:
      mocks.claimPublicRegistrationAttempt,
  }),
)

import {
  POST,
} from '@/app/api-account/register/route'

function request(
  body:
    unknown,
): Request {
  return new Request(
    'http://localhost/api-account/register',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify(
          body,
        ),
    },
  )
}

describe(
  'account registration request correlation',
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        vi.spyOn(
          console,
          'error',
        ).mockImplementation(
          () =>
            undefined,
        )

        vi.spyOn(
          console,
          'log',
        ).mockImplementation(
          () =>
            undefined,
        )
      },
    )

    afterEach(
      () => {
        vi.restoreAllMocks()
      },
    )

    it(
      'returns a request ID on validation errors',
      async () => {
        const response =
          await POST(
            request({
              email:
                'invalid',
              parola:
                '1234567890',
              nume:
                'Alice',
            }),
          )

        expect(
          response.status,
        ).toBe(
          400,
        )

        expect(
          response.headers.get(
            'X-Request-ID',
          ),
        ).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )

        await expect(
          response.json(),
        ).resolves.toEqual({
          ok:
            false,

          eroare:
            'date_invalide',

          camp:
            'email',
        })
      },
    )

    it(
      'keeps the public anti-enumeration response while logging a correlated internal failure',
      async () => {
        mocks.payloadClient
          .mockRejectedValue(
            new Error(
              'database unavailable',
            ),
          )

        const response =
          await POST(
            request({
              email:
                'alice@example.com',

              parola:
                'long-password',

              nume:
                'Alice',

              limba:
                'ro',
            }),
          )

        expect(
          response.status,
        ).toBe(
          200,
        )

        const requestId =
          response.headers.get(
            'X-Request-ID',
          )

        expect(
          requestId,
        ).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )

        await expect(
          response.json(),
        ).resolves.toEqual({
          ok:
            true,

          rezultat:
            'verifica_emailul',
        })

        const errorLines =
          vi.mocked(
            console.error,
          ).mock.calls
            .map(
              call =>
                String(
                  call[0],
                ),
            )
            .join(
              '\n',
            )

        expect(
          errorLines,
        ).toContain(
          'ACCOUNT_REGISTER_PAYLOAD_UNAVAILABLE',
        )

        expect(
          errorLines,
        ).toContain(
          String(
            requestId,
          ),
        )

        expect(
          errorLines,
        ).not.toContain(
          'database unavailable',
        )
      },
    )
  },
)
