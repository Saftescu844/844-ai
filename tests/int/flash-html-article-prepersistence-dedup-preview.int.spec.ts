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
      'documents a read-only extraction-to-dedup-to-classification-to-editorial-to-QA-to-gate preview path without downstream writes',
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
          'FLASH_PREPERSISTENCE_EDITORIAL_GENERATION_${targetLanguage.toUpperCase()}',
        )
        expect(source).toContain(
          'FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_${targetLanguage.toUpperCase()}',
        )
        expect(source).toContain(
          'FLASH_PREPERSISTENCE_EDITORIAL_LEXICAL_${targetLanguage.toUpperCase()}',
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
          'createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer',
        )
        expect(source).toContain(
          'runFlashPrePersistenceEditorialGenerationSemanticProducer',
        )
        expect(source).toContain(
          'createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer',
        )
        expect(source).toContain(
          'runFlashPrePersistenceEditorialQualityReviewSemanticProducer',
        )
        expect(source).toContain(
          'evaluateFlashPrePersistenceEditorialQualityGate',
        )
        expect(source).toContain(
          'buildVerifiedFlashEditorialLexicalContent',
        )
        expect(source).toContain(
          'countFlashEditorialWords',
        )
        expect(source).toContain(
          'readOptions',
        )
        expect(source).toContain(
          '--supporting-url',
        )
        expect(source).toContain(
          '--confirmed-event-id',
        )
        expect(source).toContain(
          '--target-language',
        )
        expect(source).toContain(
          '--read-only-pilot',
        )
        expect(source).toContain(
          'FLASH_READ_ONLY_PILOT_SOURCE_OVERRIDE',
        )
        expect(source).toContain(
          'sourceConfigurationChanged:',
        )
        expect(source).toContain(
          'confirmedBodyIdentity',
        )
        expect(source).toContain(
          'editorial_quality_review_retention_floor_breach',
        )
        expect(source).toContain(
          'FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_DIAGNOSTIC',
        )
        expect(source).toContain(
          'FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_DIAGNOSTIC_WRITTEN',
        )
        expect(source).toContain(
          '--qa-retention-diagnostic-output',
        )
        expect(source).toContain(
          'writeFlashPrePersistenceEditorialQualityReviewRetentionDiagnosticOnce',
        )
        expect(source).toContain(
          'sourceMaterialSufficiency',
        )
        expect(source).toContain(
          "'undetermined'",
        )
        expect(source).toContain(
          'evaluateFlashVerifiedSupportingSourcePack',
        )
        expect(source).toContain(
          'extractFlashSupportingPolicySemanticMaterial',
        )
        expect(source).toContain(
          'supportingPolicySemanticMaterials',
        )
        expect(source).toContain(
          'supportingSourcePack,',
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
          'prePersistenceEditorialGeneration:',
        )
        expect(source).toContain(
          'prePersistenceEditorialQualityReview:',
        )
        expect(source).toContain(
          'prePersistenceEditorialQualityGate,',
        )
        expect(source).toContain(
          'verifiedEditorial: {',
        )

        const supportingSemanticInputMatches =
          source.match(
            /supportingSources:\s*supportingPolicySemanticMaterials,\s*/g,
          ) ?? []

        expect(
          supportingSemanticInputMatches,
        ).toHaveLength(
          2,
        )
        expect(source).toContain(
          'PAYLOAD_DB_PUSH',
        )

        const supportingPackIndex =
          source.indexOf(
            'evaluateFlashVerifiedSupportingSourcePack({',
          )
        const generationRunIndex =
          source.indexOf(
            'const editorialResult =',
          )
        const qualityReviewRunIndex =
          source.indexOf(
            'const editorialQualityReviewResult =',
          )
        const qualityGateIndex =
          source.indexOf(
            'prePersistenceEditorialQualityGate =',
          )
        const lexicalBuildIndex =
          source.indexOf(
            'prePersistenceEditorialLexicalContent =',
          )
        const readinessBridgeIndex =
          source.indexOf(
            'verifiedEditorial: {',
          )

        expect(
          supportingPackIndex,
        ).toBeGreaterThanOrEqual(
          0,
        )
        expect(
          generationRunIndex,
        ).toBeGreaterThan(
          supportingPackIndex,
        )
        expect(
          qualityReviewRunIndex,
        ).toBeGreaterThan(
          generationRunIndex,
        )
        expect(
          qualityGateIndex,
        ).toBeGreaterThan(
          qualityReviewRunIndex,
        )
        expect(
          lexicalBuildIndex,
        ).toBeGreaterThan(
          qualityGateIndex,
        )
        expect(
          readinessBridgeIndex,
        ).toBeGreaterThan(
          lexicalBuildIndex,
        )
        expect(source).toContain(
          '.acceptableForPersistenceBridge',
        )

        expect(source).not.toMatch(
          /payload\.(create|update|delete)\s*\(/,
        )
        expect(source).not.toMatch(
          /payload\.jobs\.(queue|run)\s*\(/,
        )
        expect(source).toContain(
          'createOpenAiFlashPrePersistenceClassificationSemanticProducer',
        )
        expect(source).toContain(
          'createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer',
        )
        expect(source).toContain(
          'createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer',
        )
        expect(source).toContain(
          'OPENAI_API_KEY',
        )
        expect(source).not.toContain(
          'ANTHROPIC_API_KEY',
        )
        expect(source).not.toContain(
          'createAnthropicFlashPrePersistence',
        )
        expect(source).toMatch(
          /await import\(\s*['"]openai['"]\s*\)/,
        )
        expect(source).not.toMatch(
          /client\.responses\.create\s*\(/,
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
          '--confirmed-event-id',
        )
        expect(stdout).toContain(
          '--read-only-pilot',
        )
        expect(stdout).toContain(
          'allowIngestion=false',
        )
        expect(stdout).toContain(
          'changes no source flags',
        )
        expect(stdout).toContain(
          'exactly one body-only identifier',
        )
        expect(stdout).toContain(
          'sourceFingerprint reuse remains only a review signal',
        )
        expect(stdout).toContain(
          'successful strict REG-001S classification removes classification_required from persistence readiness',
        )
        expect(stdout).toContain(
          'accepts zero, one, or two explicit --supporting-url values',
        )
        expect(stdout).toContain(
          'zero preserves the original REG-001T primary-only path',
        )
        expect(stdout).toContain(
          'requires the REG-001U verified supporting-source pack contract to pass',
        )
        expect(stdout).toContain(
          '--target-language ro|en',
        )
        expect(stdout).toContain(
          'after successful classification, requests one original REG-001T editorial draft in --target-language (default ro)',
        )
        expect(stdout).toContain(
          'strict 500–1000-word contract',
        )
        expect(stdout).toContain(
          'after successful generation, runs one bounded source-fidelity QA pass in the same target language',
        )
        expect(stdout).toContain(
          'QA may return a shorter source-faithful diagnostic editorial',
        )
        expect(stdout).toContain(
          'source-material sufficiency remains undetermined',
        )
        expect(stdout).toContain(
          '--qa-retention-diagnostic-output',
        )
        expect(stdout).toContain(
          'contains no raw provider output',
        )
        expect(stdout).toContain(
          'a deterministic post-QA gate reports whether the reviewed editorial satisfies the canonical 500–1000-word',
        )
        expect(stdout).toContain(
          'only when that gate passes, deterministically builds a verified Lexical preview',
        )
        expect(stdout).toContain(
          'after quality gate PASS and verified Lexical round-trip, the final QA editorial is fed into persistenceReadiness',
        )
        expect(stdout).toContain(
          'generated_flash_content_required is removed only when verified final editorial content is supplied',
        )
        expect(stdout).toContain(
          'does NOT create, update, or delete FlashAI',
        )
      },
    )
  },
)

// Exercise the actual child CLI used by flash-rss-stage-next. Omitting --model
// deliberately stops execution after the target guard and before DB/provider I/O.
describe('Flash preview staging worker target guard', () => {
  const stagingEnvironment = {
    ...process.env,
    RAILWAY_PROJECT_ID: '44c37d0f-b300-4462-b001-31259ddae5dd',
    RAILWAY_ENVIRONMENT_ID: 'a589dc28-1c59-468c-9eb4-351fce8fa17b',
    RAILWAY_SERVICE_ID: 'd479e8ea-00a4-4b58-87a0-fc3221f4679c',
    PAYLOAD_DB_PUSH: 'false',
  }

  function runUntilArgumentValidation(
    environment: NodeJS.ProcessEnv,
    language = 'ro',
  ) {
    return execFileAsync(process.execPath, [
      '--import', 'tsx', scriptPath,
      '--source-id', '6',
      '--article-url', 'https://example.com/article',
      '--target-language', language,
      '--require-grounded-event-identity',
      '--allow-provider-requests',
    ], { env: environment, timeout: 10_000 })
  }

  it.each(['ro', 'en'])('accepts the staging worker for %s', async (language) => {
    await expect(runUntilArgumentValidation(stagingEnvironment, language))
      .rejects.toMatchObject({
        stderr: expect.stringContaining(
          '--model is required when --allow-provider-requests is set.',
        ),
      })
  })

  it.each([
    ['RAILWAY_PROJECT_ID', '54c46ab1-ebab-491c-bdbe-571a3fce9ceb'],
    ['RAILWAY_ENVIRONMENT_ID', '12b22bbd-469f-4cb8-b418-cc2c8e40af6d'],
    ['RAILWAY_SERVICE_ID', 'unapproved-service'],
    ['PAYLOAD_DB_PUSH', 'true'],
  ])('rejects an unauthorized %s', async (key, value) => {
    await expect(runUntilArgumentValidation({
      ...stagingEnvironment,
      [key]: value,
    })).rejects.toMatchObject({
      stderr: expect.stringContaining(`Environment mismatch: ${key}.`),
    })
  })
})
