import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const PILONI = [
  { nume: 'Știri AI', slug: 'stiri' },
  { nume: 'Sănătate și medicină', slug: 'sanatate', necesitaDisclaimer: true },
  { nume: 'Educație', slug: 'educatie' },
  { nume: 'Tool Directory', slug: 'tools' },
  { nume: 'Afaceri și productivitate', slug: 'afaceri' },
]

async function main() {
  const payload = await getPayload({ config })
  for (const p of PILONI) {
    const creat = await payload.create({
      collection: 'categorii',
      data: { nume: p.nume, slug: p.slug, pilon: p.slug, necesitaDisclaimer: p.necesitaDisclaimer || false } as any,
    })
    console.log('✓ Creat: ' + p.nume + ' (ID ' + creat.id + ')')
  }
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
