import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { traduceArticol, slugEn } from './translator'

async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc-ai-radiologie' } }, limit: 1, depth: 1 })
  const art: any = r.docs[0]
  if (!art) { console.error('Articol nu a fost găsit'); process.exit(1) }

  console.log('Traduc articolul: ' + art.titlu.substring(0, 50) + '...')
  const tradus = await traduceArticol({ titlu: art.titlu, excerpt: art.excerpt || '', continut: art.continut })
  if (!tradus) { console.error('Traducerea a eșuat'); process.exit(1) }

  // curățăm tags de id-urile vechi (Payload nu acceptă id la creare)
  const tagsCurate = Array.isArray(art.tags) ? art.tags.map((t: any) => ({ tag: t.tag })) : []

  const creatEn = await payload.create({
    collection: 'articole',
    data: {
      titlu: tradus.titlu, slug: slugEn(tradus.titlu), limba: 'en', pilon: art.pilon,
      subcategorie: art.subcategorie, tip: art.tip,
      excerpt: tradus.excerpt, continut: tradus.continut,
      sursaNume: art.sursaNume, sursaLink: art.sursaLink,
      producator: art.producator, linkProducator: art.linkProducator,
      tags: tagsCurate, status: art.status, publishedAt: new Date().toISOString(),
      generatAutomat: false, numarConfirmari: 1,
      versiuneAlternativa: art.id,
      metaTitle: tradus.metaTitle, metaDescription: tradus.metaDescription,
    } as any,
  })
  await payload.update({ collection: 'articole', id: art.id, data: { versiuneAlternativa: creatEn.id } as any })

  console.log('\n✓ Tradus și publicat (ID EN: ' + creatEn.id + ')')
  console.log('  Slug EN: ' + creatEn.slug)
  console.log('  Legat reciproc cu RO (ID ' + art.id + ')\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
