import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { status: { equals: 'published' } }, limit: 1, sort: '-createdAt' })
  console.log(r.docs[0]?.slug)
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
