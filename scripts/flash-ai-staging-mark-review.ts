import { getPayload } from 'payload'
import config from '@payload-config'

import {
  assertFlashAiStagingWriteAllowed,
} from '@/lib/flash/ingestion/flashAiStagingWriteGuard'

const ALLOW_FLAG =
  '--allow-staging-flash-ai-review-transition'

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

function parseIds(): number[] {
  const raw = argument('--ids')

  if (!raw) {
    throw new Error(
      'FlashAI STAGING review transition requires --ids.',
    )
  }

  const ids = raw
    .split(',')
    .map(value => Number(value.trim()))
    .filter(value => Number.isInteger(value) && value > 0)

  if (ids.length === 0) {
    throw new Error(
      'FlashAI STAGING review transition requires valid positive integer IDs.',
    )
  }

  return [...new Set(ids)]
}

async function main(): Promise<void> {
  const allowTransition =
    process.argv.includes(ALLOW_FLAG)

  assertFlashAiStagingWriteAllowed({
    allowWrite: allowTransition,
    databaseUrl: process.env.DATABASE_URL,
  })

  const ids = parseIds()
  const payload = await getPayload({ config })

  for (const id of ids) {
    const current = await payload.findByID({
      collection: 'flash-ai',
      id,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })

    if (
      current._status !== 'draft' ||
      current.automationDecision !== 'review' ||
      current.publishedAt
    ) {
      throw new Error(
        `FlashAI ${id} is not eligible for controlled review transition.`,
      )
    }

    if (current.editorialStatus === 'review') {
      console.log('FLASH_AI_STAGING_REVIEW_ALREADY_OK', {
        id: current.id,
        editorialStatus: current.editorialStatus,
        automationDecision: current.automationDecision,
        status: current._status,
        publishedAt: current.publishedAt ?? null,
      })
      continue
    }

    if (current.editorialStatus !== 'draft') {
      throw new Error(
        `FlashAI ${id} must be in editorial draft before review transition.`,
      )
    }

    const updated = await payload.update({
      collection: 'flash-ai',
      id,
      data: {
        editorialStatus: 'review',
        automationDecision: 'review',
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })

    console.log('FLASH_AI_STAGING_REVIEW_TRANSITION_OK', {
      id: updated.id,
      editorialStatus: updated.editorialStatus,
      automationDecision: updated.automationDecision,
      status: updated._status,
      publishedAt: updated.publishedAt ?? null,
    })
  }
}

main()
  .then(() => {
    console.log('FLASH_AI_STAGING_REVIEW_TRANSITION_DONE')
    process.exit(0)
  })
  .catch(error => {
    console.error('FLASH_AI_STAGING_REVIEW_TRANSITION_FAILED')
    console.error(
      error instanceof Error
        ? error.message
        : error,
    )
    process.exit(1)
  })
