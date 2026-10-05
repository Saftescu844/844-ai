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
  'FLASH-014 staging RSS pair ingest boundary',
  () => {
    it(
      'is restricted to the exact staging one-shot service and PAYLOAD_DB_PUSH=false',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-staging-ingest-pair.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          '44c37d0f-b300-4462-b001-31259ddae5dd',
        )

        expect(source).toContain(
          'a589dc28-1c59-468c-9eb4-351fce8fa17b',
        )

        expect(source).toContain(
          '7be51b73-dc87-4a53-9ad4-879c00aecad6',
        )

        expect(source).toContain(
          "PAYLOAD_DB_PUSH !==",
        )

        expect(source).toContain(
          "'false'",
        )

        expect(source).toContain(
          '--allow-staging-rss-pair-write',
        )

        expect(source).toContain(
          '--allow-provider-requests',
        )
      },
    )
  },
)
