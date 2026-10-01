import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildVerifiedFlashEditorialLexicalContent,
} from '@/lib/flash/editorialContentLexical'
import type {
  FlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'
import {
  projectFlashAiDraftFromPersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidateFlashAiDraftProjection'

describe(
  'FlashAI draft projection',
  () => {
    it(
      'projects an eligible verified readiness into a safe Romanian FlashAI draft',
      () => {
        const lexicalContent =
          buildVerifiedFlashEditorialLexicalContent([
            Array.from(
              { length: 500 },
              () => 'cuvânt',
            ).join(' '),
          ])

        const readiness:
          FlashArticlePersistenceReadiness = {
            canCreateFlashAiDraft: true,

            targetLanguage: 'ro',

            verifiedEditorial: {
              editorialTitle:
                'Titlu editorial verificat',
              lexicalContent,
            },

            sourceGroundedValues: {
              sourceId: 4,
              sourceName:
                'Comisia Europeană',
              language: 'en',
              sourceTitle:
                'Original English title',
              canonicalUrl:
                'https://example.com/source',
              sourcePublishedAt:
                '2026-08-03',
              sourceFingerprint:
                'source-fingerprint',
              eventFingerprint: null,
            },

            classification: {
              pilonId: 1,
              flashType: 'regulation',
              informationStatus: 'official',
              riskLevel: 'medium',
              isHealthRelated: false,
            },

            draftControls: {
              editorialStatus: 'draft',
              automationDecision: 'review',
              payloadStatus: 'draft',
            },

            deferredDecisions: [],
            blockers: [],

            reviewSignals: [
              'event_identity_pending',
            ],

            evidence: {
              sourceVerificationPassed: true,
              sourceDuplicateFound: false,
              eventFingerprintDuplicateFound:
                false,
              sourceFingerprintReviewSignal:
                false,
              titleReviewSignal: false,
              finalDedupPending: true,
              classificationAvailable: true,
            },
          }

        const result =
          projectFlashAiDraftFromPersistenceReadiness(
            readiness,
          )

        expect(result).toEqual({
          titlu:
            'Titlu editorial verificat',
          limba: 'ro',
          pilon: 1,
          flashType: 'regulation',
          continut: lexicalContent,

          surseFlash: [
            {
              sursa: 4,
              url:
                'https://example.com/source',
              sourcePublishedAt:
                '2026-08-03',
              primary: true,
            },
          ],

          informationStatus: 'official',
          riskLevel: 'medium',
          isHealthRelated: false,

          editorialStatus: 'draft',
          automationDecision: 'review',

          sourceFingerprint:
            'source-fingerprint',
          eventFingerprint: null,

          generatAutomat: true,
          _status: 'draft',
        })

        expect(result.continut)
          .toBe(lexicalContent)

        expect('slug' in result)
          .toBe(false)
      },
    )

    it(
      'fails closed when persistence readiness is not eligible',
      () => {
        expect(
          () =>
            projectFlashAiDraftFromPersistenceReadiness({
              canCreateFlashAiDraft: false,
              blockers: [],
            } as unknown as FlashArticlePersistenceReadiness),
        ).toThrow(
          'FlashAI draft projection requires eligible persistence readiness.',
        )
      },
    )

    it(
      'fails closed when blockers remain',
      () => {
        expect(
          () =>
            projectFlashAiDraftFromPersistenceReadiness({
              canCreateFlashAiDraft: true,
              blockers: [
                'classification_required',
              ],
            } as unknown as FlashArticlePersistenceReadiness),
        ).toThrow(
          'FlashAI draft projection requires eligible persistence readiness.',
        )
      },
    )

    it(
      'fails closed when verified editorial is missing',
      () => {
        expect(
          () =>
            projectFlashAiDraftFromPersistenceReadiness({
              canCreateFlashAiDraft: true,
              blockers: [],
              verifiedEditorial: null,
            } as unknown as FlashArticlePersistenceReadiness),
        ).toThrow(
          'FlashAI draft projection requires verified editorial content.',
        )
      },
    )

    it(
      'fails closed when validated classification is missing',
      () => {
        expect(
          () =>
            projectFlashAiDraftFromPersistenceReadiness({
              canCreateFlashAiDraft: true,
              blockers: [],
              verifiedEditorial: {
                editorialTitle: 'Titlu verificat',
                lexicalContent: {} as never,
              },
              classification: null,
            } as unknown as FlashArticlePersistenceReadiness),
        ).toThrow(
          'FlashAI draft projection requires validated classification.',
        )
      },
    )

    it(
      'fails closed when draft controls are not safe',
      () => {
        expect(
          () =>
            projectFlashAiDraftFromPersistenceReadiness({
              canCreateFlashAiDraft: true,
              blockers: [],
              verifiedEditorial: {
                editorialTitle:
                  'Titlu verificat',
                lexicalContent: {} as never,
              },
              classification: {} as never,
              draftControls: {
                editorialStatus: 'draft',
                automationDecision:
                  'autoPublish',
                payloadStatus: 'draft',
              },
            } as unknown as FlashArticlePersistenceReadiness),
        ).toThrow(
          'FlashAI draft projection requires safe draft controls.',
        )
      },
    )

  },
)
