import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc-ai-radiologie' } }, limit: 1, depth: 2 })
  const a: any = r.docs[0]
  console.log('\nArticol RO ID:', a.id)
  console.log('limba:', a.limba)
  console.log('versiuneAlternativa:', a.versiuneAlternativa ? JSON.stringify(a.versiuneAlternativa).substring(0,100) : 'NU EXISTĂ')
  const totalEn = await payload.find({ collection: 'articole', where: { limba: { equals: 'en' } }, limit: 100 })
  console.log('\nTotal articole EN în platformă:', totalEn.totalDocs)
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
