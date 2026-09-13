import {
  readFile,
} from 'node:fs/promises'
import {
  resolve,
} from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const scriptPath =
  resolve(
    process.cwd(),
    'scripts/flash-html-article-prepersistence-dedup-preview.ts',
  )

describe(
  'Flash pre-persistence classification preview wiring',
  () => {
    it(
      'keeps provider use explicit, bridges only validated classification, and stays read-only',
      async () => {
        const source =
          await readFile(
            scriptPath,
            'utf8',
          )

        expect(
          source,
        ).toContain(
          "hasFlag(\n      '--allow-provider-requests'",
        )

        expect(
          source,
        ).toContain(
          "readOption(\n      '--model'",
        )

        expect(
          source,
        ).toContain(
          'ANTHROPIC_API_KEY',
        )

        expect(
          source,
        ).toContain(
          "await import(\n        '@anthropic-ai/sdk'",
        )

        expect(
          source,
        ).toContain(
          'createAnthropicFlashPrePersistenceClassificationSemanticProducer',
        )

        expect(
          source,
        ).toContain(
          'runFlashPrePersistenceClassificationSemanticProducer',
        )

        expect(
          source,
        ).toContain(
          'source.pilon ?? []',
        )

        expect(
          source,
        ).toContain(
          "collection:\n                  'categorii'",
        )

        expect(
          source,
        ).toContain(
          'prePersistenceClassification,',
        )

        expect(
          source,
        ).toContain(
          'validatedClassification:\n          classificationResult.classification',
        )

        expect(
          source,
        ).toContain(
          'Provider classification is blocked because source verification did not pass.',
        )

        expect(
          source,
        ).toContain(
          'Provider classification is blocked because strong duplicate evidence exists.',
        )

        expect(
          source,
        ).not.toMatch(
          /payload\.(create|update|delete)\s*\(/,
        )

        expect(
          source,
        ).not.toMatch(
          /payload\.jobs\.(queue|run)\s*\(/,
        )

        expect(
          source,
        ).not.toMatch(
          /client\.messages\.create\s*\(/,
        )
      },
    )
  },
)
