import { getPayload } from 'payload'
import config from '@payload-config'

import {
  assertFlashAiStagingWriteAllowed,
} from '@/lib/flash/ingestion/flashAiStagingWriteGuard'

import {
  linkFlashAiReciprocalAlternatives,
} from '@/lib/flash/ingestion/payloadFlashAiReciprocalAlternativeLinker'

const ALLOW_FLAG =
  '--allow-staging-flash-ai-link-alternatives'

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)

  if (
    index === -1 ||
    index + 1 >= process.argv.length
  ) {
    return null
  }

  const value =
    process.argv[index + 1]?.trim()

  if (!value || value.startsWith('--')) {
    return null
  }

  return value
}

function parsePairs(): Array<{ roId: number; enId: number }> {
  const raw = argument('--pairs')

  if (!raw) {
    throw new Error(
      'FlashAI STAGING alternative linking requires --pairs.',
    )
  }

  const pairs = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      const [
        roRaw,
        enRaw,
      ] = value.split(':')

      const roId = Number(roRaw)
      const enId = Number(enRaw)

      if (
        !Number.isInteger(roId) ||
        !Number.isInteger(enId) ||
        roId <= 0 ||
        enId <= 0 ||
        roId === enId
      ) {
        throw new Error(
          `Invalid FlashAI RO:EN pair: ${value}`,
        )
      }

      return {
        roId,
        enId,
      }
    })

  if (pairs.length === 0) {
    throw new Error(
      'FlashAI STAGING alternative linking requires at least one valid pair.',
    )
  }

  return pairs
}

async function main(): Promise<void> {
  const allowLinking =
    process.argv.includes(ALLOW_FLAG)

  assertFlashAiStagingWriteAllowed({
    allowWrite: allowLinking,
    databaseUrl: process.env.DATABASE_URL,
  })

  const pairs = parsePairs()
  const payload = await getPayload({ config })

  for (const pair of pairs) {
    const result =
      await linkFlashAiReciprocalAlternatives({
        payload,
        roId: pair.roId,
        enId: pair.enId,
      })

    console.log(
      'FLASH_AI_STAGING_ALTERNATIVE_LINK_OK',
      result,
    )
  }

  console.log(
    'FLASH_AI_STAGING_ALTERNATIVE_LINK_DONE',
  )
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(
      'FLASH_AI_STAGING_ALTERNATIVE_LINK_FAILED',
    )

    console.error(
      error instanceof Error
        ? error.message
        : error,
    )

    process.exit(1)
  })
