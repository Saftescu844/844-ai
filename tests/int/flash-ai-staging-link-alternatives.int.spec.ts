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
  'FlashAI staging reciprocal alternative linking script',
  () => {
    it(
      'uses the staging guard and the transactional reciprocal linker without publication',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-ai-staging-link-alternatives.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'assertFlashAiStagingWriteAllowed',
        )
        expect(source).toContain(
          'linkFlashAiReciprocalAlternatives',
        )
        expect(source).toContain(
          '--allow-staging-flash-ai-link-alternatives',
        )
        expect(source).toContain(
          '--pairs',
        )
        expect(source).not.toContain(
          "_status: 'published'",
        )
        expect(source).not.toContain(
          'publishedAt:',
        )
      },
    )
  },
)
