import {
  readFile,
} from 'node:fs/promises'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

describe(
  'Flash pre-persistence grounded-event guard',
  () => {
    it(
      'runs the grounded-event requirement before provider execution',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-html-article-prepersistence-dedup-preview.ts',
            ),
            'utf8',
          )

        const guardIndex =
          source.indexOf(
            'FLASH_PREPERSISTENCE_GROUNDED_EVENT_REQUIRED_SKIP',
          )

        const providerIndex =
          source.indexOf(
            'if (allowProviderRequests)',
          )

        expect(
          guardIndex,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          providerIndex,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          guardIndex,
        ).toBeLessThan(
          providerIndex,
        )

        expect(source).toContain(
          'providerCalled:\n        false',
        )

        expect(source).toContain(
          '--require-grounded-event-identity',
        )
      },
    )
  },
)
