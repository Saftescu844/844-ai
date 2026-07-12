import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'cursuri', limit: 1, depth: 1 })
  const curs: any = r.docs[0]
  const lectii = curs.lectii || []
  lectii.forEach((l: any, i: number) => {
    const blocuri = l.continut?.root?.children || []
    const uploads = blocuri.filter((b: any) => b.type === 'upload')
    console.log('Lecția ' + (i+1) + ' "' + l.titlu + '": ' + blocuri.length + ' blocuri, ' + uploads.length + ' imagini')
  })
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
