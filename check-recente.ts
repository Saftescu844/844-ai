import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', sort: '-createdAt', limit: 8, depth: 0 })
  r.docs.forEach((a: any) => console.log('[' + a.id + '] status:' + a.status + ' limba:' + a.limba + ' slug:' + a.slug))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
