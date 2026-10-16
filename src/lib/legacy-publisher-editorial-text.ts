/**
 * Text-only, deterministic normalization for the four scheduled legacy publishers.
 * No network calls, DB access, AI calls, publication, or data migrations.
 */
export const PUBLISHER_EXCERPT_LIMIT = 298
export const PUBLISHER_SEO_TITLE_LIMIT = 58
export const PUBLISHER_SEO_DESCRIPTION_LIMIT = 158

// Common abbreviations and initials do not finish a sentence.
const ABBREVIATIONS = new Set([
  'dr', 'prof', 'conf', 'lect', 'ing', 'dl', 'dna', 'd-na',
  'nr', 'art', 'fig', 'pag', 'str', 'aprox', 'ex', 'vol',
  'etc', 'vs', 'ș.a', 's.a',
])

const DANGLING_TITLE_WORDS = new Set([
  'a', 'al', 'ale', 'ai', 'ca', 'că', 'care', 'către', 'ce',
  'cu', 'de', 'despre', 'din', 'dintre', 'fără', 'în',
  'la', 'o', 'ori', 'pe', 'pentru', 'prin', 'sau',
  'spre', 'sub', 'un', 'unei', 'unui', 'și', 'să',
])

function collapseWhitespace(text: string): string {
  return (text || '').replace(/\s+/gu, ' ').trim()
}

function shortenAtWordBoundary(
  text: string,
  maxLength: number,
  ellipsis: boolean,
): string {
  if (text.length <= maxLength) return text

  const room = maxLength - (ellipsis ? 1 : 0)
  if (room < 1) return ''

  const prefix = text.slice(0, room)
  const end = /\s/u.test(text.charAt(room))
    ? room
    : prefix.lastIndexOf(' ')
  if (end <= 0) return ''

  const fullWords = prefix
    .slice(0, end)
    .trim()
    .replace(/[,;:–—-]+$/gu, '')
    .trim()

  return fullWords ? `${fullWords}${ellipsis ? '…' : ''}` : ''
}

function isAbbreviationPeriod(text: string, index: number): boolean {
  const prior = text.slice(0, index)
  const word = prior.match(/(?:^|\s)([^\s]+)$/u)?.[1]
    ?.replace(/^[('"«„]+/u, '').toLocaleLowerCase('ro') || ''

  return ABBREVIATIONS.has(word) ||
    /^[\p{L}]$/u.test(word) ||
    /^(?:[\p{L}]\.)+[\p{L}]$/u.test(word)
}

/**
 * Prefer a complete sentence; otherwise end on a whole word with an ellipsis.
 * Ignore periods in common abbreviations and initials.
 * Never introduce content not present in the input.
 */
export function normalizePublisherExcerpt(
  value: string,
  maxLength = PUBLISHER_EXCERPT_LIMIT,
): string {
  const text = collapseWhitespace(value)
  if (text.length <= maxLength) return text

  const segment = text.slice(0, maxLength)
  const fullSentences = [...segment.matchAll(/[.!?…][”"'’»)]?(?=\s|$)/gu)]
    .filter(match =>
      !(match[0].startsWith('.') &&
        isAbbreviationPeriod(segment, match.index ?? 0)),
    )
  const usefulSentence = fullSentences
    .filter(match =>
      (match.index ?? 0) + match[0].length >= Math.ceil(maxLength * 0.55),
    )
    .at(-1)

  if (usefulSentence) {
    return segment
      .slice(0, (usefulSentence.index ?? 0) + usefulSentence[0].length)
      .trim()
  }

  return shortenAtWordBoundary(text, maxLength, true)
}

function shortenRomanianSeoTitle(title: string): string {
  if (title.length <= PUBLISHER_SEO_TITLE_LIMIT) return title

  const clipped = shortenAtWordBoundary(
    title,
    PUBLISHER_SEO_TITLE_LIMIT,
    true,
  )
  // No safe word boundary: leave metaTitle empty so Next.js uses the full
  // article title instead of inventing an unsafe SEO fragment.
  if (!clipped) return ''

  let phrase = clipped.slice(0, -1).trim()
  const connectors = [...phrase.matchAll(/\s(?:și|sau|ori)\s/giu)]
  const lastConnector = connectors.at(-1)
  if (
    lastConnector &&
    (lastConnector.index ?? 0) >= Math.ceil(PUBLISHER_SEO_TITLE_LIMIT * 0.45) &&
    phrase.length - (lastConnector.index ?? 0) <= 22
  ) {
    phrase = phrase.slice(0, lastConnector.index).trim()
  }

  const words = phrase.split(' ')
  while (
    words.length &&
    DANGLING_TITLE_WORDS.has(words.at(-1)!.toLocaleLowerCase('ro'))
  ) {
    words.pop()
  }
  phrase = words.join(' ').replace(/[,;:–—-]+$/gu, '').trim()
  return phrase ? `${phrase}…` : ''
}

/**
 * Romanian SEO is derived locally from the RO title and excerpt.
 * No second provider request is required.
 */
export function buildRomanianPublisherSeo(
  title: string,
  excerpt: string,
): { metaTitle: string; metaDescription: string } {
  const cleanTitle = collapseWhitespace(title)
  return {
    metaTitle: shortenRomanianSeoTitle(cleanTitle),
    metaDescription: normalizePublisherExcerpt(
      excerpt,
      PUBLISHER_SEO_DESCRIPTION_LIMIT,
    ),
  }
}
