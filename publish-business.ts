import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import Anthropic from '@anthropic-ai/sdk'
import Parser from 'rss-parser'
import { traduceArticol, slugEn } from './translator'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const parser = new Parser({ timeout: 15000 })

// FEED-URI BUSINESS/ENTERPRISE AI
const FEEDS = [
  { nume: 'TechCrunch', url: 'https://techcrunch.com/feed/', dedicat: true },
  { nume: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/', dedicat: true },
  { nume: 'Tech.eu', url: 'https://tech.eu/feed/', dedicat: true },
  { nume: 'Forbes Business', url: 'https://www.forbes.com/business/?feed=rss_p', dedicat: false },
]

const KW_AI = ['artificial intelligence', ' ai ', 'a.i.', 'machine learning', 'llm', 'chatbot', 'generative ai', 'genai', 'openai', 'anthropic', 'gemini', 'claude', 'copilot', 'agentic']
const KW_BUSINESS = ['enterprise', 'business', 'adoption', 'investment', 'funding', 'workforce', 'productivity', 'roi', 'strategy', 'market', 'startup', 'venture', 'ceo', 'company', 'companies', 'industry', 'revenue', 'jobs', 'hiring', 'workplace']
const EXCLUDE = ['gta', 'playstation', 'xbox', 'nintendo', 'wwe', 'wrestling', 'wrestlemania', 'nba', 'nfl', 'movie', 'trailer', 'netflix', 'celebrity']

const MAX_ARTICOLE = 2

function esteRelevantBusiness(text: string, dedicat: boolean): boolean {
  const t = ' ' + (text || '').toLowerCase() + ' '
  if (EXCLUDE.some(k => t.includes(k))) return false
  const areAI = KW_AI.some(k => t.includes(k))
  if (dedicat) return areAI
  return areAI && KW_BUSINESS.some(k => t.includes(k))
}

function slug(titlu: string): string {
  return titlu.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 70).replace(/-$/, '') + '-' + Date.now().toString(36)
}

function htmlToLexical(html: string) {
  const root: any = { type: 'root', format: '', indent: 0, version: 1, children: [] }
  const blocuri = html.match(/<(p|h[1-6])[^>]*>[\s\S]*?<\/\1>/gi) || []
  for (const bloc of blocuri) {
    const tag = (bloc.match(/^<(\w+)/) || [])[1]?.toLowerCase() || 'p'
    const text = bloc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!text) continue
    if (tag.startsWith('h')) root.children.push({ type: 'heading', tag, format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] })
    else root.children.push({ type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] })
  }
  if (root.children.length === 0) root.children.push({ type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), format: 0, version: 1 }] })
  return { root }
}

async function main() {
  console.log('\n=== PUBLISHER AFACERI 844-ai.ro ===\n')
  const payload = await getPayload({ config })

  const cat = await payload.find({ collection: 'categorii', where: { slug: { equals: 'afaceri' } }, limit: 1 })
  if (cat.docs.length === 0) { console.error('Lipsește categoria afaceri.'); process.exit(1) }
  const categorieId = (cat.docs[0] as any).id

  console.log('[1] Citesc feed-urile business...')
  let stiri: any[] = []
  for (const feed of FEEDS) {
    try {
      const rezultat = await parser.parseURL(feed.url)
      const items = (rezultat.items || []).slice(0, 12)
      for (const item of items) {
        const titlu = item.title || ''
        const descriere = (item.contentSnippet || item.content || '').substring(0, 400)
        if (esteRelevantBusiness(titlu + ' ' + descriere, feed.dedicat)) {
          stiri.push({ sursa: feed.nume, titlu, descriere, link: item.link || '', data: item.pubDate })
        }
      }
      console.log('    ' + feed.nume + ': ' + items.length + ' items')
    } catch (e: any) {
      console.log('    ' + feed.nume + ': EROARE (' + e.message.substring(0, 40) + ')')
    }
  }
  console.log('    Total știri business AI relevante: ' + stiri.length + '\n')
  if (stiri.length === 0) { console.log('Nicio știre relevantă. Stop.'); process.exit(0) }

  console.log('[2] Evaluez impactul (1 apel Claude)...')
  const lista = stiri.slice(0, 30).map((s, i) => (i + 1) + '. [' + s.sursa + '] ' + s.titlu).join('\n')
  const promptTriere =
    'Ești editor de business la o platformă AI românească. Pentru fiecare știre despre AI în afaceri, dă:\n' +
    '- SCOR de impact 1-10 (10=schimbare majoră de piață, investiție uriașă; 1=anunț minor)\n\n' +
    'Răspunde DOAR cu linii în formatul: NUMAR|SCOR (ex: 1|7)\nFără alt text.\n\nȘTIRI:\n' + lista

  const respTriere = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: promptTriere }] })
  const rawTriere = (respTriere.content[0] as any).text
  for (const linie of rawTriere.split('\n')) {
    const m = linie.match(/(\d+)\s*\|\s*(\d+)/)
    if (m) { const idx = parseInt(m[1]) - 1; if (stiri[idx]) stiri[idx].scor = parseInt(m[2]) }
  }
  stiri = stiri.filter(s => s.scor !== undefined)
  stiri.sort((a, b) => b.scor - a.scor)
  console.log('    Top 5 după impact:')
  for (const s of stiri.slice(0, 5)) console.log('      [' + s.scor + '/10] ' + s.titlu.substring(0, 55))
  console.log('')

  const deProiectat = stiri.slice(0, Math.max(MAX_ARTICOLE * 5, 10)) // candidați mai mulți; ne oprim la MAX_ARTICOLE publicate efectiv
  console.log('[3] Încerc până la ' + deProiectat.length + ' candidați, țintă ' + MAX_ARTICOLE + ' articole...\n')

  let publicate = 0
  for (const stire of deProiectat) {
    if (publicate >= MAX_ARTICOLE) break // oprire când am publicat efectiv suficiente, nu doar încercat
    console.log('  → [' + stire.scor + '/10] "' + stire.titlu.substring(0, 50) + '..." (' + stire.sursa + ')')
    const existent = stire.link ? await payload.find({ collection: 'articole', where: { sursaLink: { equals: stire.link } }, limit: 1 }) : { docs: [] as any[] }
    if (existent.docs.length > 0) { console.log('    deja publicat, sar peste'); continue }

    const prompt =
      'Ești jurnalist de business la 844-ai.ro. Scrie un articol ORIGINAL în română despre AI în afaceri, pe baza acestei știri.\n\n' +
      'REGULI: Citate directe DOAR sub 15 cuvinte. Atribuie sursa ("potrivit ' + stire.sursa + '"). ' +
      '100% rescris în cuvintele tale. Ton jurnalistic, analitic. Diacritice corecte. Minim 300 cuvinte.\n\n' +
      'STRUCTURA: <p> paragrafe, <h3> subtitluri.\n\n' +
      'ȘTIRE SURSĂ:\nTitlu: ' + stire.titlu + '\nDescriere: ' + stire.descriere + '\nSursă: ' + stire.sursa + '\n\n' +
      'Răspunde EXACT cu marcajele:\n###TITLU###\n(titlu)\n###EXCERPT###\n(rezumat)\n###CONTINUT###\n(HTML)\n###TAGS###\n(3 taguri, virgulă)\n###END###'

    try {
      const resp = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      const raw = (resp.content[0] as any).text
      const extrage = (a: string, b: string) => { const re = new RegExp('###' + a + '###([\\s\\S]*?)###' + b + '###'); const mm = raw.match(re); return mm ? mm[1].trim() : '' }
      const art = { titlu: extrage('TITLU', 'EXCERPT'), excerpt: extrage('EXCERPT', 'CONTINUT'), continut: extrage('CONTINUT', 'TAGS'), tags: extrage('TAGS', 'END').split(',').map((t: string) => t.trim()).filter(Boolean) }
      if (!art.titlu || !art.continut) { console.log('    Răspuns incomplet, sar peste'); continue }

      const creat = await payload.create({
        collection: 'articole',
        data: {
          titlu: art.titlu, slug: slug(art.titlu), limba: 'ro', pilon: categorieId, tip: 'stire-auto',
          excerpt: (art.excerpt || '').substring(0, 298), continut: htmlToLexical(art.continut),
          sursaNume: stire.sursa, sursaLink: stire.link,
          tags: (art.tags || []).map((t: string) => ({ tag: t })),
          status: 'published', publishedAt: new Date().toISOString(),
          generatAutomat: true, numarConfirmari: 1,
        } as any,
      })
      console.log('    ✓ PUBLICAT în Afaceri (ID ' + creat.id + ')')
      publicate++

      try {
        const tradus = await traduceArticol({ titlu: art.titlu, excerpt: art.excerpt || '', continut: htmlToLexical(art.continut) })
        if (tradus) {
          const creatEn = await payload.create({
            collection: 'articole',
            data: {
              titlu: tradus.titlu, slug: slugEn(tradus.titlu), limba: 'en', pilon: categorieId, tip: 'stire-auto',
              excerpt: (tradus.excerpt || '').substring(0, 298), continut: tradus.continut,
              sursaNume: stire.sursa, sursaLink: stire.link,
              tags: (art.tags || []).map((t: string) => ({ tag: t })),
              status: 'published', publishedAt: new Date().toISOString(),
              generatAutomat: true, numarConfirmari: 1,
              versiuneAlternativa: creat.id,
              metaTitle: (tradus.metaTitle || '').substring(0, 58), metaDescription: (tradus.metaDescription || '').substring(0, 158),
            } as any,
          })
          await payload.update({ collection: 'articole', id: creat.id, data: { versiuneAlternativa: creatEn.id } as any })
          console.log('    ✓ TRADUS (ID ' + creatEn.id + ')')
        }
      } catch (e: any) { console.log('    [Translator] eșuat: ' + e.message) }
    } catch (e: any) {
      console.log('    EROARE: ' + e.message)
    }
  }
  console.log('\n=== GATA: ' + publicate + ' articole Afaceri publicate ===\n')
  process.exit(0)
}
main().catch((err) => { console.error('\nEROARE FATALĂ:', err.message); process.exit(1) })
