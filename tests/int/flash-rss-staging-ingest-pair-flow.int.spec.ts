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
  'FLASH-014 RSS pair ingest flow',
  () => {
    it(
      'generates both languages, writes drafts, links them, and never publishes',
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
          "'--target-language',\n        'ro'",
        )

        expect(source).toContain(
          "'--target-language',\n        'en'",
        )

        expect(source).toContain(
          'scripts/flash-ai-staging-write-once.ts',
        )

        expect(source).toContain(
          'linkFlashAiReciprocalAlternatives',
        )

        expect(source).toContain(
          "editorialStatus:\n          'review'",
        )

        expect(source).toContain(
          "automationDecision:\n          'review'",
        )

        expect(source).toContain(
          'FLASH_RSS_PAIR_INGEST_OK',
        )

        expect(source).not.toContain(
          'flash-ai-staging-publish-pair.ts',
        )

        expect(source).not.toContain(
          'allow-staging-flash-ai-publish-pair',
        )

        expect(source).not.toContain(
          "_status:\n          'published'",
        )
      },
    )
  },
)
