import {
  expect,
  it,
} from 'vitest'

import {
  buildVerifiedFlashEditorialLexicalContent,
} from '@/lib/flash/editorialContentLexical'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'

import {
  buildFlashAiStagingWriteInput,
} from '@/lib/flash/ingestion/flashAiStagingWriteInput'

it(
  'fails closed when grounded event identity is still pending',
  () => {
    const candidate = {
      sourceId:
        4,
      canonicalUrl:
        'https://example.com/en/news/test',
      sourcePublicationDate:
        '2026-09-17',
    } as FlashNormalizedArticleCandidate

    const readiness = {
      canCreateFlashAiDraft:
        true,

      blockers:
        [],

      sourceGroundedValues: {
        sourceId:
          4,
        canonicalUrl:
          candidate.canonicalUrl,
        sourcePublishedAt:
          candidate.sourcePublicationDate,
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
        buildFlashAiStagingWriteInput({
          candidate,
          readiness,
        }),
    ).toThrow(
      'FlashAI STAGING write input requires grounded event identity.',
    )
  },
)

it(
  'builds the STAGING write input from an eligible grounded persistence readiness',
  () => {
    const canonicalUrl =
      'https://example.com/en/news/grounded-event'

    const eventFingerprint =
      'grounded-event-fingerprint'

    const lexicalContent =
      buildVerifiedFlashEditorialLexicalContent([
        Array.from(
          {
            length:
              500,
          },
          () =>
            'cuvânt',
        ).join(
          ' ',
        ),
      ])

    const candidate = {
      sourceId:
        4,

      canonicalUrl,

      sourcePublicationDate:
        '2026-09-17',
    } as FlashNormalizedArticleCandidate

    const readiness: FlashArticlePersistenceReadiness = {
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

        eventFingerprint,
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
    }

    const result =
      buildFlashAiStagingWriteInput({
        candidate,
        readiness,
      })

    expect(
      result.candidate,
    ).toBe(
      candidate,
    )

    expect(
      result.projection,
    ).toEqual({
      titlu:
        'Titlu editorial verificat',

      limba:
        'ro',

      pilon:
        1,

      flashType:
        'regulation',

      continut:
        lexicalContent,

      surseFlash: [
        {
          sursa:
            4,

          url:
            canonicalUrl,

          sourcePublishedAt:
            '2026-09-17',

          primary:
            true,
        },
      ],

      informationStatus:
        'official',

      riskLevel:
        'medium',

      isHealthRelated:
        false,

      editorialStatus:
        'draft',

      automationDecision:
        'review',

      sourceFingerprint:
        'source-fingerprint',

      eventFingerprint,

      generatAutomat:
        true,

      _status:
        'draft',
    })
  },
)

it(
  'fails closed when candidate URL does not match persistence readiness',
  () => {
    const candidate = {
      sourceId:
        4,

      canonicalUrl:
        'https://example.com/en/news/candidate',

      sourcePublicationDate:
        '2026-09-17',
    } as FlashNormalizedArticleCandidate

    const readiness = {
      sourceGroundedValues: {
        sourceId:
          4,

        canonicalUrl:
          'https://example.com/en/news/other',

        eventFingerprint:
          'grounded-event-fingerprint',
      },

      evidence: {
        finalDedupPending:
          false,
      },
    } as FlashArticlePersistenceReadiness

    expect(
      () =>
        buildFlashAiStagingWriteInput({
          candidate,
          readiness,
        }),
    ).toThrow(
      'FlashAI STAGING write input candidate URL does not match persistence readiness.',
    )
  },
)

it(
  'fails closed when candidate source does not match persistence readiness',
  () => {
    const candidate = {
      sourceId:
        4,

      canonicalUrl:
        'https://example.com/en/news/grounded-event',

      sourcePublicationDate:
        '2026-09-17',
    } as FlashNormalizedArticleCandidate

    const readiness = {
      sourceGroundedValues: {
        sourceId:
          5,

        canonicalUrl:
          candidate.canonicalUrl,

        eventFingerprint:
          'grounded-event-fingerprint',
      },

      evidence: {
        finalDedupPending:
          false,
      },
    } as FlashArticlePersistenceReadiness

    expect(
      () =>
        buildFlashAiStagingWriteInput({
          candidate,
          readiness,
        }),
    ).toThrow(
      'FlashAI STAGING write input candidate source does not match persistence readiness.',
    )
  },
)
