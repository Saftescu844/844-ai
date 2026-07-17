import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const SURSE = [
  { nume: 'OpenAI', url: 'https://openai.com/blog', nivel: 'primar' },
  { nume: 'Reuters', url: 'https://www.reuters.com', nivel: 'secundar' },
  { nume: 'MIT Tech Review', url: 'https://www.technologyreview.com', nivel: 'secundar' },
]

async function main() {
  const payload = await getPayload({ config })
  for (const s of SURSE) {
    try {
      const creat = await payload.create({
        collection: 'surse',
        data: { nume: s.nume, url: s.url, nivelIncredere: s.nivel } as any,
      })
      console.log('✓ Creat: ' + s.nume + ' (ID ' + creat.id + ')')
    } catch (e: any) {
      console.log('✗ ' + s.nume + ': ' + e.message)
    }
  }
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
