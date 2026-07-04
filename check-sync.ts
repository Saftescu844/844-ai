import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const ro = await payload.findByID({ collection: 'articole', id: 28 })
  const en = await payload.findByID({ collection: 'articole', id: 32 })
  const roBlocuri = (ro as any).continut?.root?.children?.length || 0
  const enBlocuri = (en as any).continut?.root?.children?.length || 0
  console.log('\nRO (ID 28) - updatedAt:', (ro as any).updatedAt, '| blocuri:', roBlocuri)
  console.log('EN (ID 32) - updatedAt:', (en as any).updatedAt, '| blocuri:', enBlocuri)
  console.log('\nRO modificat DUPĂ traducere EN?', new Date((ro as any).updatedAt) > new Date((en as any).updatedAt))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
