import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { traduceArticol, slugEn } from './translator'

// ACEEAȘI funcție de hash ca în hook-ul din Articole.ts — trebuie să rămână identică
function calculeazaHash(continut: any): string {
  const textPlat = (node: any): string => {
    if (!node) return ''
    if (node.type === 'upload') return ''
    const text = (node.children || []).map((c: any) => c.text || textPlat(c)).join('')
    return text
  }
  const toateBlocurile = (continut?.root?.children || []).map(textPlat).join('|')
  let suma = 0
  for (let i = 0; i < toateBlocurile.length; i++) suma = (suma + toateBlocurile.charCodeAt(i) * (i + 1)) % 1000000007
  return toateBlocurile.length + '-' + suma
}

async function main() {
  const slugArg = process.argv[2]
  if (!slugArg) { console.error('Folosire: npx tsx tradu-articol.ts <slug-sau-parte-din-slug>'); process.exit(1) }

  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: slugArg } }, limit: 1, depth: 0 })
  const art: any = r.docs[0]
  if (!art) { console.error('Articol negăsit pentru: ' + slugArg); process.exit(1) }
  if (art.limba !== 'ro') { console.error('Articolul trebuie să fie RO (sursă pentru traducere)'); process.exit(1) }

  console.log('Traduc: ' + art.titlu.substring(0, 60) + '...')
  const tradus = await traduceArticol({ titlu: art.titlu, excerpt: art.excerpt || '', continut: art.continut })
  if (!tradus) { console.error('Traducerea a eșuat'); process.exit(1) }

  const tagsCurate = Array.isArray(art.tags) ? art.tags.map((t: any) => ({ tag: t.tag })) : []
  const metaDescSigura = (tradus.metaDescription || '').substring(0, 158)
  const metaTitleSigur = (tradus.metaTitle || '').substring(0, 58)
  const hashNou = calculeazaHash(art.continut)

  const dateEn = {
    titlu: tradus.titlu, slug: slugEn(tradus.titlu), limba: 'en', pilon: art.pilon,
    subcategorie: art.subcategorie, tip: art.tip,
    excerpt: tradus.excerpt, continut: tradus.continut,
    sursaNume: art.sursaNume, sursaLink: art.sursaLink,
    producator: art.producator, linkProducator: art.linkProducator,
    tags: tagsCurate, editorialStatus: 'review',
    generatAutomat: false, numarConfirmari: 1,
    versiuneAlternativa: art.id,
    metaTitle: metaTitleSigur, metaDescription: metaDescSigura,
  } as any

  let creatEn: any

  // Dacă EN există deja, păstrăm documentul și versiunea publicată curentă.
  // Noua traducere este salvată ca draft pentru revizuire umană.
  if (art.versiuneAlternativa) {
    const idEn =
      typeof art.versiuneAlternativa === 'object'
        ? art.versiuneAlternativa.id
        : art.versiuneAlternativa

    creatEn = await payload.update({
      collection: 'articole',
      id: idEn,
      draft: true,
      data: dateEn,
    })

    console.log('✓ EN existent actualizat ca draft pentru revizuire (ID ' + idEn + ')')
  } else {
    creatEn = await payload.create({
      collection: 'articole',
      draft: true,
      data: dateEn,
    })

    console.log('✓ EN nou creat ca draft pentru revizuire (ID ' + creatEn.id + ')')
  }

  await payload.update({
    collection: 'articole', id: art.id,
    data: { versiuneAlternativa: creatEn.id, continutHashTradus: hashNou, necesitaRetraducere: false } as any,
  })

  console.log('\n✓ Traducere EN pregătită pentru revizuire (ID: ' + creatEn.id + ') | Slug: ' + creatEn.slug)
  console.log('✓ Hash salvat pe RO, necesitaRetraducere resetat la false\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
