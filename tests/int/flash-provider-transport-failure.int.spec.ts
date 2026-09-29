import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  classifyFlashProviderTransportFailure,
} from '@/lib/flash/resilience/providerTransportFailure'

describe(
  'provider transport failure classification',
  () => {
    it.each([
      [
        {
          status:
            408,
        },
        'timeout',
      ],
      [
        {
          status:
            429,
        },
        'rateLimited',
      ],
      [
        {
          status:
            503,
        },
        'serverError',
      ],
      [
        {
          status:
            401,
        },
        'clientError',
      ],
      [
        {
          name:
            'APIConnectionTimeoutError',
        },
        'timeout',
      ],
      [
        {
          name:
            'APIConnectionError',
        },
        'networkError',
      ],
      [
        {
          code:
            'ECONNRESET',
        },
        'networkError',
      ],
      [
        {
          code:
            'ETIMEDOUT',
        },
        'timeout',
      ],
      [
        new Error(
          'redacted raw provider error',
        ),
        'unknown',
      ],
    ] as const)(
      'maps bounded provider transport evidence to %s',
      (
        error,
        expected,
      ) => {
        expect(
          classifyFlashProviderTransportFailure(
            error,
          ),
        ).toBe(
          expected,
        )
      },
    )
  },
)
