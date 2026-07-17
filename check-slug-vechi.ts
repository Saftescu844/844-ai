import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'anthropic-a-descoperit-un-spatiu-ascuns-in-care-claude-isi-proceseaza-mrhh5ohv' } }, limit: 1 })
  console.log('Găsit:', r.docs.length, 'rezultate')
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
