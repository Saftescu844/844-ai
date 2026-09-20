import {
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'

import {
  buildVerifiedFlashEditorialLexicalContent,
} from '@/lib/flash/editorialContentLexical'

import {
  buildFlashAiStagingHandoffArtifact,
} from '@/lib/flash/ingestion/flashAiStagingHandoffArtifact'

it(
  'builds a projection-free artifact only from a persistence-ready grounded candidate',
  () => {
    const canonicalUrl =
      'https://example.com/en/news/grounded-event'

    const lexicalContent =
      buildVerifiedFlashEditorialLexicalContent([
        'Conținut editorial verificat pentru handoff-ul STAGING.',
      ])

    const candidate = {
      sourceId:
        4,

      canonicalUrl,

      sourcePublicationDate:
        '2026-09-17',
    } as FlashNormalizedArticleCandidate

    const readiness = {
      canCreateFlashAiDraft:
        true,

      verifiedEditorial: {
        editorialTitle:
          'Titlu editorial verificat',

        lexicalContent,
      },

      sourceGroundedValues: {
        sourceId:
          4,

        sourceName:
          'Comisia Europeană',

        language:
          'en',

        sourceTitle:
          'Original English title',

        canonicalUrl,

        sourcePublishedAt:
          '2026-09-17',

        sourceFingerprint:
          'source-fingerprint',

        eventFingerprint:
          'event-fingerprint',
      },

      classification: {
        pilonId:
          1,

        flashType:
          'regulation',

        informationStatus:
          'official',

        riskLevel:
          'medium',

        isHealthRelated:
          false,
      },

      draftControls: {
        editorialStatus:
          'draft',

        automationDecision:
          'review',

        payloadStatus:
          'draft',
      },

      deferredDecisions:
        [],

      blockers:
        [],

      reviewSignals:
        [],

      evidence: {
        sourceVerificationPassed:
          true,

        sourceDuplicateFound:
          false,

        eventFingerprintDuplicateFound:
          false,

        sourceFingerprintReviewSignal:
          false,

        titleReviewSignal:
          false,

        finalDedupPending:
          false,

        classificationAvailable:
          true,
      },
    } as FlashArticlePersistenceReadiness

    const artifact =
      buildFlashAiStagingHandoffArtifact({
        candidate,
        readiness,
      })

    expect(
      artifact,
    ).toEqual({
      targetLanguage:
        'ro',
      candidate,
      readiness,
    })

    expect(
      Object.prototype.hasOwnProperty.call(
        artifact,
        'projection',
      ),
    ).toBe(
      false,
    )
  },
)

it(
  'fails closed when grounded event identity is pending',
  () => {
    const candidate = {
      sourceId:
        4,

      canonicalUrl:
        'https://example.com/en/news/pending-event',
    } as FlashNormalizedArticleCandidate

    const readiness = {
      sourceGroundedValues: {
        eventFingerprint:
          null,
      },

      evidence: {
        finalDedupPending:
          true,
      },
    } as FlashArticlePersistenceReadiness

    expect(
      () =>
        buildFlashAiStagingHandoffArtifact({
          candidate,
          readiness,
        }),
    ).toThrow(
      'FlashAI STAGING write input requires grounded event identity.',
    )
  },
)
