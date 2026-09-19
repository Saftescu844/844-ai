import {
  FLASH_EDITORIAL_MAX_TITLE_LENGTH,
  FLASH_EDITORIAL_MIN_WORDS,
  countFlashEditorialWords,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from './prePersistenceEditorialGenerationSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export const FLASH_QA_MIN_RETAINED_WORD_RATIO =
  0.85

export interface FlashPrePersistenceEditorialQualityReviewParagraphEdit {
  paragraphIndex: number
  replacement: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticOutput {
  language: 'ro'
  editorialTitle: string
  paragraphEdits:
    FlashPrePersistenceEditorialQualityReviewParagraphEdit[]
}

export interface FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics {
  originalWordCount: number
  reviewedWordCount: number
  minimumRetainedWordCount: number
  paragraphCount: number
  editedParagraphCount: number
}

export class FlashPrePersistenceEditorialQualityReviewRetentionError
  extends FlashSemanticEvidenceProducerError {
  readonly diagnostics:
    FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics

  readonly review:
    FlashPrePersistenceEditorialQualityReviewSemanticOutput

  readonly reviewedEditorial:
    FlashPrePersistenceEditorialGenerationSemanticOutput

  constructor({
    diagnostics,
    review,
    reviewedEditorial,
  }: {
    diagnostics:
      FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics
    review:
      FlashPrePersistenceEditorialQualityReviewSemanticOutput
    reviewedEditorial:
      FlashPrePersistenceEditorialGenerationSemanticOutput
  }) {
    super(
      'invalid_output_quality_review_retention',
    )

    this.name =
      'FlashPrePersistenceEditorialQualityReviewRetentionError'

    this.diagnostics =
      diagnostics

    this.review =
      review

    this.reviewedEditorial =
      reviewedEditorial
  }
}

type UnknownRecord =
  Record<string, unknown>

function fail(
  reason:
    | 'invalid_output_json'
    | 'invalid_output_shape'
    | 'invalid_output_language'
    | 'invalid_output_title'
    | 'invalid_output_paragraphs'
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

function containsLetter(
  value: string,
): boolean {
  return /[A-Za-zĂÂÎȘȚăâîșț]/u.test(
    value,
  )
}

export function parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
  raw: string,
): FlashPrePersistenceEditorialQualityReviewSemanticOutput {
  let parsed: unknown

  try {
    parsed =
      JSON.parse(raw)
  } catch {
    fail(
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
        'paragraphEdits',
      ],
    )
  ) {
    fail(
      'invalid_output_shape',
    )
  }

  if (root.language !== 'ro') {
    fail(
      'invalid_output_language',
    )
  }

  if (
    typeof root.editorialTitle !==
    'string'
  ) {
    fail(
      'invalid_output_title',
    )
  }

  const editorialTitle =
    root.editorialTitle.trim()

  if (
    !editorialTitle ||
    editorialTitle.length >
      FLASH_EDITORIAL_MAX_TITLE_LENGTH
  ) {
    fail(
      'invalid_output_title',
    )
  }

  if (
    !Array.isArray(
      root.paragraphEdits,
    )
  ) {
    fail(
      'invalid_output_paragraphs',
    )
  }

  const seenIndexes =
    new Set<number>()

  const paragraphEdits =
    root.paragraphEdits.map(
      value => {
        const edit =
          asRecord(value)

        if (
          !edit ||
          !hasExactKeys(
            edit,
            [
              'paragraphIndex',
              'replacement',
            ],
          )
        ) {
          fail(
            'invalid_output_paragraphs',
          )
        }

        if (
          !Number.isInteger(
            edit.paragraphIndex,
          ) ||
          (
            edit.paragraphIndex as number
          ) < 0
        ) {
          fail(
            'invalid_output_paragraphs',
          )
        }

        const paragraphIndex =
          edit.paragraphIndex as number

        if (
          seenIndexes.has(
            paragraphIndex,
          )
        ) {
          fail(
            'invalid_output_paragraphs',
          )
        }

        if (
          typeof edit.replacement !==
          'string'
        ) {
          fail(
            'invalid_output_paragraphs',
          )
        }

        const replacement =
          edit.replacement.trim()

        if (
          !replacement ||
          !containsLetter(
            replacement,
          )
        ) {
          fail(
            'invalid_output_paragraphs',
          )
        }

        seenIndexes.add(
          paragraphIndex,
        )

        return {
          paragraphIndex,
          replacement,
        }
      },
    )

  return {
    language: 'ro',
    editorialTitle,
    paragraphEdits,
  }
}

export function applyFlashPrePersistenceEditorialQualityReviewCopyEdit({
  editorial,
  review,
}: {
  editorial:
    FlashPrePersistenceEditorialGenerationSemanticOutput
  review:
    FlashPrePersistenceEditorialQualityReviewSemanticOutput
}): FlashPrePersistenceEditorialGenerationSemanticOutput {
  const editorialParagraphs =
    [
      ...editorial.editorialParagraphs,
    ]

  for (
    const edit
    of review.paragraphEdits
  ) {
    if (
      edit.paragraphIndex >=
      editorialParagraphs.length
    ) {
      fail(
        'invalid_output_paragraphs',
      )
    }

    editorialParagraphs[
      edit.paragraphIndex
    ] =
      edit.replacement
  }

  const originalWordCount =
    countFlashEditorialWords(
      editorial.editorialParagraphs,
    )

  const reviewedWordCount =
    countFlashEditorialWords(
      editorialParagraphs,
    )

  const minimumRetainedWordCount =
    Math.max(
      FLASH_EDITORIAL_MIN_WORDS,
      Math.floor(
        originalWordCount *
          FLASH_QA_MIN_RETAINED_WORD_RATIO,
      ),
    )

  const reviewedEditorial:
    FlashPrePersistenceEditorialGenerationSemanticOutput = {
      language: 'ro',
      editorialTitle:
        review.editorialTitle,
      editorialParagraphs,
    }

  if (
    reviewedWordCount <
    minimumRetainedWordCount
  ) {
    throw new FlashPrePersistenceEditorialQualityReviewRetentionError({
      diagnostics: {
        originalWordCount,
        reviewedWordCount,
        minimumRetainedWordCount,
        paragraphCount:
          editorial.editorialParagraphs.length,
        editedParagraphCount:
          review.paragraphEdits.length,
      },
      review,
      reviewedEditorial,
    })
  }

  return reviewedEditorial
}
