/**
 * Excerpt from already-verified editorial text (no model call or new facts).
 */
export const FLASH_AI_EXCERPT_MIN_CHARS = 180
export const FLASH_AI_EXCERPT_MAX_CHARS = 300

export function buildFlashAiExcerptFromVerifiedParagraphs(
  paragraphs: readonly string[],
): string {
  const text = paragraphs
    .map(paragraph =>
      paragraph.replace(/\s+/gu, ' ').trim(),
    )
    .filter(Boolean)
    .join(' ')

  if (text.length < FLASH_AI_EXCERPT_MIN_CHARS) {
    throw new Error(
      'FlashAI verified editorial is too short to produce an excerpt.',
    )
  }

  if (text.length <= FLASH_AI_EXCERPT_MAX_CHARS) {
    return text
  }

  const prefix = text.slice(0, FLASH_AI_EXCERPT_MAX_CHARS)
  const sentences = prefix.matchAll(/[.!?](?=\s|$)/gu)
  for (const sentence of sentences) {
    const end = (sentence.index ?? -1) + 1
    if (end >= FLASH_AI_EXCERPT_MIN_CHARS) {
      return prefix.slice(0, end)
    }
  }

  // If no sentence fits, truncate at a whole-word boundary.
  const lastSpace = prefix.lastIndexOf(
    ' ',
    FLASH_AI_EXCERPT_MAX_CHARS - 2,
  )
  if (lastSpace < FLASH_AI_EXCERPT_MIN_CHARS) {
    throw new Error(
      'FlashAI verified editorial has no safe excerpt word boundary.',
    )
  }

  const truncated = prefix
    .slice(0, lastSpace)
    .replace(/[,:;]+$/u, '')
    .trimEnd()

  if (truncated.length < FLASH_AI_EXCERPT_MIN_CHARS) {
    throw new Error(
      'FlashAI verified editorial cannot produce a valid excerpt.',
    )
  }

  return `${truncated}…`
}
