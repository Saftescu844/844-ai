import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  for (const slug of ['stiri', 'sanatate', 'educatie', 'tools', 'afaceri']) {
    const r = await payload.find({ collection: 'articole', where: { 'pilon.slug': { equals: slug } }, limit: 100 })
    console.log(slug + ': ' + r.totalDocs + ' articole')
  }
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
