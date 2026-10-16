/**
 * Text-only, deterministic normalization for the four scheduled legacy publishers.
 * No network calls, DB access, AI calls, publication, or data migrations.
 */
export const PUBLISHER_EXCERPT_LIMIT = 298
export const PUBLISHER_SEO_TITLE_LIMIT = 58
export const PUBLISHER_SEO_DESCRIPTION_LIMIT = 158

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
  const isEndOfWord =
    /\s/u.test(text.charAt(room)) ||
    /\s/u.test(prefix.charAt(prefix.length - 1))
  const end = isEndOfWord ? room : prefix.lastIndexOf(' ')
  if (end <= 0) return ''

  const fullWords = prefix
    .slice(0, end)
    .trim()
    .replace(/[,;:–—-]+$/gu, '')
    .trim()

  return fullWords ? `${fullWords}${ellipsis ? '…' : ''}` : ''
}

/**
 * Prefer a complete sentence; otherwise end on a whole word with an ellipsis.
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
    metaTitle:
      shortenAtWordBoundary(
        cleanTitle,
        PUBLISHER_SEO_TITLE_LIMIT,
        false,
      ) || cleanTitle.slice(0, PUBLISHER_SEO_TITLE_LIMIT),
    metaDescription: normalizePublisherExcerpt(
      excerpt,
      PUBLISHER_SEO_DESCRIPTION_LIMIT,
    ),
  }
}
