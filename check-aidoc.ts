import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc-ai-radiologie' } }, limit: 2, depth: 1 })
  for (const a of r.docs as any[]) {
    console.log('\n--- Articol ID ' + a.id + ' ---')
    console.log('  titlu:', a.titlu?.substring(0, 50))
    console.log('  slug:', a.slug)
    console.log('  status:', a.status)
    console.log('  limba:', a.limba)
    console.log('  pilon:', typeof a.pilon === 'object' ? a.pilon.slug : a.pilon)
    console.log('  subcategorie:', a.subcategorie)
  }
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
