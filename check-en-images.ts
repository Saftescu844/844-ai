import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { like: 'aidoc-and-ai' } }, limit: 1, depth: 1 })
  const a: any = r.docs[0]
  const blocuri = a?.continut?.root?.children || []
  const uploads = blocuri.filter((b: any) => b.type === 'upload')
  console.log('\nArticol EN găsit:', !!a)
  console.log('Total blocuri:', blocuri.length)
  console.log('Total imagini (upload) în EN:', uploads.length)
  console.log('Total paragrafe/heading:', blocuri.filter((b:any)=>b.type==='paragraph'||b.type==='heading').length)
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
