import {
  FLASH_EDITORIAL_MAX_WORDS,
  FLASH_EDITORIAL_MIN_WORDS,
  countFlashEditorialWords,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from './prePersistenceEditorialGenerationSemanticOutput'

export type FlashPrePersistenceEditorialQualityGateReason =
  | 'below_minimum_word_count'
  | 'above_maximum_word_count'
  | 'punctuation_only_paragraph'
  | 'lexical_spacing_defect'

export interface FlashPrePersistenceEditorialQualityGateResult {
  acceptableForPersistenceBridge: boolean
  wordCount: number
  reasons: FlashPrePersistenceEditorialQualityGateReason[]
}

function isPunctuationOnlyParagraph(
  paragraph: string,
): boolean {
  return /^[\p{P}\p{S}\s]+$/u.test(
    paragraph,
  )
}

const KNOWN_CONCATENATED_WORDS = new Set<string>([
  'concentratasupra',
  'monitorizareade',
  'apreciereariscurilor',
  'săia',
  'reuniunedesfășurată',
])

function hasLexicalSpacingDefect(
  value: string,
): boolean {
  const normalized =
    value.normalize(
      'NFC',
    )

  if (
    /(?:\p{Ll}{3,}\.\p{Lu}|[!?]\p{Lu})/u.test(
      normalized,
    )
  ) {
    return true
  }

  return normalized
    .toLowerCase()
    .split(
      /[^\p{L}]+/u,
    )
    .some(
      token =>
        KNOWN_CONCATENATED_WORDS.has(
          token,
        ),
    )
}

/**
 * Deterministic post-QA gate for REG-001T.
 *
 * It does not judge factual truth and does not mutate persistence readiness.
 * Its role is narrower: prevent a reviewed editorial from being bridged into
 * persistence when the canonical 500–1000-word contract is not met or when
 * the model returned an obvious structural fragment such as a punctuation-
 * only paragraph.
 */
export function evaluateFlashPrePersistenceEditorialQualityGate(
  editorial:
    FlashPrePersistenceEditorialGenerationSemanticOutput,
): FlashPrePersistenceEditorialQualityGateResult {
  const wordCount =
    countFlashEditorialWords(
      editorial.editorialParagraphs,
    )

  const reasons =
    new Set<FlashPrePersistenceEditorialQualityGateReason>()

  if (
    wordCount <
    FLASH_EDITORIAL_MIN_WORDS
  ) {
    reasons.add(
      'below_minimum_word_count',
    )
  }

  if (
    wordCount >
    FLASH_EDITORIAL_MAX_WORDS
  ) {
    reasons.add(
      'above_maximum_word_count',
    )
  }

  if (
    editorial.editorialParagraphs.some(
      paragraph =>
        isPunctuationOnlyParagraph(
          paragraph.trim(),
        ),
    )
  ) {
    reasons.add(
      'punctuation_only_paragraph',
    )
  }

  if (
    [
      editorial.editorialTitle,
      ...editorial.editorialParagraphs,
    ].some(
      value =>
        hasLexicalSpacingDefect(
          value,
        ),
    )
  ) {
    reasons.add(
      'lexical_spacing_defect',
    )
  }

  return {
    acceptableForPersistenceBridge:
      reasons.size === 0,
    wordCount,
    reasons: [
      ...reasons,
    ],
  }
}
