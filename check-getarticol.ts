import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
async function main() {
  const payload = await getPayload({ config })
  try {
    const r = await payload.find({
      collection: 'articole',
      where: {
        and: [
          { slug: { equals: 'railway-atrage-100-de-milioane-de-dolari-pentru-a-provoca-aws-cu-o-inf-mr6dgyla' } },
          { limba: { equals: 'ro' } },
          { status: { equals: 'published' } },
        ],
      },
      limit: 1,
      depth: 2,
    })
    console.log('Rezultate găsite:', r.docs.length)
    if (r.docs.length > 0) {
      const a: any = r.docs[0]
      console.log('pilon:', a.pilon)
      console.log('are continut:', !!a.continut)
    }
  } catch (e: any) {
    console.log('EROARE la query (exact ca getArticol):', e.message)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
