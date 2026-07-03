import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { traduceArticol, slugEn } from './translator'

async function main() {
  const payload = await getPayload({ config })

  // ștergem versiunea EN greșită de dinainte (ID 30, fără imagini)
  try {
    await payload.delete({ collection: 'articole', id: 31 })
    console.log('✓ Șters articolul EN cu structură greșită')
  } catch (e) { console.log('(nu exista sau deja șters)') }

  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'aidoc-ai-radiologie-prezentare-mqywspae' } }, limit: 1, depth: 0 })
  const art: any = r.docs[0]

  console.log('Retraduc articolul...')
  const tradus = await traduceArticol({ titlu: art.titlu, excerpt: art.excerpt || '', continut: art.continut })
  if (!tradus) { console.error('Traducerea a eșuat'); process.exit(1) }

  const tagsCurate = Array.isArray(art.tags) ? art.tags.map((t: any) => ({ tag: t.tag })) : []
  const metaDescSigura = (tradus.metaDescription || '').substring(0, 158)
  const metaTitleSigur = (tradus.metaTitle || '').substring(0, 58)

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
      metaTitle: metaTitleSigur, metaDescription: metaDescSigura,
    } as any,
  })
  await payload.update({ collection: 'articole', id: art.id, data: { versiuneAlternativa: creatEn.id } as any })

  const blocuri = tradus.continut?.root?.children || []
  const nrImagini = blocuri.filter((b: any) => b.type === 'upload').length

  console.log('\n✓ Tradus (ID EN: ' + creatEn.id + ')')
  console.log('  Slug: ' + creatEn.slug)
  console.log('  Imagini în EN: ' + nrImagini + ' (așteptat: 2)\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
