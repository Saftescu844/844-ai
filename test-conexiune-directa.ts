import fs from 'fs'
import { Client } from 'pg'

const dbUrl = fs.readFileSync('/tmp/prod_db_url.txt', 'utf-8').trim()
console.log('Conectez la:', dbUrl.replace(/:[^:@]+@/, ':***@'))

async function main() {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  const res = await client.query('SELECT current_database(), inet_server_addr(), version()')
  console.log('Bază conectată:', res.rows[0].current_database)
  console.log('Adresă server:', res.rows[0].inet_server_addr)

  const tabele = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 20")
  console.log('Total tabele publice:', tabele.rows.length)
  tabele.rows.forEach((r: any) => console.log('  -', r.tablename))

  await client.end()
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
