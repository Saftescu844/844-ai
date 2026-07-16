import fs from 'fs'
import { Client } from 'pg'

const dbUrl = fs.readFileSync('/tmp/prod_db_url.txt', 'utf-8').trim()

async function main() {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  const res = await client.query('SELECT COUNT(*) FROM articole')
  console.log('Număr REAL de articole în baza conectată prin acest string:', res.rows[0].count)
  const res2 = await client.query('SELECT id, titlu FROM articole LIMIT 3')
  console.log('Exemple:')
  res2.rows.forEach((r: any) => console.log('  [' + r.id + ']', (r.titlu || '').substring(0, 50)))
  await client.end()
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
