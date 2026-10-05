import {
  readFile,
} from 'node:fs/promises'
import path from 'node:path'
import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const productionEnv = {
  ...process.env,
  RAILWAY_PROJECT_ID:
    '54c46ab1-ebab-491c-bdbe-571a3fce9ceb',
  RAILWAY_ENVIRONMENT_ID:
    '12b22bbd-469f-4cb8-b418-cc2c8e40af6d',
  RAILWAY_SERVICE_ID:
    '11111111-1111-4111-8111-111111111111',
  RAILWAY_SERVICE_NAME:
    'flash-rss-production-once',
  PAYLOAD_DB_PUSH:
    'false',
  DATABASE_URL:
    'postgresql://postgres.hyapqvnubhwkwmwudeit:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  OPENAI_API_KEY:
    'test-only-key',
}

function runProductionOneShot(
  args: string[],
  env:
    NodeJS.ProcessEnv,
) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/flash-rss-production-one-shot.ts',
      ...args,
    ],
    {
      cwd:
        process.cwd(),
      env,
      encoding:
        'utf8',
    },
  )
}

describe(
  'FLASH-017B production one-shot boundary',
  () => {
    it(
      'keeps production persistence draft/review-only and explicitly bounded',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-rss-production-one-shot.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          '54c46ab1-ebab-491c-bdbe-571a3fce9ceb',
        )

        expect(source).toContain(
          '12b22bbd-469f-4cb8-b418-cc2c8e40af6d',
        )

        expect(source).toContain(
          'flash-rss-production-once',
        )

        expect(source).toContain(
          '--allow-production-rss-one-shot',
        )

        expect(source).toContain(
          '--expected-production-service-id',
        )

        expect(source).toContain(
          'requires --source-id',
        )

        expect(source).toContain(
          'requires --candidate-url',
        )

        expect(source).toContain(
          'MAX_ALLOWED_ATTEMPTS =\n  1',
        )

        expect(source).toContain(
          'assertFlashAiProductionWriteAllowed',
        )

        expect(source).toContain(
          'allowAutoPublish=false',
        )

        expect(source).toContain(
          'createFlashAiAtomicReviewPair',
        )

        expect(source).toContain(
          '--allow-production-one-shot',
        )

        expect(source).toContain(
          'does NOT publish or unpublish',
        )

        expect(source).not.toContain(
          'flash-ai-staging-publish-pair',
        )
      },
    )

    it(
      'blocks execution outside the exact production Railway target before Payload is loaded',
      () => {
        const result =
          runProductionOneShot(
            [
              '--model',
              'gpt-5.6-terra',
              '--allow-provider-requests',
              '--allow-production-rss-one-shot',
              '--expected-production-service-id',
              '11111111-1111-4111-8111-111111111111',
              '--source-id',
              '5',
              '--candidate-url',
              'https://research.google/blog/example/',
            ],
            {
              ...productionEnv,
              RAILWAY_PROJECT_ID:
                'wrong-project',
            },
          )

        expect(result.status).toBe(1)

        expect(
          result.stderr,
        ).toContain(
          'Environment mismatch: RAILWAY_PROJECT_ID.',
        )
      },
    )

    it(
      'requires an explicit candidate URL before any Payload database read',
      () => {
        const result =
          runProductionOneShot(
            [
              '--model',
              'gpt-5.6-terra',
              '--allow-provider-requests',
              '--allow-production-rss-one-shot',
              '--expected-production-service-id',
              '11111111-1111-4111-8111-111111111111',
              '--source-id',
              '5',
            ],
            productionEnv,
          )

        expect(result.status).toBe(1)

        expect(
          result.stderr,
        ).toContain(
          'Flash RSS production one-shot requires --candidate-url.',
        )
      },
    )

    it(
      'rejects the staging database even on the exact production Railway target',
      () => {
        const result =
          runProductionOneShot(
            [
              '--model',
              'gpt-5.6-terra',
              '--allow-provider-requests',
              '--allow-production-rss-one-shot',
              '--expected-production-service-id',
              '11111111-1111-4111-8111-111111111111',
              '--source-id',
              '5',
              '--candidate-url',
              'https://research.google/blog/example/',
            ],
            {
              ...productionEnv,
              DATABASE_URL:
                'postgresql://postgres.tvtnpcqawaekhmhyfrnc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
            },
          )

        expect(result.status).toBe(1)

        expect(
          result.stderr,
        ).toContain(
          'FlashAI PRODUCTION write guard detected the staging database.',
        )
      },
    )

    it(
      'extends pre-persistence preview to production only behind its own exact one-shot guard',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'scripts/flash-html-article-prepersistence-dedup-preview.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'FLASH_ENGINE_STAGING_RAILWAY_TARGET',
        )

        expect(source).toContain(
          '--allow-production-one-shot',
        )

        expect(source).toContain(
          'flash-rss-production-once',
        )

        expect(source).toContain(
          '--expected-production-service-id',
        )

        expect(source).toContain(
          'controlled PRODUCTION one-shot',
        )
      },
    )
  },
)
