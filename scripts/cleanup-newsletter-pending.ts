import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { stergeAbonamentePendingExpirate } from '../src/lib/newsletter-pending-retention'

async function main() {
  const payload = await getPayload({ config })

  const sterse = await stergeAbonamentePendingExpirate(
    (sql, values) => payload.db.pool.query(sql, [...values]),
  )

  console.log(`[newsletter-retention] deleted=${sterse}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[newsletter-retention] cleanup failed:', error)
    process.exit(1)
  })
