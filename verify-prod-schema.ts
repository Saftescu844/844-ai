import 'dotenv/config'
import fs from 'fs'
import { getPayload } from 'payload'

const dbUrl = fs.readFileSync('/tmp/prod_db_url.txt', 'utf-8').trim()
process.env.DATABASE_URL = dbUrl

async function main() {
  const config = (await import('./src/payload.config.ts')).default
  const payload = await getPayload({ config })
  const colectii = ['articole', 'categorii', 'surse', 'useri', 'tooluri', 'roadmaps', 'cursuri', 'media', 'newsletter', 'comentarii']
  for (const slug of colectii) {
    try {
      const r = await payload.find({ collection: slug as any, limit: 1 })
      console.log('✓ ' + slug + ': ' + r.totalDocs + ' documente')
    } catch (e: any) {
      console.log('✗ ' + slug + ': EROARE - ' + e.message)
    }
  }
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
