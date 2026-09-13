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
      'documents a read-only extraction-to-dedup-to-classification-readiness path without downstream writes',
      async () => {
        const source =
          await readFile(
            scriptPath,
            'utf8',
          )

        expect(source).toContain(
          'FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_OK',
        )
        expect(source).toContain(
          'retrieveFlashSource',
        )
        expect(source).toContain(
          'evaluateFlashSourceVerification',
        )
        expect(source).toContain(
          'extractFlashHtmlArticle',
        )
        expect(source).toContain(
          'normalizeFlashHtmlArticleCandidate',
        )
        expect(source).toContain(
          'buildFlashArticleCandidateFingerprints',
        )
        expect(source).toContain(
          'evaluateExplicitGroundedEventIdentity',
        )
        expect(source).toContain(
          'buildFlashGroundedEventFingerprint',
        )
        expect(source).toContain(
          'evaluateFlashArticlePrePersistenceDedupReadOnly',
        )
        expect(source).toContain(
          'evaluateFlashArticlePersistenceReadiness',
        )
        expect(source).toContain(
          'validatedClassification:',
        )
        expect(source).toContain(
          'classificationResult.classification',
        )
        expect(source).toContain(
          'persistenceReadiness,',
        )
        expect(source).toContain(
          'prePersistenceClassification,',
        )
        expect(source).toContain(
          'PAYLOAD_DB_PUSH',
        )

        expect(source).not.toMatch(
          /payload\.(create|update|delete)\s*\(/,
        )
        expect(source).not.toMatch(
          /payload\.jobs\.(queue|run)\s*\(/,
        )
        expect(source).not.toMatch(
          /from\s+['"]@anthropic-ai\/sdk['"]/,
        )
        expect(source).not.toMatch(
          /client\.messages\.create\s*\(/,
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
                RAILWAY_PROJECT_ID: '',
                RAILWAY_ENVIRONMENT_ID: '',
                RAILWAY_SERVICE_ID: '',
                PAYLOAD_DB_PUSH: '',
              },
            },
          )

        expect(stderr).toBe('')
        expect(stdout).toContain(
          'Flash Engine HTML article pre-persistence dedup preview',
        )
        expect(stdout).toContain(
          'source verification confirms source identity/retrieval/content availability; it does NOT verify factual truth',
        )
        expect(stdout).toContain(
          'no title/date/URL/fuzzy/embedding/model-derived event identity is created',
        )
        expect(stdout).toContain(
          'sourceFingerprint reuse remains only a review signal',
        )
        expect(stdout).toContain(
          'successful strict REG-001S classification removes classification_required from persistence readiness',
        )
        expect(stdout).toContain(
          'generated_flash_content_required still blocks FlashAI draft creation in this increment',
        )
        expect(stdout).toContain(
          'does NOT create, update, or delete FlashAI',
        )
      },
    )
  },
)
