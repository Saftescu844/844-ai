import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const a: any = await payload.findByID({ collection: 'articole', id: 129 })
  console.log('Slug:', a.slug)
  const blocuri = a.continut?.root?.children || []
  const videoBlocks = blocuri.filter((b: any) => b.type === 'block' && b.fields?.blockType === 'video')
  videoBlocks.forEach((b: any, i: number) => console.log('  [' + i + '] url:', b.fields?.url))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
