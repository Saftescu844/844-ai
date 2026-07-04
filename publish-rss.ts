import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import Anthropic from '@anthropic-ai/sdk'
import Parser from 'rss-parser'
import { traduceArticol, slugEn } from './translator'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const parser = new Parser({ timeout: 15000 })

const FEEDS = [
  { nume: 'Google Research', url: 'https://research.google/blog/rss/' },
  { nume: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { nume: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { nume: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/' },
  { nume: 'Tech.eu', url: 'https://tech.eu/feed/' },
  { nume: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { nume: 'MIT News AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2' },
  { nume: 'MIT Tech Review Biotech', url: 'https://www.technologyreview.com/topic/biotechnology/feed' },
  { nume: 'AI News Health', url: 'https://www.artificialintelligence-news.com/feed/' },
]

const KEYWORDS = ['artificial intelligence', ' ai ', 'a.i.', 'machine learning', 'gpt', 'llm', 'large language model', 'language model', 'neural network', 'openai', 'anthropic', 'deepmind', 'gemini', 'claude', 'chatbot', 'generative ai', 'genai', 'inteligen', 'agentic', 'foundation model']
const EXCLUDE = ['gta', 'playstation', 'xbox', 'nintendo', 'iphone', 'gaming console', 'video game', 'movie', 'trailer', 'netflix', 'spotify']

const MAX_ARTICOLE = 2

// maparea pilon (număr 1-5) → slug categorie
const PILON_SLUG: Record<string, string> = {
  '1': 'stiri', '2': 'sanatate', '3': 'educatie', '4': 'tools', '5': 'afaceri',
}

function esteRelevant(text: string): boolean {
  const t = ' ' + (text || '').toLowerCase() + ' '
  if (EXCLUDE.some(k => t.includes(k))) return false
  return KEYWORDS.some(k => t.includes(k))
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
  console.log('\n=== PUBLISHER RSS 844-ai.ro (cu clasificare + scor) ===\n')
  const payload = await getPayload({ config })

  // mapăm slug-urile pilonilor la ID-urile din baza de date
  const categoriiDb = await payload.find({ collection: 'categorii', limit: 20 })
  const catIdDupaSlug: Record<string, any> = {}
  for (const c of categoriiDb.docs as any[]) catIdDupaSlug[c.slug] = c.id
  if (!catIdDupaSlug['stiri']) { console.error('Lipsesc categoriile. Creează-le în admin.'); process.exit(1) }

  // ── 1. Citește feed-urile ──
  console.log('[1] Citesc feed-urile RSS...')
  let stiri: any[] = []
  for (const feed of FEEDS) {
    try {
      const rezultat = await parser.parseURL(feed.url)
      const items = (rezultat.items || []).slice(0, 10)
      for (const item of items) {
        const titlu = item.title || ''
        const descriere = (item.contentSnippet || item.content || '').substring(0, 400)
        if (esteRelevant(titlu + ' ' + descriere)) {
          stiri.push({ sursa: feed.nume, titlu, descriere, link: item.link || '', data: item.pubDate })
        }
      }
      console.log('    ' + feed.nume + ': ' + items.length + ' items')
    } catch (e: any) {
      console.log('    ' + feed.nume + ': EROARE (' + e.message.substring(0, 40) + ') — sar peste')
    }
  }
  console.log('    Total știri relevante AI: ' + stiri.length + '\n')
  if (stiri.length === 0) { console.log('Nicio știre relevantă. Stop.'); process.exit(0) }

  // ── 2. Triere: un singur apel Claude clasifică TOATE știrile (pilon + scor) ──
  console.log('[2] Clasific și evaluez impactul (1 apel Claude)...')
  const lista = stiri.slice(0, 50).map((s, i) => (i + 1) + '. [' + s.sursa + '] ' + s.titlu).join('\n')
  const promptTriere =
    'Ești editor la o platformă AI românească. Pentru fiecare știre din listă, atribuie:\n' +
    '- PILON: 1=Știri AI generale, 2=Sănătate/medicină AI, 3=Educație AI, 4=Tool-uri/produse AI, 5=Afaceri/productivitate AI\n' +
    '- SCOR de impact 1-10 (10=lansare majoră de model, breakthrough; 1=funding mărunt, anunț minor)\n' +
    '- SUBCATEGORIE: DOAR dacă PILON=2 (Sănătate), alege una: diagnostic (imagistică, radiologie, detecție boli), medicamente (drug discovery, farma), asistenta-clinica (suport medici, documentație), reglementare (legi, FDA, etică), pacienti (aplicații pentru public). Dacă PILON nu e 2, lasă gol.\n\n' +
    'Răspunde DOAR cu linii în formatul: NUMAR|PILON|SCOR|SUBCATEGORIE (ex: 1|4|7| sau 3|2|8|diagnostic)\n' +
    'Fără alt text.\n\nȘTIRI:\n' + lista

  const respTriere = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 800, messages: [{ role: 'user', content: promptTriere }] })
  const rawTriere = (respTriere.content[0] as any).text
  for (const linie of rawTriere.split('\n')) {
    const m = linie.match(/(\d+)\s*\|\s*(\d)\s*\|\s*(\d+)\s*\|?\s*([a-z-]*)/)
    if (m) {
      const idx = parseInt(m[1]) - 1
      if (stiri[idx]) { stiri[idx].pilon = m[2]; stiri[idx].scor = parseInt(m[3]); stiri[idx].subcategorie = (m[4] || '').trim() }
    }
  }
  stiri = stiri.filter(s => s.scor !== undefined)
  stiri.sort((a, b) => b.scor - a.scor)
  console.log('    Clasificate: ' + stiri.length + ' știri')
  console.log('    Top 5 după impact:')
  for (const s of stiri.slice(0, 5)) console.log('      [' + s.scor + '/10, pilon ' + s.pilon + '] ' + s.titlu.substring(0, 55))
  console.log('')

  const deProiectat = stiri.slice(0, MAX_ARTICOLE)
  console.log('[3] Generez ' + deProiectat.length + ' articole (cele mai relevante)...\n')

  // ── 3. Generează + publică ──
  let publicate = 0
  for (const stire of deProiectat) {
    const pilonSlug = PILON_SLUG[stire.pilon] || 'stiri'
    const categorieId = catIdDupaSlug[pilonSlug] || catIdDupaSlug['stiri']
    console.log('  → [' + stire.scor + '/10, ' + pilonSlug + '] "' + stire.titlu.substring(0, 50) + '..." (' + stire.sursa + ')')

    const existent = stire.link ? await payload.find({ collection: 'articole', where: { sursaLink: { equals: stire.link } }, limit: 1 }) : { docs: [] as any[] }
    if (existent.docs.length > 0) { console.log('    deja publicat, sar peste'); continue }

    const prompt =
      'Ești jurnalist la 844-ai.ro. Scrie un articol ORIGINAL în română despre această știre AI.\n\n' +
      'REGULI: Citate directe DOAR sub 15 cuvinte. Atribuie sursa ("potrivit ' + stire.sursa + '"). ' +
      '100% rescris în cuvintele tale, NU copia. Diacritice corecte. Minim 300 cuvinte. Ton jurnalistic neutru.\n\n' +
      'STRUCTURA: <p> paragrafe, <h3> subtitluri.\n\n' +
      'ȘTIRE SURSĂ:\nTitlu: ' + stire.titlu + '\nDescriere: ' + stire.descriere + '\nSursă: ' + stire.sursa + '\n\n' +
      'Răspunde EXACT în acest format, cu marcajele exact așa (fără JSON):\n' +
      '###TITLU###\n(titlul aici)\n###EXCERPT###\n(rezumat scurt)\n###CONTINUT###\n(articolul HTML)\n###TAGS###\n(3 taguri separate prin virgulă)\n###END###'

    try {
      const resp = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      const raw = (resp.content[0] as any).text
      const extrage = (a: string, b: string) => {
        const re = new RegExp('###' + a + '###([\\s\\S]*?)###' + b + '###')
        const mm = raw.match(re); return mm ? mm[1].trim() : ''
      }
      const art = {
        titlu: extrage('TITLU', 'EXCERPT'), excerpt: extrage('EXCERPT', 'CONTINUT'),
        continut: extrage('CONTINUT', 'TAGS'),
        tags: extrage('TAGS', 'END').split(',').map((t: string) => t.trim()).filter(Boolean),
      }
      if (!art.titlu || !art.continut) { console.log('    Răspuns incomplet, sar peste'); continue }

      const creat = await payload.create({
        collection: 'articole',
        data: {
          titlu: art.titlu, slug: slug(art.titlu), limba: 'ro', pilon: categorieId, tip: 'stire-auto',
          excerpt: art.excerpt || '', continut: htmlToLexical(art.continut),
          sursaNume: stire.sursa, sursaLink: stire.link,
          tags: (art.tags || []).map((t: string) => ({ tag: t })),
          status: 'published', publishedAt: new Date().toISOString(),
          generatAutomat: true, numarConfirmari: 1,
          ...(stire.subcategorie ? { subcategorie: stire.subcategorie } : {}),
        } as any,
      })
      console.log('    ✓ PUBLICAT în "' + pilonSlug + '" (ID ' + creat.id + ')')
      publicate++

      // ── TRADUCERE AUTOMATĂ RO → EN ──
      try {
        console.log('    [Translator] Traduc în engleză...')
        const tradus = await traduceArticol({ titlu: art.titlu, excerpt: art.excerpt || '', continut: htmlToLexical(art.continut) })
        if (tradus) {
          const creatEn = await payload.create({
            collection: 'articole',
            data: {
              titlu: tradus.titlu, slug: slugEn(tradus.titlu), limba: 'en', pilon: categorieId, tip: 'stire-auto',
              excerpt: tradus.excerpt, continut: tradus.continut,
              sursaNume: stire.sursa, sursaLink: stire.link,
              tags: (art.tags || []).map((t: string) => ({ tag: t })),
              status: 'published', publishedAt: new Date().toISOString(),
              generatAutomat: true, numarConfirmari: 1,
              ...(stire.subcategorie ? { subcategorie: stire.subcategorie } : {}),
              versiuneAlternativa: creat.id,
              metaTitle: tradus.metaTitle, metaDescription: tradus.metaDescription,
            } as any,
          })
          // legăm reciproc RO → EN
          await payload.update({ collection: 'articole', id: creat.id, data: { versiuneAlternativa: creatEn.id } as any })
          console.log('    ✓ TRADUS în engleză (ID ' + creatEn.id + '), legat reciproc')
        }
      } catch (e: any) {
        console.log('    [Translator] Traducerea a eșuat (RO rămâne publicat): ' + e.message)
      }
    } catch (e: any) {
      console.log('    EROARE: ' + e.message)
    }
  }

  console.log('\n=== GATA: ' + publicate + ' articole publicate ===\n')
  process.exit(0)
}

main().catch((err) => { console.error('\nEROARE FATALĂ:', err.message); process.exit(1) })
