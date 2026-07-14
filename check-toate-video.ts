import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', sort: '-updatedAt', limit: 5 })
  r.docs.forEach((a: any) => {
    const blocuri = a.continut?.root?.children || []
    const videoBlocks = blocuri.filter((b: any) => b.type === 'block' && b.fields?.blockType === 'video')
    console.log('[' + a.id + '] "' + a.titlu.substring(0, 40) + '" | updatedAt: ' + a.updatedAt + ' | video blocks: ' + videoBlocks.length)
  })
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
