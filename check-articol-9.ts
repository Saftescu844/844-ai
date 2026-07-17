import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const a: any = await payload.findByID({ collection: 'articole', id: 9, depth: 1 })
  console.log('titlu:', a.titlu)
  console.log('pilon:', typeof a.pilon === 'object' ? a.pilon?.slug + ' (nume: ' + a.pilon?.nume + ')' : a.pilon)
  console.log('status:', a.status)
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
