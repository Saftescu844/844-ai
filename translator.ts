import Anthropic from '@anthropic-ai/sdk'
import { prepareLexicalTranslation } from './src/lib/lexical-translation'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface TraducereRezultat {
  titlu: string
  excerpt: string
  continut: any
  metaTitle: string
  metaDescription: string
  galerie?: { imagine: any; caption?: string | null; credit?: string | null }[] | null
  videoTitlu?: string | null
  tags?: { tag?: string | null }[] | null
}

/**
 * A model refusal is an editorial handoff, not a malformed completion.
 * Callers must not silently retry or treat this as a transient API error.
 */
export class TranslationRequiresEditorialReviewError extends Error {
  constructor() {
    super('EDITORIAL_INTERVENTION_REQUIRED: provider refused translation; manual editorial review required; no retry')
    this.name = 'TranslationRequiresEditorialReviewError'
  }
}

// Traduce un articol RO → EN. Returnează null dacă eșuează (nu strică RO).
export async function traduceArticol(articolRo: {
  titlu: string
  excerpt: string
  continut: any
  galerie?: { imagine: any; caption?: string | null; credit?: string | null }[] | null
  videoTitlu?: string | null
  tags?: { tag?: string | null }[] | null
}, retryCount = 0): Promise<TraducereRezultat | null> {
  try {
    const prepared = prepareLexicalTranslation(articolRo.continut, { galerie: articolRo.galerie, videoTitlu: articolRo.videoTitlu, tags: articolRo.tags })
    const blocuriText = prepared.units
    const continutNumerotat = blocuriText.map((b, i) => '[' + i + '|' + (b.tip === 'heading' ? 'H' : 'P') + '] ' + b.text.replace(/\r?\n/g, ' ')).join('\n\n')

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
      '- Each numbered segment is a text fragment, possibly inside a formatted sentence or table cell. Use surrounding segments for context.\n' +
      '- Keep EXACTLY one output line for each [N|H] or [N|P] segment. Do not merge segments or output unnumbered text.\n' +
      '- Preserve leading and trailing spaces in each translated fragment to keep inline words separated.\n\n' +
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
    // Explicit provider refusals must never be retried, even if a partial response exists.
    // Emit only fixed categories and counts, not the article or provider output.
    if (resp.stop_reason === 'refusal') {
      console.log('    [Translator] Safe diagnostic: ' + JSON.stringify({
        attempt: retryCount + 1,
        reason: 'provider_refusal',
        stopReason: 'refusal',
        outputTokens: resp.usage?.output_tokens ?? null,
        retry: false,
        action: 'EDITORIAL_INTERVENTION_REQUIRED',
      }))
      throw new TranslationRequiresEditorialReviewError()
    }
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

    // Keep the original separators around inline fragments (bold, links, etc.).
    for (const [i, original] of blocuriText.entries()) {
      textTradusPeIndex[i].text = (original.text.match(/^\s*/)?.[0] || '')
        + textTradusPeIndex[i].text + (original.text.match(/\s*$/)?.[0] || '')
    }

    return {
      titlu,
      excerpt,
      continut: prepared.apply(textTradusPeIndex),
      ...prepared.metadata,
      metaTitle: metaTitle || titlu,
      metaDescription: metaDescription || excerpt,
    }
  } catch (e: unknown) {
    // Refusals are terminal, classified editorial events, never technical retries.
    if (e instanceof TranslationRequiresEditorialReviewError) throw e
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
