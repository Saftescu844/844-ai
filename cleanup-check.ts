import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc-and-ai' } }, limit: 10 })
  console.log('\nTotal versiuni EN ale articolului Aidoc găsite:', r.totalDocs)
  r.docs.forEach((a: any) => console.log('  ID', a.id, '-', a.slug))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
