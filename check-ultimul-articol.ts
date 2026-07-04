import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', sort: '-createdAt', limit: 3 })
  console.log('\nUltimele 3 articole create:')
  r.docs.forEach((a: any) => console.log('  [' + a.createdAt + '] ' + a.titlu.substring(0, 60) + ' (limba: ' + a.limba + ')'))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
