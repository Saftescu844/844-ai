import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  assertFlashAiProductionPairPublishAllowed,
} from '@/lib/flash/ingestion/flashAiProductionPairPublishGuard'

const productionEnvironment = {
  RAILWAY_PROJECT_ID:
    '54c46ab1-ebab-491c-bdbe-571a3fce9ceb',
  RAILWAY_ENVIRONMENT_ID:
    '12b22bbd-469f-4cb8-b418-cc2c8e40af6d',
  RAILWAY_SERVICE_NAME:
    'flash-rss-production-once',
  RAILWAY_SERVICE_ID:
    '6e954363-b055-4032-a501-f5615cc49932',
  PAYLOAD_DB_PUSH:
    'false',
} as NodeJS.ProcessEnv

const productionDatabaseUrl =
  'postgresql://postgres.hyapqvnubhwkwmwudeit:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

describe(
  'FlashAI PRODUCTION pair publish guard',
  () => {
    it(
      'requires explicit publication approval',
      () => {
        expect(
          () =>
            assertFlashAiProductionPairPublishAllowed({
              allowPublish:
                false,
              expectedServiceId:
                '6e954363-b055-4032-a501-f5615cc49932',
              databaseUrl:
                productionDatabaseUrl,
              environment:
                productionEnvironment,
            }),
        ).toThrow(
          'FlashAI PRODUCTION pair publication is not explicitly approved.',
        )
      },
    )

    it(
      'rejects a wrong Railway service identity',
      () => {
        expect(
          () =>
            assertFlashAiProductionPairPublishAllowed({
              allowPublish:
                true,
              expectedServiceId:
                'wrong-service-id',
              databaseUrl:
                productionDatabaseUrl,
              environment:
                productionEnvironment,
            }),
        ).toThrow(
          'Environment mismatch: RAILWAY_SERVICE_ID.',
        )
      },
    )

    it(
      'requires PAYLOAD_DB_PUSH=false',
      () => {
        expect(
          () =>
            assertFlashAiProductionPairPublishAllowed({
              allowPublish:
                true,
              expectedServiceId:
                '6e954363-b055-4032-a501-f5615cc49932',
              databaseUrl:
                productionDatabaseUrl,
              environment: {
                ...productionEnvironment,
                PAYLOAD_DB_PUSH:
                  'true',
              },
            }),
        ).toThrow(
          'Environment mismatch: PAYLOAD_DB_PUSH.',
        )
      },
    )

    it(
      'rejects the staging database',
      () => {
        expect(
          () =>
            assertFlashAiProductionPairPublishAllowed({
              allowPublish:
                true,
              expectedServiceId:
                '6e954363-b055-4032-a501-f5615cc49932',
              databaseUrl:
                'postgresql://postgres.tvtnpcqawaekhmhyfrnc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
              environment:
                productionEnvironment,
            }),
        ).toThrow(
          'FlashAI PRODUCTION write guard detected the staging database.',
        )
      },
    )

    it(
      'allows only the exact production execution context',
      () => {
        expect(
          () =>
            assertFlashAiProductionPairPublishAllowed({
              allowPublish:
                true,
              expectedServiceId:
                '6e954363-b055-4032-a501-f5615cc49932',
              databaseUrl:
                productionDatabaseUrl,
              environment:
                productionEnvironment,
            }),
        ).not.toThrow()
      },
    )
  },
)
