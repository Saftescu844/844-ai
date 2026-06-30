import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

function h(tag: string, text: string) {
  return { type: 'heading', tag, format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] }
}
function p(text: string) {
  return { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] }
}

async function main() {
  const payload = await getPayload({ config })
  const existent = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc-ai-radiologie' } }, limit: 1 })
  if (existent.docs.length === 0) { console.error('Draftul Aidoc nu a fost găsit'); process.exit(1) }
  const art: any = existent.docs[0]
  const id = art.id

  // luăm conținutul existent și inserăm paragraful "Cine dezvoltă tehnologia"
  // după secțiunea "Ce este Aidoc și cât de răspândit este"
  const children = art.continut.root.children
  const nodNou1 = h('h3', 'Cine dezvoltă tehnologia')
  const nodNou2 = p('Tehnologia este dezvoltată de Aidoc, o companie de inteligență artificială clinică fondată în 2016, cu prezență în Statele Unite și Israel. Aidoc este specializată exclusiv în AI pentru radiologie și îngrijire acută. Informațiile despre produse, autorizările FDA și studiile clinice sunt disponibile pe site-ul oficial al companiei, aidoc.com — sursă utilă pentru verificare, dar care, fiind material al producătorului, trebuie completată cu dovezi independente (precum studiul de la Basel menționat mai jos).')

  // găsim poziția după paragraful despre finanțarea Serie E (sau după primul h3) și inserăm
  let insertIdx = -1
  for (let i = 0; i < children.length; i++) {
    const txt = (children[i].children || []).map((c: any) => c.text || '').join('')
    if (txt.includes('Serie E') || txt.includes('finanțare totală')) { insertIdx = i + 1; break }
  }
  if (insertIdx === -1) {
    // fallback: după primul h3
    for (let i = 0; i < children.length; i++) {
      if (children[i].type === 'heading' && children[i].tag === 'h3') { insertIdx = i + 2; break }
    }
  }
  if (insertIdx === -1) insertIdx = children.length

  children.splice(insertIdx, 0, nodNou1, nodNou2)

  await payload.update({
    collection: 'articole',
    id,
    data: {
      continut: art.continut,
      producator: 'Aidoc',
      linkProducator: 'https://www.aidoc.com',
    } as any,
  })
  console.log('\n✓ Draft actualizat (ID ' + id + ')')
  console.log('  + paragraf "Cine dezvoltă tehnologia"')
  console.log('  + producator: Aidoc, link: https://www.aidoc.com\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
