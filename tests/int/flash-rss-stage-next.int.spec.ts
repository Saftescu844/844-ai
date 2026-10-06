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
  'Flash RSS stage-next orchestrator',
  () => {
    it(
      'is one-shot staging-only and produces review drafts without publication',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-stage-next.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          '7be51b73-dc87-4a53-9ad4-879c00aecad6',
        )

        expect(source).toContain(
          'd479e8ea-00a4-4b58-87a0-fc3221f4679c',
        )

        expect(source).toContain(
          'ALLOWED_STAGING_SERVICE_IDS',
        )

        expect(source).toContain(
          '--allow-staging-rss-stage-next',
        )

        expect(source).toContain(
          '--allow-provider-requests',
        )

        expect(source).toContain(
          "'ro'",
        )

        expect(source).toContain(
          "'en'",
        )

        expect(source).toContain(
          'createFlashAiAtomicReviewPair',
        )

        expect(source).toContain(
          '--require-grounded-event-identity',
        )

        expect(source).toContain(
          'MAX_ALLOWED_ATTEMPTS',
        )

        expect(source).toContain(
          'FLASH_RSS_STAGE_NEXT_SKIPPED',
        )

        expect(source).toContain(
          'FLASH_RSS_STAGE_NEXT_NO_ELIGIBLE_CANDIDATE',
        )

        expect(source).toContain(
          'FLASH_RSS_STAGE_NEXT_OK',
        )

        expect(source).toContain(
          'does NOT publish or unpublish',
        )

        expect(source).toContain(
          'does NOT enable allowAutoPublish',
        )

        expect(source).not.toContain(
          'flash-ai-staging-publish-pair',
        )
      },
    )
  },
)
