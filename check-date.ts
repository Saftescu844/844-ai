import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc' } }, limit: 1, depth: 1 })
  const a: any = r.docs[0]
  console.log('\nArticol:', a?.titlu?.substring(0, 40))
  console.log('status:', a?.status)
  console.log('producator:', a?.producator)
  console.log('galerie:', Array.isArray(a?.galerie) ? a.galerie.length + ' imagini' : 'gol')
  if (Array.isArray(a?.galerie)) a.galerie.forEach((g: any, i: number) => console.log('  [' + i + '] caption:', g.caption || '(gol)', '| credit:', g.credit || '(gol)'))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
