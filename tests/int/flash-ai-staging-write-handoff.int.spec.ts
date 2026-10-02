import {
  expect,
  it,
} from 'vitest'

import {
  buildFlashAiStagingWriteInputFromHandoffValue,
} from '@/lib/flash/ingestion/flashAiStagingWriteHandoff'

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
  buildFlashAiStagingWriteInput,
} from '@/lib/flash/ingestion/flashAiStagingWriteInput'

it(
  'rejects a legacy handoff that supplies a prebuilt projection',
  () => {
    expect(
      () =>
        buildFlashAiStagingWriteInputFromHandoffValue({
          candidate: {
            sourceId:
              4,

            canonicalUrl:
              'https://example.com/en/news/grounded-event',

            sourcePublicationDate:
              '2026-09-17',
          },

          projection: {
            eventFingerprint:
              'manually-supplied-fingerprint',
          },
        }),
    ).toThrow(
      'FlashAI STAGING write handoff does not accept a prebuilt projection.',
    )
  },
)

it(
  'derives the STAGING write input deterministically from candidate and persistence readiness',
  () => {
    const canonicalUrl =
      'https://example.com/en/news/grounded-event'

    const lexicalContent =
      buildVerifiedFlashEditorialLexicalContent([
        'Conținut editorial verificat pentru testul handoff-ului determinist.',
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

    const expected =
      buildFlashAiStagingWriteInput({
        candidate,
        readiness,
      })

    const actual =
      buildFlashAiStagingWriteInputFromHandoffValue({
        candidate,
        readiness,
      })

    expect(
      actual,
    ).toEqual(
      expected,
    )

    expect(
      actual.projection.eventFingerprint,
    ).toBe(
      'event-fingerprint',
    )
  },
)

it(
  'fails closed when persistence readiness is missing',
  () => {
    expect(
      () =>
        buildFlashAiStagingWriteInputFromHandoffValue({
          candidate: {
            sourceId:
              4,

            canonicalUrl:
              'https://example.com/en/news/grounded-event',

            sourcePublicationDate:
              '2026-09-17',
          },
        }),
    ).toThrow(
      'FlashAI STAGING write handoff requires persistence readiness.',
    )
  },
)
