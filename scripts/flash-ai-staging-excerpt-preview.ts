import { getPayload } from 'payload'
import config from '@payload-config'

import { assertFlashAiStagingReadOnlyDatabase } from '@/lib/flash/ingestion/flashAiStagingWriteGuard'
import { proposeFlashExcerptFromLexical } from '@/lib/flash/ingestion/flashExcerptReviewPreview'

const STAGING_PROJECT = '44c37d0f-b300-4462-b001-31259ddae5dd'
const STAGING_ENV = 'a589dc28-1c59-468c-9eb4-351fce8fa17b'
const PREVIEW_SERVICE = '7be51b73-dc87-4a53-9ad4-879c00aecad6'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 1 && ['--help', '-h'].includes(args[0] ?? '')) {
    console.log('Read-only staging excerpt preview: --preview-staging. No AI calls or database writes. Candidates require human editorial review.')
    return
  }
  if (args.length !== 1 || args[0] !== '--preview-staging') {
    throw new Error('Use --preview-staging; this script never writes.')
  }
  if (
    process.env.RAILWAY_PROJECT_ID !== STAGING_PROJECT ||
    process.env.RAILWAY_ENVIRONMENT_ID !== STAGING_ENV ||
    process.env.RAILWAY_SERVICE_ID !== PREVIEW_SERVICE ||
    process.env.PAYLOAD_DB_PUSH !== 'false'
  ) {
    throw new Error('Excerpt preview restricted to the dedicated Railway staging service.')
  }

  // Identity-only check: never request or grant write authorization.
  assertFlashAiStagingReadOnlyDatabase(process.env.DATABASE_URL)

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'flash-ai',
    draft: true,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  const missing = result.docs
    .filter(doc => !doc.excerpt?.trim())
    .map(doc => ({
      id: doc.id,
      language: doc.limba,
      title: doc.titlu,
      currentStatus: doc._status,
      ...proposeFlashExcerptFromLexical(doc.continut),
      requiredAction: 'human-review-in-Payload-Admin',
    }))

  console.log('FLASH_EXCERPT_STAGING_READ_ONLY_PREVIEW')
  console.log(JSON.stringify({ writeAttempted: false, missing }, null, 2))
}

main().then(() => process.exit(0)).catch(error => {
  console.error('FLASH_EXCERPT_STAGING_PREVIEW_FAILED')
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
