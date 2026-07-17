import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'media', sort: '-createdAt', limit: 1 })
  console.log(JSON.stringify(r.docs[0], null, 2))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
