/**
 * Read-only suggestions from existing published/draft Lexical paragraphs.
 * These are NOT approved editorial excerpts; a human must verify,
 * rewrite if necessary, and save through Payload Admin separately.
 * No automatic write or model request is permitted.
 */
export type FlashExcerptProposal = {
  candidate: string | null
  reason: 'editorial_review_required' | 'manual_excerpt_required'
}

export function proposeFlashExcerptFromLexical(
  content: unknown,
): FlashExcerptProposal {
  if (!content || typeof content !== 'object') {
    return { candidate: null, reason: 'manual_excerpt_required' }
  }

  const root = (content as { root?: unknown }).root
  if (!root || typeof root !== 'object') {
    return { candidate: null, reason: 'manual_excerpt_required' }
  }

  const children = (root as { children?: unknown }).children
  if (!Array.isArray(children)) {
    return { candidate: null, reason: 'manual_excerpt_required' }
  }

  // The first paragraph is only an editorial starting point, not a summary.
  const firstParagraph = children.find(
    node => node && typeof node === 'object' &&
      (node as { type?: unknown }).type === 'paragraph',
  ) as { children?: unknown } | undefined

  if (!firstParagraph || !Array.isArray(firstParagraph.children)) {
    return { candidate: null, reason: 'manual_excerpt_required' }
  }

  const text = firstParagraph.children.map(node =>
    node && typeof node === 'object' &&
      typeof (node as { text?: unknown }).text === 'string'
      ? (node as { text: string }).text
      : '',
  ).join('').replace(/\s+/gu, ' ').trim()

  if (text.length >= 120 && text.length <= 300) {
    return { candidate: text, reason: 'editorial_review_required' }
  }

  // For a long lead, propose only complete, source-existing sentences.
  // If that is impossible, require an editor to write the excerpt.
  if (text.length > 300) {
    const sentences = text.match(/[^.!?]+[.!?](?=\s|$)/gu) ?? []
    let candidate = ''
    for (const sentence of sentences) {
      const next = [candidate, sentence.trim()].filter(Boolean).join(' ')
      if (next.length > 300) break
      candidate = next
      if (candidate.length >= 180) break
    }
    if (candidate.length >= 120) {
      return { candidate, reason: 'editorial_review_required' }
    }
  }

  return { candidate: null, reason: 'manual_excerpt_required' }
}
