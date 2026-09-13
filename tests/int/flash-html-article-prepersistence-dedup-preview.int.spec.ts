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
      'documents a read-only extraction-to-dedup path with source verification and grounded event identity without downstream writes',
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
          'evaluateFlashSourceVerification',
        )

        expect(
          source,
        ).toContain(
          'sourceVerification,',
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
          'evaluateExplicitGroundedEventIdentity',
        )

        expect(
          source,
        ).toContain(
          'buildFlashGroundedEventFingerprint',
        )

        expect(
          source,
        ).toContain(
          'eventIdentity,',
        )

        expect(
          source,
        ).toContain(
          'evaluateFlashArticlePrePersistenceDedupReadOnly',
        )

        expect(
          source,
        ).toContain(
          'eventFingerprint:\n          fingerprints.eventFingerprint',
        )

        expect(
          source,
        ).toContain(
          'sourceFingerprint:\n          fingerprints.sourceFingerprint',
        )

        expect(
          source,
        ).toContain(
          "eventIdentity.status === 'grounded'",
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
          'runs canonical technical source verification on the registered/concrete/final URLs and retrieval result',
        )

        expect(
          stdout,
        ).toContain(
          'source verification confirms source identity/retrieval/content availability; it does NOT verify factual truth',
        )

        expect(
          stdout,
        ).toContain(
          'computes the deterministic REG-001N sourceFingerprint from the canonical URL',
        )

        expect(
          stdout,
        ).toContain(
          'evaluates explicit CVE / DOI: / CELEX: identifiers from title, lead, and body',
        )

        expect(
          stdout,
        ).toContain(
          'only one unique explicit identifier in title/lead can ground event identity',
        )

        expect(
          stdout,
        ).toContain(
          'no title/date/URL/fuzzy/embedding/model-derived event identity is created',
        )

        expect(
          stdout,
        ).toContain(
          'checks canonical source URL reuse, grounded eventFingerprint reuse, sourceFingerprint reuse, and same-language normalized title matches',
        )

        expect(
          stdout,
        ).toContain(
          'a grounded eventFingerprint is fed into pre-persistence dedup only when event identity is grounded',
        )

        expect(
          stdout,
        ).toContain(
          'without a grounded eventFingerprint final pre-persistence dedup remains pending',
        )

        expect(
          stdout,
        ).toContain(
          'sourceFingerprint reuse remains only a review signal',
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
