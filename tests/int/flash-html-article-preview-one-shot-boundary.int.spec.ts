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
  'Flash HTML article pre-persistence preview Railway boundary',
  () => {
    it(
      'allows only the staging main service and dedicated one-shot service',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-html-article-prepersistence-dedup-preview.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'FLASH_ENGINE_STAGING_RAILWAY_TARGET',
        )

        expect(source).toContain(
          '7be51b73-dc87-4a53-9ad4-879c00aecad6',
        )

        expect(source).toContain(
          'RAILWAY_PROJECT_ID',
        )

        expect(source).toContain(
          'RAILWAY_ENVIRONMENT_ID',
        )

        expect(source).toContain(
          'RAILWAY_SERVICE_ID',
        )

        expect(source).toContain(
          "PAYLOAD_DB_PUSH !==",
        )

        expect(source).toContain(
          "'false'",
        )
      },
    )
  },
)
