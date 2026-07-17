import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'surse', limit: 10 })
  console.log('Total surse:', r.totalDocs)
  r.docs.forEach((s: any) => console.log('  -', s.nume, '(' + s.url + ')'))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
