import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const art: any = await payload.findByID({ collection: 'articole', id: 24, depth: 1 })
  const idEn = art.versiuneAlternativa ? (typeof art.versiuneAlternativa === 'object' ? art.versiuneAlternativa.id : art.versiuneAlternativa) : null
  if (idEn) {
    await payload.delete({ collection: 'articole', id: idEn })
    console.log('✓ Șters EN (ID ' + idEn + ')')
  }
  await payload.delete({ collection: 'articole', id: 24 })
  console.log('✓ Șters RO duplicat vechi (ID 24)')
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
