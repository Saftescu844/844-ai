import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({
    collection: 'articole',
    where: { slug: { equals: 'railway-atrage-100-de-milioane-de-dolari-pentru-a-provoca-aws-cu-o-inf-mr6dgyla' } },
    limit: 1,
  })
  if (r.docs.length === 0) {
    console.log('NU EXISTĂ cu acest slug exact')
    // căutăm variante apropiate
    const r2 = await payload.find({ collection: 'articole', where: { slug: { like: 'railway-atrage' } }, limit: 5 })
    console.log('Variante găsite:')
    r2.docs.forEach((a: any) => console.log('  slug real:', a.slug, '| status:', a.status, '| limba:', a.limba))
  } else {
    const a: any = r.docs[0]
    console.log('GĂSIT:')
    console.log('  status:', a.status)
    console.log('  limba:', a.limba)
    console.log('  slug:', a.slug)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
