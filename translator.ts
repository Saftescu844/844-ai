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
}, retryCount = 0): Promise<TraducereRezultat | null> {
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
      model: 'claude-sonnet-5',
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    })
    // Anthropic may return several text content blocks; discard thinking/tool blocks.
    // Diagnostics below report only schema/usage, never model output or article text.
    const textParts = resp.content.filter((block) => block.type === 'text')
    const raw = textParts.map((block) => block.text).join('\n')
    const missingMarkers = ['TITLU', 'EXCERPT', 'CONTINUT', 'END']
      .filter((marker) => !raw.includes('###' + marker + '###'))
    const outputTokens = resp.usage?.output_tokens ?? null
    const report = (reason: string, actualBlocks: number | null = null) => {
      console.log('    [Translator] Safe diagnostic: ' + JSON.stringify({
        attempt: retryCount + 1,
        reason,
        stopReason: resp.stop_reason ?? 'unknown',
        outputTokens,
        textParts: textParts.length,
        expectedTextBlocks: blocuriText.length,
        actualTextBlocks: actualBlocks,
        missingMarkers,
        optionalSeo: {
          metaTitle: raw.includes('###METATITLE###'),
          metaDescription: raw.includes('###METADESC###'),
        },
      }))
    }

    const extrage = (a: string, b: string) => {
      const re = new RegExp('###' + a + '###([\\s\\S]*?)###' + b + '###')
      const mm = raw.match(re)
      return mm ? mm[1].trim() : ''
    }

    const titlu = extrage('TITLU', 'EXCERPT')
    const excerpt = extrage('EXCERPT', 'CONTINUT')
    // SEO metadata is optional: complete article content may end directly at END.
    // Never use end-of-string as a boundary, since that might accept a truncated answer.
    const continutRaw = raw.match(/###CONTINUT###([\s\S]*?)(?=###(?:METATITLE|METADESC|END)###)/)?.[1]?.trim() || ''
    const metaTitle = extrage('METATITLE', 'METADESC') || extrage('METATITLE', 'END')
    const metaDescription = extrage('METADESC', 'END')

    if (!['end_turn', 'stop_sequence'].includes(resp.stop_reason ?? '')
      || missingMarkers.length > 0 || !titlu || !excerpt || !continutRaw) {
      report('missing_sections_or_truncated_response')
      return retryCount === 0 ? traduceArticol(articolRo, 1) : null
    }

    // Strictly reject malformed, duplicate or missing numbered text blocks.
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
      report('no_valid_text_blocks', 0)
      return retryCount === 0 ? traduceArticol(articolRo, 1) : null
    }
    const expectedIndexes = blocuriText.map((_, i) => i)
    const actualIndexes = Object.keys(textTradusPeIndex).map(Number)
    const rawIndexes = [...continutRaw.matchAll(/^\[(\d+)\|([HP])\]/gm)].map((m) => Number(m[1]))
    const complete = actualIndexes.length === expectedIndexes.length
      && rawIndexes.length === expectedIndexes.length
      && expectedIndexes.every((i) => {
        const original = blocuriText[i]
        const translated = textTradusPeIndex[i]
        return translated && translated.tip === (original.tip === 'heading' ? 'heading' : 'paragraph')
      })
    if (!complete) {
      report('missing_duplicate_or_mistyped_blocks', rawIndexes.length)
      return retryCount === 0 ? traduceArticol(articolRo, 1) : null
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
      console.log('    [Translator] Conținut invalid' + (retryCount === 0 ? ', reîncerc o dată' : ', traducerea necesită recuperare'))
      return retryCount === 0 ? traduceArticol(articolRo, 1) : null
    }
    // Nu salva o traducere cu paragrafe lipsă, duplicate sau tipuri schimbate.
    const expectedIndexes = blocuriText.map((_, i) => i)
    const actualIndexes = Object.keys(textTradusPeIndex).map(Number)
    const rawIndexes = [...continutRaw.matchAll(/^\[(\d+)\|([HP])\]/gm)].map((m) => Number(m[1]))
    const complete = actualIndexes.length === expectedIndexes.length
      && rawIndexes.length === expectedIndexes.length
      && expectedIndexes.every((i) => {
        const original = blocuriText[i]
        const translated = textTradusPeIndex[i]
        return translated && translated.tip === (original.tip === 'heading' ? 'heading' : 'paragraph')
      })
    if (!complete) {
      console.log('    [Translator] Blocuri lipsă/duplicate' + (retryCount === 0 ? ', reîncerc o dată' : ', traducerea necesită recuperare'))
      return retryCount === 0 ? traduceArticol(articolRo, 1) : null
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
  } catch (e: unknown) {
    // Provider errors can include request metadata. Never print their raw messages.
    const type = e instanceof Error && /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(e.name)
      ? e.name : 'OtherError'
    console.log('    [Translator] Safe diagnostic: ' + JSON.stringify({
      attempt: retryCount + 1, reason: 'provider_or_runtime_error', errorType: type,
    }))
    return retryCount === 0 ? traduceArticol(articolRo, 1) : null
  }
}

// slug pentru EN
export function slugEn(titlu: string): string {
  return titlu.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 70).replace(/-$/, '') + '-en-' + Date.now().toString(36)
}
