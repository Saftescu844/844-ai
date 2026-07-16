import 'dotenv/config'
import fs from 'fs'
import { getPayload } from 'payload'

const dbUrl = fs.readFileSync('/tmp/prod_db_url.txt', 'utf-8').trim()
process.env.DATABASE_URL = dbUrl

async function main() {
  console.log('Conectare la baza de producție...')
  const config = (await import('./src/payload.config.ts')).default
  const payload = await getPayload({ config })
  console.log('✓ Schema creată/verificată cu succes pe baza de producție')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
