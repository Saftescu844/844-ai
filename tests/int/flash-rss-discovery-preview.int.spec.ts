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
  'Flash RSS discovery preview CLI',
  () => {
    it(
      'is staging-only and read-only',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-discovery-preview.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'planFlashRssIngestionSources',
        )
        expect(source).toContain(
          'parseFlashRssCandidates',
        )
        expect(source).toContain(
          'FLASH_RSS_DISCOVERY_PREVIEW_OK',
        )
        expect(source).toContain(
          "PAYLOAD_DB_PUSH !==",
        )
        expect(source).toContain(
          "'false'",
        )
        expect(source).toContain(
          'does NOT create or update FlashAI',
        )
        expect(source).toContain(
          'does NOT queue jobs',
        )
        expect(source).toContain(
          'does NOT publish or unpublish',
        )
        expect(source).not.toContain(
          'payload.create(',
        )
        expect(source).not.toContain(
          'payload.update(',
        )
        expect(source).not.toContain(
          'queueFlashEngineEvaluationJob',
        )
      },
    )
  },
)
