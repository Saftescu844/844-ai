import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  for (const slug of ['afaceri', 'sanatate']) {
    const r = await payload.find({ collection: 'articole', where: { and: [{ 'pilon.slug': { equals: slug } }, { limba: { equals: 'ro' } }] }, sort: '-createdAt', limit: 10 })
    console.log('\n=== ' + slug.toUpperCase() + ' (RO) ===')
    r.docs.forEach((a: any) => console.log('  [' + a.id + '] ' + a.createdAt + ' - ' + a.titlu.substring(0, 65)))
  }
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
