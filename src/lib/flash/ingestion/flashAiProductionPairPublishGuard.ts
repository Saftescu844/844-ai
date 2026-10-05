import {
  assertFlashAiProductionWriteAllowed,
} from '@/lib/flash/ingestion/flashAiProductionWriteGuard'

const PRODUCTION_PROJECT_ID =
  '54c46ab1-ebab-491c-bdbe-571a3fce9ceb'

const PRODUCTION_ENVIRONMENT_ID =
  '12b22bbd-469f-4cb8-b418-cc2c8e40af6d'

const PRODUCTION_ONE_SHOT_SERVICE_NAME =
  'flash-rss-production-once'

export interface AssertFlashAiProductionPairPublishAllowedInput {
  allowPublish:
    boolean

  expectedServiceId:
    string | null | undefined

  databaseUrl:
    string | null | undefined

  environment?:
    NodeJS.ProcessEnv
}

export function assertFlashAiProductionPairPublishAllowed({
  allowPublish,
  expectedServiceId,
  databaseUrl,
  environment =
    process.env,
}: AssertFlashAiProductionPairPublishAllowedInput): void {
  if (!allowPublish) {
    throw new Error(
      'FlashAI PRODUCTION pair publication is not explicitly approved.',
    )
  }

  const normalizedExpectedServiceId =
    expectedServiceId
      ?.trim()

  if (!normalizedExpectedServiceId) {
    throw new Error(
      'FlashAI PRODUCTION pair publication requires the expected Railway service ID.',
    )
  }

  const mismatches:
    string[] = []

  if (
    environment
      .RAILWAY_PROJECT_ID !==
    PRODUCTION_PROJECT_ID
  ) {
    mismatches.push(
      'RAILWAY_PROJECT_ID',
    )
  }

  if (
    environment
      .RAILWAY_ENVIRONMENT_ID !==
    PRODUCTION_ENVIRONMENT_ID
  ) {
    mismatches.push(
      'RAILWAY_ENVIRONMENT_ID',
    )
  }

  if (
    environment
      .RAILWAY_SERVICE_NAME !==
    PRODUCTION_ONE_SHOT_SERVICE_NAME
  ) {
    mismatches.push(
      'RAILWAY_SERVICE_NAME',
    )
  }

  if (
    environment
      .RAILWAY_SERVICE_ID !==
    normalizedExpectedServiceId
  ) {
    mismatches.push(
      'RAILWAY_SERVICE_ID',
    )
  }

  if (
    environment
      .PAYLOAD_DB_PUSH !==
    'false'
  ) {
    mismatches.push(
      'PAYLOAD_DB_PUSH',
    )
  }

  if (
    mismatches.length >
    0
  ) {
    throw new Error(
      [
        'FlashAI PRODUCTION pair publication is restricted to the dedicated production one-shot service.',
        `Environment mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }

  assertFlashAiProductionWriteAllowed({
    allowWrite:
      true,
    databaseUrl,
  })
}
