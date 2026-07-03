import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// extrage textul din nodurile Lexical (pentru traducere)
function lexicalToBlocks(continut: any): { tip: string; tag?: string; text: string; raw?: any }[] {
  const blocks: { tip: string; tag?: string; text: string; raw?: any }[] = []
  if (!continut?.root?.children) return blocks
  for (const node of continut.root.children) {
    if (node.type === 'upload') {
      // păstrăm nodul upload (imagine) neatins, fără traducere
      blocks.push({ tip: 'upload', text: '', raw: node })
      continue
    }
    const text = (node.children || []).map((c: any) => c.text || '').join('')
    if (!text.trim()) continue
    blocks.push({ tip: node.type, tag: node.tag, text })
  }
  return blocks
}

// reconstruiește Lexical din blocuri traduse
function blocksToLexical(blocks: { tip: string; tag?: string; text: string; raw?: any }[]) {
  const root: any = { type: 'root', format: '', indent: 0, version: 1, children: [] }
  for (const b of blocks) {
    if (b.tip === 'upload' && b.raw) {
      root.children.push(b.raw)
    } else if (b.tip === 'heading') {
      root.children.push({ type: 'heading', tag: b.tag || 'h3', format: '', indent: 0, version: 1, children: [{ type: 'text', text: b.text, format: 0, version: 1 }] })
    } else {
      root.children.push({ type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: b.text, format: 0, version: 1 }] })
    }
  }
  if (root.children.length === 0) root.children.push({ type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: '', format: 0, version: 1 }] })
  return { root }
}

export interface TraducereRezultat {
  titlu: string
  excerpt: string
  continut: any
  metaTitle: string
  metaDescription: string
}

// Traduce un articol RO → EN. Returnează null dacă eșuează (nu strică RO).
export async function traduceArticol(articolRo: {
  titlu: string
  excerpt: string
  continut: any
}): Promise<TraducereRezultat | null> {
  try {
    const blocsToti = lexicalToBlocks(articolRo.continut)
    // separăm blocurile de TEXT (trimise la Claude) de nodurile upload (păstrate neschimbate)
    // uploadDupa[i] = lista de noduri upload care trebuie inserate DUPĂ blocul de text cu indexul i (înainte de traducere)
    const blocuriText: { tip: string; tag?: string; text: string }[] = []
    const uploadDupa: Record<number, any[]> = {}
    for (const b of blocsToti) {
      if (b.tip === 'upload') {
        const idx = blocuriText.length - 1 // se leagă de ultimul bloc de text procesat până acum
        ;(uploadDupa[idx] = uploadDupa[idx] || []).push(b.raw)
      } else {
        blocuriText.push(b)
      }
    }
    // numerotăm DOAR blocurile de text ca să le trimitem la Claude
    const continutNumerotat = blocuriText.map((b, i) => '[' + i + '|' + (b.tip === 'heading' ? 'H' : 'P') + '] ' + b.text).join('\n\n')

    const prompt =
      'You are a professional translator and editor for an international AI news platform. ' +
      'Translate the following Romanian article into natural, fluent, professional English suitable for a GLOBAL audience ' +
      '(engineers, students, doctors, patients, teachers, general public — all ages). ' +
      'The English edition is a standalone publication of equal quality to the original, NOT a literal word-for-word translation.\n\n' +
      'RULES:\n' +
      '- Write English that reads as if originally written by a native English journalist.\n' +
      '- Keep the SAME meaning and facts. Do not add or remove information.\n' +
      '- Keep proper nouns, company names, product names unchanged (OpenAI, Anthropic, etc.).\n' +
      '- Preserve attributions ("potrivit Reuters" → "according to Reuters").\n' +
      '- Keep the EXACT block structure. Each block is marked [N|H] (heading) or [N|P] (paragraph).\n\n' +
      'Respond using EXACTLY these markers (no JSON):\n' +
      '###TITLU###\n(translated title)\n###EXCERPT###\n(translated short summary)\n###CONTINUT###\n' +
      '(translated blocks, each on its own line, keeping the [N|H] or [N|P] marker exactly)\n' +
      '###METATITLE###\n(SEO title, max 60 chars)\n###METADESC###\n(SEO description, max 155 chars)\n###END###\n\n' +
      'ROMANIAN ARTICLE:\n' +
      'TITLU: ' + articolRo.titlu + '\n' +
      'EXCERPT: ' + articolRo.excerpt + '\n' +
      'CONTINUT:\n' + continutNumerotat

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (resp.content[0] as any).text

    const extrage = (a: string, b: string) => {
      const re = new RegExp('###' + a + '###([\\s\\S]*?)###' + b + '###')
      const mm = raw.match(re)
      return mm ? mm[1].trim() : ''
    }

    const titlu = extrage('TITLU', 'EXCERPT')
    const excerpt = extrage('EXCERPT', 'CONTINUT')
    const continutRaw = extrage('CONTINUT', 'METATITLE')
    const metaTitle = extrage('METATITLE', 'METADESC')
    const metaDescription = extrage('METADESC', 'END')

    if (!titlu || !continutRaw) {
      console.log('    [Translator] Răspuns incomplet, traducerea sare peste')
      return null
    }

    // reasamblăm blocurile de TEXT traduse, apoi reintroducem upload-urile la poziția corectă
    const textTradusPeIndex: Record<number, { tip: string; tag?: string; text: string }> = {}
    for (const linie of continutRaw.split('\n')) {
      const m = linie.match(/^\[(\d+)\|([HP])\]\s*(.*)$/)
      if (m) {
        const text = m[3].trim()
        if (!text) continue
        textTradusPeIndex[parseInt(m[1])] = { tip: m[2] === 'H' ? 'heading' : 'paragraph', tag: m[2] === 'H' ? 'h3' : undefined, text }
      }
    }
    if (Object.keys(textTradusPeIndex).length === 0) {
      console.log('    [Translator] Nu am putut reasambla conținutul, sar peste')
      return null
    }
    const blocuriFinale: { tip: string; tag?: string; text: string; raw?: any }[] = []
    if (uploadDupa[-1]) for (const raw of uploadDupa[-1]) blocuriFinale.push({ tip: 'upload', text: '', raw })
    for (let i = 0; i < blocuriText.length; i++) {
      if (textTradusPeIndex[i]) blocuriFinale.push(textTradusPeIndex[i])
      if (uploadDupa[i]) for (const raw of uploadDupa[i]) blocuriFinale.push({ tip: 'upload', text: '', raw })
    }

    return {
      titlu,
      excerpt,
      continut: blocksToLexical(blocuriFinale),
      metaTitle: metaTitle || titlu,
      metaDescription: metaDescription || excerpt,
    }
  } catch (e: any) {
    console.log('    [Translator] Eroare: ' + e.message)
    return null
  }
}

// slug pentru EN
export function slugEn(titlu: string): string {
  return titlu.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 70).replace(/-$/, '') + '-en-' + Date.now().toString(36)
}
