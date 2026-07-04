import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const en = await payload.findByID({ collection: 'articole', id: 33 })
  const blocuri = (en as any).continut?.root?.children || []
  console.log('Imagini în EN nou:', blocuri.filter((b: any) => b.type === 'upload').length, '(așteptat: 2)')
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
