import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'aidoc-ai-radiologie-prezentare-mqywspae' } }, limit: 1 })
  if (r.docs.length === 0) { console.error('Nu găsesc articolul'); process.exit(1) }
  const art: any = r.docs[0]
  const updated = await payload.update({
    collection: 'articole',
    id: art.id,
    data: { status: 'published', publishedAt: new Date().toISOString() } as any,
  })
  console.log('\n✓ PUBLICAT (ID ' + art.id + ')')
  console.log('  status acum:', (updated as any).status)
  console.log('  URL: /ro/articol/' + art.slug + '\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
