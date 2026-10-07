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
  'Flash atomic RO EN review pair writer',
  () => {
    it(
      'requires grounded identity, final dedup, one transaction and review-only state',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'src/lib/flash/ingestion/payloadFlashAiAtomicReviewPairWriter.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'same grounded event fingerprint',
        )

        expect(source).toContain(
          'allowPendingEventIdentityReviewPair',
        )

        expect(source).toContain(
          'primary high-trust source with allowAutoPublish=false',
        )

        expect(source).toContain(
          'sourceFingerprintReviewSignal',
        )

        expect(source).toContain(
          'titleReviewSignal',
        )

        expect(source).toContain(
          'evaluateFlashArticlePrePersistenceDedupReadOnly',
        )

        expect(source).toContain(
          'beginTransaction',
        )

        expect(source).toContain(
          'commitTransaction',
        )

        expect(source).toContain(
          'rollbackTransaction',
        )

        expect(source).toContain(
          'versiuneAlternativa',
        )

        expect(source).toContain(
          "editorialStatus:\n              'review'",
        )

        expect(source).toContain(
          "automationDecision:\n              'review'",
        )

        expect(source).toContain(
          "_status:\n              'draft'",
        )

        expect(source).not.toContain(
          "_status:\n              'published'",
        )
      },
    )
  },
)
