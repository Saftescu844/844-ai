/**
 * Legacy RO -> EN draft recovery. Dry-run by default.
 *
 * Examples:
 *   npx tsx scripts/recover-legacy-translation.ts --article-id=1066
 *   # ONLY after separately approved:
 *   npx tsx scripts/recover-legacy-translation.ts --article-id=1066 --apply --confirm-article-id=1066
 *
 * Never schedule this command. Do not supply production credentials during
 * an isolated test; do not use --apply on production without explicit approval.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { traduceArticol, slugEn } from '../translator'
import { recoverLegacyTranslation } from './legacy-translation-recovery-core'

async function main(): Promise<void> {
  const idArg = process.argv.find((arg) => arg.startsWith('--article-id='))
  const articleId = Number(idArg?.split('=')[1])
  if (!Number.isSafeInteger(articleId) || articleId < 1) {
    throw new Error('Required: --article-id=<positive integer>')
  }
  const apply = process.argv.includes('--apply')
  if (apply && !process.argv.includes(`--confirm-article-id=${articleId}`)) {
    throw new Error('Write blocked: --confirm-article-id=<same ID> is required')
  }
  if (apply && process.env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Write blocked: PAYLOAD_DB_PUSH must be explicitly false')
  }

  const payload = await getPayload({ config })
  const deps = { payload, translate: traduceArticol, slugEnglish: slugEn }

  if (!apply) {
    const result = await recoverLegacyTranslation(deps, articleId, false)
    console.log('DRY-RUN only; no article changes or AI requests:', result)
    return
  }

  // Serialize opt-in recovery operations for the same RO ID across CLI runs.
  // A dedicated session-level advisory lock is held until both drafts link.
  const client = await payload.db.pool.connect()
  let locked = false
  try {
    const result = await client.query(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [844, articleId],
    )
    locked = result.rows[0]?.locked === true
    if (!locked) throw new Error('Concurrent recovery already running for this article')
    const outcome = await recoverLegacyTranslation(deps, articleId, true)
    console.log('RECOVERY RESULT:', outcome)
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1, $2)', [844, articleId])
      } finally {
        client.release()
      }
    } else {
      client.release()
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
