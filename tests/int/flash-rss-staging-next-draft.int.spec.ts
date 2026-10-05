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
  'FLASH-014 RSS next-draft orchestrator',
  () => {
    it(
      'is restricted to the dedicated staging one-shot and requires explicit write/provider flags',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-staging-next-draft.ts',
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
          '--allow-staging-rss-next-draft',
        )
        expect(source).toContain(
          '--allow-provider-requests',
        )
        expect(source).toContain(
          "PAYLOAD_DB_PUSH !==",
        )
      },
    )

    it(
      'requires auto-publish off and prepares RO plus EN before writing',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-staging-next-draft.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'plan.allowAutoPublish ===',
        )
        expect(source).toContain(
          'false',
        )

        const roPreview =
          source.indexOf(
            "'--target-language',\n          'ro'",
          )

        const enPreview =
          source.indexOf(
            "'--target-language',\n          'en'",
          )

        const firstWrite =
          source.indexOf(
            "'scripts/flash-ai-staging-write-once.ts'",
          )

        expect(roPreview).toBeGreaterThan(-1)
        expect(enPreview).toBeGreaterThan(roPreview)
        expect(firstWrite).toBeGreaterThan(enPreview)
      },
    )

    it(
      'links the bilingual pair, moves it to review, and never publishes',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-staging-next-draft.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'flash-ai-staging-link-alternatives.ts',
        )
        expect(source).toContain(
          'flash-ai-staging-mark-review.ts',
        )
        expect(source).toContain(
          "status:\n            'review'",
        )
        expect(source).toContain(
          'published:\n            false',
        )
        expect(source).not.toContain(
          'flash-ai-staging-publish-pair.ts',
        )
        expect(source).not.toContain(
          '--allow-staging-flash-ai-publish-pair',
        )
      },
    )
  },
)
