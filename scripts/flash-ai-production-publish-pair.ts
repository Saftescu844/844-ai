import {
  getPayload,
} from 'payload'
import config from '@payload-config'

import {
  assertFlashAiProductionPairPublishAllowed,
} from '@/lib/flash/ingestion/flashAiProductionPairPublishGuard'
import {
  publishFlashAiStagingPair,
} from '@/lib/flash/ingestion/payloadFlashAiStagingPairPublisher'

const ALLOW_PRODUCTION_FLAG =
  '--allow-production-flash-ai-publish-pair'

const EXPECTED_SERVICE_ID_OPTION =
  '--expected-production-service-id'

function argument(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index === -1 ||
    index + 1 >=
      process.argv.length
  ) {
    return null
  }

  const value =
    process.argv[
      index + 1
    ]?.trim()

  if (
    !value ||
    value.startsWith(
      '--',
    )
  ) {
    return null
  }

  return value
}

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function positiveInteger(
  name: string,
): number {
  const raw =
    argument(
      name,
    )

  const value =
    Number(
      raw,
    )

  if (
    !raw ||
    !Number.isInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      `FlashAI PRODUCTION pair publication requires a valid ${name}.`,
    )
  }

  return value
}

function expectedFingerprint(): string {
  const raw =
    argument(
      '--expected-event-fingerprint',
    )
      ?.toLowerCase()

  if (
    !raw ||
    !/^[a-f0-9]{64}$/.test(
      raw,
    )
  ) {
    throw new Error(
      'FlashAI PRODUCTION pair publication requires a 64-character --expected-event-fingerprint.',
    )
  }

  return raw
}

function printHelp(): void {
  console.log(`
FlashAI production atomic pair publisher

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-ai-production-publish-pair.ts \\
    --allow-production-flash-ai-publish-pair \\
    --expected-production-service-id <railway-service-id> \\
    --ro-id <ro-id> \\
    --en-id <en-id> \\
    --expected-event-fingerprint <64-char-sha256>

Behavior:
  - reads the latest RO and EN draft versions inside one Payload transaction
  - requires both documents to remain review/draft and unpublished
  - requires non-empty excerpts in both languages
  - requires reciprocal alternative-language links
  - requires the same grounded event fingerprint and the explicitly expected fingerprint
  - publishes both documents in the same transaction
  - rolls both writes back if either publication fails
  - does not call any AI provider
  - does not create or modify a scheduler or cron job

Safety:
  - execution is restricted to the exact production Railway project/environment
  - service name must be flash-rss-production-once
  - RAILWAY_SERVICE_ID must match --expected-production-service-id
  - PAYLOAD_DB_PUSH must be exactly false
  - DATABASE_URL must resolve to the known PRODUCTION Supabase project
  - publication requires --allow-production-flash-ai-publish-pair
`)
}

async function main(): Promise<void> {
  if (
    hasFlag(
      '--help',
    ) ||
    hasFlag(
      '-h',
    )
  ) {
    printHelp()
    return
  }

  const expectedServiceId =
    argument(
      EXPECTED_SERVICE_ID_OPTION,
    )

  assertFlashAiProductionPairPublishAllowed({
    allowPublish:
      hasFlag(
        ALLOW_PRODUCTION_FLAG,
      ),
    expectedServiceId,
    databaseUrl:
      process.env
        .DATABASE_URL,
  })

  const roId =
    positiveInteger(
      '--ro-id',
    )

  const enId =
    positiveInteger(
      '--en-id',
    )

  const expectedEventFingerprint =
    expectedFingerprint()

  const payload =
    await getPayload({
      config,
    })

  console.log(
    'FLASH_AI_PRODUCTION_PAIR_PUBLISH_START',
    {
      roId,
      enId,
      expectedEventFingerprint,
    },
  )

  const result =
    await publishFlashAiStagingPair({
      payload,
      roId,
      enId,
      expectedEventFingerprint,
    })

  console.log(
    'FLASH_AI_PRODUCTION_PAIR_PUBLISH_OK',
    result,
  )
}

main()
  .then(
    () => {
      process.exit(
        0,
      )
    },
  )
  .catch(
    error => {
      console.error(
        'FLASH_AI_PRODUCTION_PAIR_PUBLISH_FAILED',
      )

      console.error(
        error instanceof Error
          ? error.message
          : error,
      )

      process.exit(
        1,
      )
    },
  )
