import {
  readFile,
} from 'node:fs/promises'

import {
  describe,
  expect,
  it,
} from 'vitest'

describe(
  'FlashAI staging review transition script',
  () => {
    it(
      'keeps the transition explicitly staging-only, review-only, and draft-only',
      async () => {
        const source =
          await readFile(
            new URL(
              '../../scripts/flash-ai-staging-mark-review.ts',
              import.meta.url,
            ),
            'utf8',
          )

        expect(source).toContain(
          'assertFlashAiStagingWriteAllowed',
        )
        expect(source).toContain(
          '--allow-staging-flash-ai-review-transition',
        )
        expect(source).toContain(
          "editorialStatus: 'review'",
        )
        expect(source).toContain(
          "automationDecision: 'review'",
        )
        expect(source).toContain(
          "_status: 'draft'",
        )
        expect(source).toContain(
          "draft: true",
        )
        expect(source).toContain(
          'current.publishedAt',
        )
        expect(source).not.toContain(
          "_status: 'published'",
        )
      },
    )
  },
)
