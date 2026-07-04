import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  // ștergem versiunile RO vechi (ID 39 și 41) + traducerile lor EN legate
  for (const idRo of [39, 41]) {
    const art: any = await payload.findByID({ collection: 'articole', id: idRo, depth: 1 }).catch(() => null)
    if (!art) { console.log('ID ' + idRo + ' deja șters sau inexistent'); continue }
    const idEn = art.versiuneAlternativa ? (typeof art.versiuneAlternativa === 'object' ? art.versiuneAlternativa.id : art.versiuneAlternativa) : null
    if (idEn) {
      await payload.delete({ collection: 'articole', id: idEn })
      console.log('✓ Șters EN (ID ' + idEn + ') legat de RO ' + idRo)
    }
    await payload.delete({ collection: 'articole', id: idRo })
    console.log('✓ Șters RO duplicat vechi (ID ' + idRo + ')')
  }
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
