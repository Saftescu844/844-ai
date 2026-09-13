import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export const FLASH_EDITORIAL_MIN_WORDS =
  400

export const FLASH_EDITORIAL_MAX_WORDS =
  1000

export const FLASH_EDITORIAL_MAX_TITLE_LENGTH =
  200

export interface FlashPrePersistenceEditorialGenerationSemanticOutput {
  language: 'ro'
  editorialTitle: string
  editorialParagraphs: string[]
}

type UnknownRecord =
  Record<string, unknown>

function invalidOutput(): never {
  throw new FlashSemanticEvidenceProducerError(
    'invalid_output',
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

function hasOnlyKeys(
  record: UnknownRecord,
  allowedKeys: readonly string[],
): boolean {
  const allowed =
    new Set(allowedKeys)

  return Object
    .keys(record)
    .every(
      key => allowed.has(key),
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
 * It intentionally does not:
 * - repair JSON;
 * - accept markdown fences;
 * - accept extra fields or free-form rationale;
 * - generate or infer classification;
 * - decide AUTO / REVIEW / BLOCK;
 * - convert the text into Payload Lexical rich text;
 * - write to Payload.
 */
export function parseFlashPrePersistenceEditorialGenerationSemanticOutput(
  raw: string,
): FlashPrePersistenceEditorialGenerationSemanticOutput {
  let parsed: unknown

  try {
    parsed =
      JSON.parse(raw)
  } catch {
    invalidOutput()
  }

  const root =
    asRecord(parsed)

  if (
    !root ||
    !hasOnlyKeys(
      root,
      [
        'language',
        'editorialTitle',
        'editorialParagraphs',
      ],
    )
  ) {
    invalidOutput()
  }

  if (root.language !== 'ro') {
    invalidOutput()
  }

  if (
    typeof root.editorialTitle !== 'string'
  ) {
    invalidOutput()
  }

  const editorialTitle =
    root.editorialTitle
      .trim()

  if (
    !editorialTitle ||
    editorialTitle.length >
      FLASH_EDITORIAL_MAX_TITLE_LENGTH
  ) {
    invalidOutput()
  }

  if (
    !Array.isArray(
      root.editorialParagraphs,
    ) ||
    root.editorialParagraphs.length ===
      0
  ) {
    invalidOutput()
  }

  const editorialParagraphs =
    root.editorialParagraphs.map(
      paragraph => {
        if (
          typeof paragraph !==
          'string'
        ) {
          invalidOutput()
        }

        const normalized =
          paragraph.trim()

        if (!normalized) {
          invalidOutput()
        }

        return normalized
      },
    )

  const wordCount =
    countFlashEditorialWords(
      editorialParagraphs,
    )

  if (
    wordCount <
      FLASH_EDITORIAL_MIN_WORDS ||
    wordCount >
      FLASH_EDITORIAL_MAX_WORDS
  ) {
    invalidOutput()
  }

  return {
    language: 'ro',
    editorialTitle,
    editorialParagraphs,
  }
}
