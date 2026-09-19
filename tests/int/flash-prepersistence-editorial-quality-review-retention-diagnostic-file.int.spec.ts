import { mkdtemp, readFile, rm } from 'node:fs/promises'

import { tmpdir } from 'node:os'

import { join } from 'node:path'

import { expect, it } from 'vitest'

import type { FlashNormalizedArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'

import { writeFlashPrePersistenceEditorialQualityReviewRetentionDiagnosticOnce } from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewRetentionDiagnosticFile'

it('writes one validated QA retention diagnostic artifact and refuses overwrite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flash-qa-retention-'))

  const outputPath = join(directory, 'diagnostic.json')

  const candidate = {
    sourceId: 4,
    sourceName: 'Comisia Europeană',
    canonicalUrl: 'https://example.test/en/news/article',
    title: 'Source title',
    sourcePublicationDate: '2026-09-19',
  } as FlashNormalizedArticleCandidate

  const originalEditorial = {
    language: 'ro' as const,
    editorialTitle: 'Titlu inițial',
    editorialParagraphs: ['Text original validat.', 'Al doilea paragraf original.'],
  }

  const review = {
    language: 'ro' as const,
    editorialTitle: 'Titlu revizuit',
    paragraphEdits: [
      {
        paragraphIndex: 0,
        replacement: 'Text revizuit.',
      },
    ],
  }

  const reviewedEditorial = {
    language: 'ro' as const,
    editorialTitle: 'Titlu revizuit',
    editorialParagraphs: ['Text revizuit.', 'Al doilea paragraf original.'],
  }

  const input = {
    outputPath,
    candidate,
    sourceFingerprint: 'source-fingerprint',
    eventFingerprint: 'event-fingerprint',
    qualityReviewRun: {
      stage: 'prePersistenceEditorialQualityReview' as const,
      method: 'model' as const,
      runId: 'qa-run',
      provider: 'openai',
      model: 'test-model',
    },
    diagnostics: {
      originalWordCount: 6,
      reviewedWordCount: 5,
      minimumRetainedWordCount: 500,
      paragraphCount: 2,
      editedParagraphCount: 1,
    },
    originalEditorial,
    review,
    reviewedEditorial,
  }

  try {
    await writeFlashPrePersistenceEditorialQualityReviewRetentionDiagnosticOnce(input)

    const raw = await readFile(outputPath, 'utf8')

    const parsed = JSON.parse(raw) as Record<string, unknown>

    expect(parsed).toMatchObject({
      schemaVersion: 1,
      code: 'editorial_quality_review_retention_floor_breach',
      disposition: 'fail_closed',
      sourceMaterialSufficiency: 'undetermined',
      providerReason: 'invalid_output_quality_review_retention',
      article: {
        sourceId: 4,
        sourceFingerprint: 'source-fingerprint',
        eventFingerprint: 'event-fingerprint',
      },
      diagnostics: {
        minimumRetainedWordCount: 500,
      },
      originalEditorial: {
        editorialTitle: 'Titlu inițial',
      },
      review: {
        editorialTitle: 'Titlu revizuit',
      },
      reviewedEditorial: {
        editorialTitle: 'Titlu revizuit',
      },
    })

    expect(Object.prototype.hasOwnProperty.call(parsed, 'raw')).toBe(false)

    expect(Object.prototype.hasOwnProperty.call(parsed, 'rawProviderOutput')).toBe(false)

    await expect(
      writeFlashPrePersistenceEditorialQualityReviewRetentionDiagnosticOnce(input),
    ).rejects.toMatchObject({
      code: 'EEXIST',
    })
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
