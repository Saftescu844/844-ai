import {
  execFile,
} from 'node:child_process'
import {
  readFile,
} from 'node:fs/promises'
import {
  resolve,
} from 'node:path'
import {
  promisify,
} from 'node:util'

import {
  describe,
  expect,
  it,
} from 'vitest'

const execFileAsync =
  promisify(
    execFile,
  )

const scriptPath =
  resolve(
    process.cwd(),
    'scripts/flash-html-article-prepersistence-dedup-preview.ts',
  )

describe(
  'Flash HTML article pre-persistence dedup preview CLI',
  () => {
    it(
      'documents a read-only extraction-to-dedup path with deterministic source fingerprinting and without downstream writes',
      async () => {
        const source =
          await readFile(
            scriptPath,
            'utf8',
          )

        expect(
          source,
        ).toContain(
          'FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_OK',
        )

        expect(
          source,
        ).toContain(
          'retrieveFlashSource',
        )

        expect(
          source,
        ).toContain(
          'extractFlashHtmlArticle',
        )

        expect(
          source,
        ).toContain(
          'normalizeFlashHtmlArticleCandidate',
        )

        expect(
          source,
        ).toContain(
          'buildFlashArticleCandidateFingerprints',
        )

        expect(
          source,
        ).toContain(
          'evaluateFlashArticlePrePersistenceDedupReadOnly',
        )

        expect(
          source,
        ).toContain(
          'sourceFingerprint:\n          fingerprints.sourceFingerprint',
        )

        expect(
          source,
        ).toContain(
          'PAYLOAD_DB_PUSH',
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
          /from\s+['"]@anthropic-ai\/sdk['"]/,
        )

        expect(
          source,
        ).not.toMatch(
          /new\s+Anthropic\s*\(/,
        )

        expect(
          source,
        ).not.toMatch(
          /anthropic\.messages\.create\s*\(/,
        )
      },
    )

    it(
      'prints help before requiring Railway or Payload environment',
      async () => {
        const {
          stdout,
          stderr,
        } =
          await execFileAsync(
            process.execPath,
            [
              '--import',
              'tsx',
              'scripts/flash-html-article-prepersistence-dedup-preview.ts',
              '--help',
            ],
            {
              cwd:
                process.cwd(),
              env: {
                ...process.env,
                RAILWAY_PROJECT_ID:
                  '',
                RAILWAY_ENVIRONMENT_ID:
                  '',
                RAILWAY_SERVICE_ID:
                  '',
                PAYLOAD_DB_PUSH:
                  '',
              },
            },
          )

        expect(
          stderr,
        ).toBe(
          '',
        )

        expect(
          stdout,
        ).toContain(
          'Flash Engine HTML article pre-persistence dedup preview',
        )

        expect(
          stdout,
        ).toContain(
          'computes the deterministic REG-001N sourceFingerprint from the canonical URL',
        )

        expect(
          stdout,
        ).toContain(
          'checks canonical source URL reuse, sourceFingerprint reuse, and same-language normalized title matches',
        )

        expect(
          stdout,
        ).toContain(
          'sourceFingerprint reuse is a review signal, not an obvious-duplicate decision',
        )

        expect(
          stdout,
        ).toContain(
          'keeps eventFingerprint pending and therefore keeps final dedup pending',
        )

        expect(
          stdout,
        ).toContain(
          'does NOT create, update, or delete FlashAI',
        )
      },
    )
  },
)
