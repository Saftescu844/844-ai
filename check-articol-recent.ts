import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', sort: '-updatedAt', limit: 3, depth: 0 })
  r.docs.forEach((a: any) => console.log('[' + a.id + '] status:' + a.status + ' slug:' + a.slug + ' updatedAt:' + a.updatedAt))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
