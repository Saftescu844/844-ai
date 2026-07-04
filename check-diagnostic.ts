import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const ids = [24, 37]
  for (const id of ids) {
    const a: any = await payload.findByID({ collection: 'articole', id }).catch(() => null)
    if (!a) continue
    console.log('\n--- ID ' + id + ' ---')
    console.log('Titlu:', a.titlu)
    console.log('Excerpt:', (a.excerpt || '').substring(0, 150))
    console.log('SursaLink:', a.sursaLink)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
