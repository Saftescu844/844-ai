import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

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
  buildFlashAiStagingHandoffArtifact,
} from '@/lib/flash/ingestion/flashAiStagingHandoffArtifact'

import {
  buildFlashAiStagingWriteInputFromHandoffValue,
} from '@/lib/flash/ingestion/flashAiStagingWriteHandoff'

import {
  createFlashAiDraftWithFinalDedupGuard,
  type FlashAiFinalDedupWriterPayload,
} from '@/lib/flash/ingestion/payloadFlashAiFinalDedupWriter'

const canonicalUrl =
  'https://example.com/en/news/u14-8d-event'

const eventFingerprint =
  'u14-8d-grounded-event'

const sourceFingerprint =
  'u14-8d-source-fingerprint'

function candidate():
  FlashNormalizedArticleCandidate {
  return {
    sourceId:
      4,

    sourceName:
      'European Commission — Digital Strategy / AI',

    sourceRole:
      'primary',

    editorialTrust:
      'high',

    citationMode:
      'paraphrase',

    allowAutoPublish:
      false,

    language:
      'en',

    finalUrl:
      canonicalUrl,

    canonicalUrl,

    title:
      'Verified English source event',

    contentType:
      'News article',

    sourcePublicationDateRaw:
      '20 September 2026',

    sourcePublicationDate:
      '2026-09-20',

    lead:
      'Verified English source lead.',

    bodyParagraphs: [
      'Verified English source body.',
    ],

    bodyText:
      'Verified English source body.',
  }
}

function readiness():
  FlashArticlePersistenceReadiness {
  const lexicalContent =
    buildVerifiedFlashEditorialLexicalContent([
      Array.from(
        {
          length:
            500,
        },
        (
          _,
          index,
        ) =>
          `english${String(
            index + 1,
          )}`,
      ).join(
        ' ',
      ),
    ])

  return {
    canCreateFlashAiDraft:
      true,

    targetLanguage:
      'en',

    verifiedEditorial: {
      editorialTitle:
        'Verified English Flash editorial',

      lexicalContent,
    },

    sourceGroundedValues: {
      sourceId:
        4,

      sourceName:
        'European Commission — Digital Strategy / AI',

      language:
        'en',

      sourceTitle:
        'Verified English source event',

      canonicalUrl,

      sourcePublishedAt:
        '2026-09-20',

      sourceFingerprint,

      eventFingerprint,
    },

    classification: {
      pilonId:
        1,

      flashType:
        'announcement',

      informationStatus:
        'official',

      riskLevel:
        'low',

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
}

describe(
  'Flash U14.8D controlled EN staging write',
  () => {
    it(
      'carries explicit EN intent through handoff, final dedup, and draft create',
      async () => {
        const normalizedCandidate =
          candidate()

        const persistenceReadiness =
          readiness()

        const artifact =
          buildFlashAiStagingHandoffArtifact({
            candidate:
              normalizedCandidate,

            readiness:
              persistenceReadiness,
          })

        expect(
          artifact.targetLanguage,
        ).toBe(
          'en',
        )

        expect(
          Object.prototype.hasOwnProperty.call(
            artifact,
            'projection',
          ),
        ).toBe(
          false,
        )

        const writeInput =
          buildFlashAiStagingWriteInputFromHandoffValue(
            artifact,
          )

        expect(
          writeInput.projection.limba,
        ).toBe(
          'en',
        )

        const find =
          vi.fn().mockResolvedValue({
            docs:
              [],

            totalDocs:
              0,
          })

        const create =
          vi.fn().mockResolvedValue({
            id:
              91,
          } as FlashAi)

        const payload = {
          find,
          create,
        } as unknown as
          FlashAiFinalDedupWriterPayload

        await createFlashAiDraftWithFinalDedupGuard({
          payload,

          candidate:
            writeInput.candidate,

          projection:
            writeInput.projection,
        })

        expect(
          find,
        ).toHaveBeenCalledTimes(
          4,
        )

        expect(
          find,
        ).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            where: {
              and: [
                {
                  'surseFlash.url': {
                    equals:
                      canonicalUrl,
                  },
                },
                {
                  limba: {
                    equals:
                      'en',
                  },
                },
              ],
            },
          }),
        )

        expect(
          find,
        ).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            where: {
              and: [
                {
                  eventFingerprint: {
                    equals:
                      eventFingerprint,
                  },
                },
                {
                  limba: {
                    equals:
                      'en',
                  },
                },
              ],
            },
          }),
        )

        expect(
          find,
        ).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            where: {
              and: [
                {
                  sourceFingerprint: {
                    equals:
                      sourceFingerprint,
                  },
                },
                {
                  limba: {
                    equals:
                      'en',
                  },
                },
              ],
            },
          }),
        )

        expect(
          find,
        ).toHaveBeenNthCalledWith(
          4,
          expect.objectContaining({
            where: {
              limba: {
                equals:
                  'en',
              },
            },
          }),
        )

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          create,
        ).toHaveBeenCalledWith({
          collection:
            'flash-ai',

          data:
            expect.objectContaining({
              limba:
                'en',

              eventFingerprint,

              sourceFingerprint,

              editorialStatus:
                'draft',

              automationDecision:
                'review',

              _status:
                'draft',
            }),

          draft:
            true,

          overrideAccess:
            true,
        })
      },
    )

    it(
      'blocks an EN handoff when explicit EN intent is missing',
      () => {
        const artifact =
          buildFlashAiStagingHandoffArtifact({
            candidate:
              candidate(),

            readiness:
              readiness(),
          })

        expect(
          () =>
            buildFlashAiStagingWriteInputFromHandoffValue({
              candidate:
                artifact.candidate,

              readiness:
                artifact.readiness,
            }),
        ).toThrow(
          'FlashAI STAGING EN write handoff requires explicit targetLanguage "en".',
        )
      },
    )

    it(
      'blocks a handoff whose explicit language conflicts with persistence readiness',
      () => {
        const artifact =
          buildFlashAiStagingHandoffArtifact({
            candidate:
              candidate(),

            readiness:
              readiness(),
          })

        expect(
          () =>
            buildFlashAiStagingWriteInputFromHandoffValue({
              ...artifact,

              targetLanguage:
                'ro',
            }),
        ).toThrow(
          'FlashAI STAGING write handoff target language does not match persistence readiness.',
        )
      },
    )
  },
)
