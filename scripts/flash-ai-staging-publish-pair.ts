import { getPayload } from 'payload'
import config from '@payload-config'

import {
  assertFlashAiStagingWriteAllowed,
} from '@/lib/flash/ingestion/flashAiStagingWriteGuard'

import {
  publishFlashAiStagingPair,
} from '@/lib/flash/ingestion/payloadFlashAiStagingPairPublisher'

const ALLOW_FLAG =
  '--allow-staging-flash-ai-publish-pair'

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
      `FlashAI staging pair publish requires a valid ${name}.`,
    )
  }

  return value
}

async function main(): Promise<void> {
  const allowPublish =
    process.argv.includes(
      ALLOW_FLAG,
    )

  assertFlashAiStagingWriteAllowed({
    allowWrite:
      allowPublish,
    databaseUrl:
      process.env.DATABASE_URL,
  })

  const roId =
    positiveInteger(
      '--ro-id',
    )

  const enId =
    positiveInteger(
      '--en-id',
    )

  const payload =
    await getPayload({
      config,
    })

  console.log(
    'FLASH_AI_STAGING_PAIR_PUBLISH_START',
  )

  const result =
    await publishFlashAiStagingPair({
      payload,
      roId,
      enId,
    })

  console.log(
    'FLASH_AI_STAGING_PAIR_PUBLISH_OK',
    result,
  )
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(
      'FLASH_AI_STAGING_PAIR_PUBLISH_FAILED',
    )

    console.error(
      error instanceof Error
        ? error.message
        : error,
    )

    process.exit(1)
  })
