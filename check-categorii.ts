import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'categorii', limit: 20 })
  console.log('Total categorii:', r.totalDocs)
  r.docs.forEach((c: any) => console.log('  -', c.nume, '(' + c.slug + ')'))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
