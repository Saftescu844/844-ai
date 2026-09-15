import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export const FLASH_EDITORIAL_MIN_WORDS =
  500

export const FLASH_EDITORIAL_MAX_WORDS =
  1000

export const FLASH_EDITORIAL_MAX_TITLE_LENGTH =
  200

export interface FlashPrePersistenceEditorialGenerationSemanticOutput {
  language: 'ro'
  editorialTitle: string
  editorialParagraphs: string[]
}

export interface FlashEditorialSemanticOutputParseOptions {
  /**
   * Generation remains strict by default. A bounded downstream QA stage may
   * disable only the word-count gate so the corrected source-faithful text can
   * be inspected and its publication-length eligibility reported separately.
   */
  enforceWordCount?: boolean
}

type UnknownRecord =
  Record<string, unknown>

function invalidOutput(
  reason:
    | 'invalid_output_json'
    | 'invalid_output_shape'
    | 'invalid_output_language'
    | 'invalid_output_title'
    | 'invalid_output_paragraphs',
): never {
  throw new FlashSemanticEvidenceProducerError(
    reason,
  )
}

function asRecord(
  value: unknown,
): UnknownRecord | null {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as UnknownRecord
}

function hasExactKeys(
  record: UnknownRecord,
  requiredKeys: readonly string[],
): boolean {
  const keys =
    Object.keys(record)

  if (
    keys.length !==
    requiredKeys.length
  ) {
    return false
  }

  const required =
    new Set(requiredKeys)

  return keys.every(
    key => required.has(key),
  )
}

function containsEditorialLetter(
  value: string,
): boolean {
  return /[A-Za-zĂÂÎȘȚăâîșț]/u.test(
    value,
  )
}

export function countFlashEditorialWords(
  paragraphs: readonly string[],
): number {
  return paragraphs
    .join(' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .length
}

/**
 * Strict parser for the REG-001T Romanian editorial generation contract.
 *
 * Generation callers use the default strict 500–1000-word gate. A bounded
 * editorial QA caller may explicitly disable only that gate so fidelity
 * corrections are not forced to invent or pad content merely to satisfy the
 * publication-length target. The caller must then report length eligibility
 * separately and must not treat an out-of-range QA result as persistence-ready.
 *
 * It intentionally does not:
 * - repair JSON;
 * - accept markdown fences;
 * - accept extra or missing fields;
 * - generate or infer classification;
 * - decide AUTO / REVIEW / BLOCK;
 * - convert the text into Payload Lexical rich text;
 * - write to Payload.
 *
 * Failure reasons are deliberately specific enough for safe live diagnosis,
 * without returning or persisting the invalid provider payload.
 */
export function parseFlashPrePersistenceEditorialGenerationSemanticOutput(
  raw: string,
  options: FlashEditorialSemanticOutputParseOptions = {},
): FlashPrePersistenceEditorialGenerationSemanticOutput {
  let parsed: unknown

  try {
    parsed =
      JSON.parse(raw)
  } catch {
    invalidOutput(
      'invalid_output_json',
    )
  }

  const root =
    asRecord(parsed)

  if (
    !root ||
    !hasExactKeys(
      root,
      [
        'language',
        'editorialTitle',
        'editorialParagraphs',
      ],
    )
  ) {
    invalidOutput(
      'invalid_output_shape',
    )
  }

  if (root.language !== 'ro') {
    invalidOutput(
      'invalid_output_language',
    )
  }

  if (
    typeof root.editorialTitle !== 'string'
  ) {
    invalidOutput(
      'invalid_output_title',
    )
  }

  const editorialTitle =
    root.editorialTitle
      .trim()

  if (
    !editorialTitle ||
    editorialTitle.length >
      FLASH_EDITORIAL_MAX_TITLE_LENGTH
  ) {
    invalidOutput(
      'invalid_output_title',
    )
  }

  if (
    !Array.isArray(
      root.editorialParagraphs,
    ) ||
    root.editorialParagraphs.length ===
      0
  ) {
    invalidOutput(
      'invalid_output_paragraphs',
    )
  }

  const editorialParagraphs =
    root.editorialParagraphs.map(
      paragraph => {
        if (
          typeof paragraph !==
          'string'
        ) {
          invalidOutput(
            'invalid_output_paragraphs',
          )
        }

        const normalized =
          paragraph.trim()

        if (
          !normalized ||
          !containsEditorialLetter(
            normalized,
          )
        ) {
          invalidOutput(
            'invalid_output_paragraphs',
          )
        }

        return normalized
      },
    )

  const wordCount =
    countFlashEditorialWords(
      editorialParagraphs,
    )

  const enforceWordCount =
    options.enforceWordCount !==
      false

  if (
    enforceWordCount &&
    wordCount <
      FLASH_EDITORIAL_MIN_WORDS
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output_too_short',
    )
  }

  if (
    enforceWordCount &&
    wordCount >
      FLASH_EDITORIAL_MAX_WORDS
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output_too_long',
    )
  }

  return {
    language: 'ro',
    editorialTitle,
    editorialParagraphs,
  }
}
