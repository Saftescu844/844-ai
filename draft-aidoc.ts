import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'aidoc-ai-radiologie-prezentare-mqywspae' } }, limit: 1 })
  const art: any = r.docs[0]
  await payload.update({ collection: 'articole', id: art.id, data: { status: 'draft' } as any })
  console.log('\n✓ Readus la DRAFT (ID ' + art.id + ') — nu mai e public\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
