import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  checkApplicationReadiness,
} from '@/lib/observability/applicationHealth'

describe(
  'application readiness',
  () => {
    it(
      'reports ready when the database probe succeeds',
      async () => {
        const probe =
          vi.fn(
            async () => {},
          )

        const result =
          await checkApplicationReadiness(
            probe,
          )

        expect(
          probe,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          result,
        ).toEqual({
          ok:
            true,

          status:
            'ready',
        })
      },
    )

    it(
      'reports not_ready without exposing the probe error',
      async () => {
        const probe =
          vi.fn(
            async () => {
              throw new Error(
                'postgresql://secret@example.invalid',
              )
            },
          )

        const result =
          await checkApplicationReadiness(
            probe,
          )

        expect(
          result,
        ).toEqual({
          ok:
            false,

          status:
            'not_ready',
        })

        expect(
          JSON.stringify(
            result,
          ),
        ).not.toContain(
          'secret',
        )
      },
    )
  },
)
