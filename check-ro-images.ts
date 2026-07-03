import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'aidoc-ai-radiologie-prezentare-mqywspae' } }, limit: 1, depth: 1 })
  const a: any = r.docs[0]
  const blocuri = a?.continut?.root?.children || []
  const uploads = blocuri.filter((b: any) => b.type === 'upload')
  console.log('Total blocuri RO:', blocuri.length)
  console.log('Total imagini (upload) în RO:', uploads.length)
  uploads.forEach((u:any, i:number) => console.log('  [' + i + '] are value.url:', !!(u.value && u.value.url)))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
