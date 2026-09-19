import { writeFile } from 'node:fs/promises'

import type { FlashNormalizedArticleCandidate } from '../ingestion/articleCandidateNormalization'

import type { FlashPrePersistenceEditorialGenerationSemanticOutput } from './prePersistenceEditorialGenerationSemanticOutput'

import type { FlashPrePersistenceEditorialQualityReviewRunMetadata } from './prePersistenceEditorialQualityReviewSemanticProducer'

import type {
  FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics,
  FlashPrePersistenceEditorialQualityReviewSemanticOutput,
} from './prePersistenceEditorialQualityReviewSemanticOutput'

export interface FlashPrePersistenceEditorialQualityReviewRetentionDiagnosticArtifact {
  schemaVersion: 1

  code: 'editorial_quality_review_retention_floor_breach'

  disposition: 'fail_closed'

  sourceMaterialSufficiency: 'undetermined'

  providerReason: 'invalid_output_quality_review_retention'

  article: {
    sourceId: number
    sourceName: string
    canonicalUrl: string
    sourceTitle: string
    sourcePublicationDate: string
    sourceFingerprint: string
    eventFingerprint: string | null
  }

  qualityReviewRun: FlashPrePersistenceEditorialQualityReviewRunMetadata

  diagnostics: FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics

  originalEditorial: FlashPrePersistenceEditorialGenerationSemanticOutput

  review: FlashPrePersistenceEditorialQualityReviewSemanticOutput

  reviewedEditorial: FlashPrePersistenceEditorialGenerationSemanticOutput
}

/**
 * Writes one local-only diagnostic snapshot for a QA retention-floor breach.
 *
 * The caller supplies only parsed/validated semantic material. Raw provider
 * output is intentionally not accepted by this contract.
 *
 * This function does not create Payload documents, mutate persistence
 * readiness, queue jobs, or publish anything. Existing files are never
 * overwritten.
 */
export async function writeFlashPrePersistenceEditorialQualityReviewRetentionDiagnosticOnce({
  outputPath,
  candidate,
  sourceFingerprint,
  eventFingerprint,
  qualityReviewRun,
  diagnostics,
  originalEditorial,
  review,
  reviewedEditorial,
}: {
  outputPath: string

  candidate: FlashNormalizedArticleCandidate

  sourceFingerprint: string
  eventFingerprint: string | null

  qualityReviewRun: FlashPrePersistenceEditorialQualityReviewRunMetadata

  diagnostics: FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics

  originalEditorial: FlashPrePersistenceEditorialGenerationSemanticOutput

  review: FlashPrePersistenceEditorialQualityReviewSemanticOutput

  reviewedEditorial: FlashPrePersistenceEditorialGenerationSemanticOutput
}): Promise<void> {
  const artifact: FlashPrePersistenceEditorialQualityReviewRetentionDiagnosticArtifact = {
    schemaVersion: 1,

    code: 'editorial_quality_review_retention_floor_breach',

    disposition: 'fail_closed',

    sourceMaterialSufficiency: 'undetermined',

    providerReason: 'invalid_output_quality_review_retention',

    article: {
      sourceId: candidate.sourceId,
      sourceName: candidate.sourceName,
      canonicalUrl: candidate.canonicalUrl,
      sourceTitle: candidate.title,
      sourcePublicationDate: candidate.sourcePublicationDate,
      sourceFingerprint,
      eventFingerprint,
    },

    qualityReviewRun: {
      ...qualityReviewRun,
    },

    diagnostics: {
      ...diagnostics,
    },

    originalEditorial: {
      ...originalEditorial,
      editorialParagraphs: [...originalEditorial.editorialParagraphs],
    },

    review: {
      ...review,
      paragraphEdits: review.paragraphEdits.map((edit) => ({
        ...edit,
      })),
    },

    reviewedEditorial: {
      ...reviewedEditorial,
      editorialParagraphs: [...reviewedEditorial.editorialParagraphs],
    },
  }

  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
}
