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
  'FlashAI staging pair publish CLI',
  () => {
    it(
      'requires the staging guard and an explicit publish flag',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-ai-staging-publish-pair.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'assertFlashAiStagingWriteAllowed',
        )
        expect(source).toContain(
          '--allow-staging-flash-ai-publish-pair',
        )
        expect(source).toContain(
          '--ro-id',
        )
        expect(source).toContain(
          '--en-id',
        )
        expect(source).toContain(
          'publishFlashAiStagingPair',
        )
      },
    )
  },
)
