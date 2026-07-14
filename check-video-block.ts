import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'inteligenta-artificiala-in-dermatologie-google-cerceteaza-cum-poate-aj-mrhh4pky' } }, limit: 1 })
  const a: any = r.docs[0]
  const blocuri = a.continut?.root?.children || []
  const videoBlocks = blocuri.filter((b: any) => b.type === 'block' && b.fields?.blockType === 'video')
  console.log('Blocuri video găsite:', videoBlocks.length)
  videoBlocks.forEach((b: any, i: number) => console.log('  [' + i + '] url:', b.fields?.url, '| titlu:', b.fields?.titlu))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
