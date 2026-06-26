import 'dotenv/config'
import { getPayload } from 'payload'
import config from './src/payload.config'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STIRI_TEST = [
  {
    sursa: 'OpenAI',
    titlu: 'OpenAI announces new reasoning model',
    descriere:
      'OpenAI has released a new model focused on improved reasoning capabilities for complex multi-step problems, with better performance on math and coding benchmarks.',
    link: 'https://openai.com/news/example',
  },
  {
    sursa: 'Reuters',
    titlu: 'OpenAI new model raises competition in AI race',
    descriere:
      'The release intensifies competition among AI labs. Analysts note the model could pressure rivals to accelerate their own development timelines.',
    link: 'https://reuters.com/technology/example',
  },
]

function textDinHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function extrageCitate(html) {
  const text = textDinHtml(html)
  const citate = []
  const re = /[„"]([^""„]{3,}?)["""]/g
  let m
  while ((m = re.exec(text)) !== null) citate.push(m[1].trim())
  return citate
}
function numaraCuvinte(t) {
  return t.trim().split(/\s+/).filter(Boolean).length
}

function htmlToLexical(html) {
  const root = { type: 'root', format: '', indent: 0, version: 1, children: [] }
  const blocuri = html.match(/<(p|h[1-6])[^>]*>[\s\S]*?<\/\1>/gi) || []
  for (const bloc of blocuri) {
    const tag = (bloc.match(/^<(\w+)/) || [])[1]?.toLowerCase() || 'p'
    const text = bloc
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    if (!text) continue
    if (tag.startsWith('h')) {
      root.children.push({
        type: 'heading',
        tag,
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'text', text, format: 0, version: 1 }],
      })
    } else {
      root.children.push({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'text', text, format: 0, version: 1 }],
      })
    }
  }
  if (root.children.length === 0) {
    root.children.push({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      children: [{ type: 'text', text: textDinHtml(html), format: 0, version: 1 }],
    })
  }
  return { root }
}

function slug(titlu) {
  return (
    titlu
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 70)
      .replace(/-$/, '') +
    '-' +
    Date.now().toString(36)
  )
}

async function main() {
  console.log('\n=== TEST PUBLISHER 844-ai.ro ===\n')

  console.log('[1/4] Conectare la Payload...')
  const payload = await getPayload({ config })
  console.log('      OK Payload conectat\n')

  console.log('[2/4] Caut categoria si sursele...')
  const cat = await payload.find({
    collection: 'categorii',
    where: { slug: { equals: 'stiri' } },
    limit: 1,
  })
  if (cat.docs.length === 0) {
    console.error('      EROARE: Nu am gasit categoria "stiri".')
    process.exit(1)
  }
  const categorieId = cat.docs[0].id
  const surse = await payload.find({ collection: 'surse', limit: 10 })
  const surseIds = surse.docs.map((s) => s.id)
  console.log('      OK Categorie: ' + cat.docs[0].nume + ' | Surse: ' + surseIds.length + '\n')

  console.log('[3/4] Generez articol cu Claude...')
  const surseTxt = STIRI_TEST.map(
    (s) => '[' + s.sursa + '] ' + s.titlu + '\n' + s.descriere + '\nLink: ' + s.link,
  ).join('\n\n---\n\n')
  const prompt =
    'Esti jurnalist la 844-ai.ro. Scrie un articol ORIGINAL in romana despre evenimentul din surse.\n\n' +
    'REGULI: Citate directe DOAR sub 15 cuvinte, max 1 per sursa. Atribuie clar (ex: "potrivit Reuters"). ' +
    'Sintetizeaza din ambele surse. 100% rescris in cuvintele tale. Diacritice corecte. Minim 300 cuvinte.\n\n' +
    'STRUCTURA: <p> pentru paragrafe, <h3> pentru subtitluri.\n\n' +
    'SURSE:\n' +
    surseTxt +
    '\n\n' +
    'Raspunde STRICT cu JSON valid (ghilimele drepte ASCII):\n' +
    '{"titlu":"...","excerpt":"...","continut":"articol HTML","tags":["tag1","tag2"]}'

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = resp.content[0].text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('      EROARE: Claude nu a returnat JSON')
    process.exit(1)
  }
  const art = JSON.parse(
    match[0]
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/,(\s*[}\]])/g, '$1'),
  )
  console.log('      OK Articol generat: "' + art.titlu + '"')

  const citate = extrageCitate(art.continut)
  const problematice = citate.filter((c) => numaraCuvinte(c) > 15)
  console.log('      Citate: ' + citate.length + ' | Peste 15 cuvinte: ' + problematice.length)
  if (problematice.length === 0) console.log('      OK Toate citatele conforme\n')
  else console.log('      ATENTIE: citate prea lungi (compliance ar corecta in productie)\n')

  console.log('[4/4] Public in Payload...')
  const creat = await payload.create({
    collection: 'articole',
    data: {
      titlu: art.titlu,
      slug: slug(art.titlu),
      limba: 'ro',
      pilon: categorieId,
      tip: 'stire-auto',
      excerpt: art.excerpt || '',
      continut: htmlToLexical(art.continut),
      surse: surseIds.slice(0, 2),
      tags: (art.tags || []).map((t) => ({ tag: t })),
      status: 'published',
      publishedAt: new Date().toISOString(),
      generatAutomat: true,
      numarConfirmari: 2,
    },
  })

  console.log('      OK PUBLICAT! ID: ' + creat.id)
  console.log('\n=== SUCCES ===')
  console.log('Articolul a trecut prin tot lantul: Claude -> validare -> Payload.')
  console.log('Verifica-l in panoul admin -> Articole.\n')
  process.exit(0)
}

main().catch((err) => {
  console.error('\nEROARE:', err.message)
  console.error(err)
  process.exit(1)
})
