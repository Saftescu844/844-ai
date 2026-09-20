import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildVerifiedFlashEditorialLexicalContent,
} from '@/lib/flash/editorialContentLexical'

import {
  evaluateFlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'
import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import type {
  FlashPrePersistenceDedupEvidence,
} from '@/lib/flash/ingestion/articleCandidatePrePersistenceDedup'
import type {
  FlashSourceVerificationEvidence,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'

const sourceFingerprint =
  '084f1199b4915a604c578316b8a4ef6fd15097952ef38a97be960e1771a663a0'

const validatedClassification = {
  pilonId: 1,
  flashType: 'regulation' as const,
  informationStatus: 'official' as const,
  riskLevel: 'medium' as const,
  isHealthRelated: false,
}

function candidate(
  overrides:
    Partial<FlashNormalizedArticleCandidate> = {},
): FlashNormalizedArticleCandidate {
  return {
    sourceId: 4,
    sourceName:
      'Comisia Europeană — Digital Strategy / AI',
    sourceRole: 'primary',
    editorialTrust: 'high',
    citationMode: 'paraphrase',
    allowAutoPublish: false,
    language: 'en',
    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    title:
      'Fourth GPAI Signatory Taskforce meeting',
    contentType: 'NEWS ARTICLE',
    sourcePublicationDateRaw:
      '03 August 2026',
    sourcePublicationDate:
      '2026-08-03',
    lead:
      'Controlled lead.',
    bodyParagraphs: [
      'Controlled body.',
    ],
    bodyText:
      'Controlled body.',
    ...overrides,
  }
}

function sourceVerification(
  passed = true,
): FlashSourceVerificationEvidence {
  return {
    sourceVerificationPassed:
      passed,
    evaluatedSources: [],
  }
}

function dedup(
  overrides:
    Partial<FlashPrePersistenceDedupEvidence> = {},
): FlashPrePersistenceDedupEvidence {
  return {
    candidateCanonicalUrl:
      candidate().canonicalUrl,
    sourceDuplicateFound: false,
    eventFingerprintDuplicateFound: false,
    sourceFingerprintReviewSignal: false,
    titleReviewSignal: false,
    finalDedupPending: true,
    reasons: [
      'missing_event_fingerprint',
    ],
    matches: [],
    ...overrides,
  }
}

describe(
  'Flash article persistence readiness',
  () => {
    it(
      'keeps the pre-classification candidate read-only and exposes only source-grounded values',
      () => {
        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(),
            dedup: dedup(),
            sourceFingerprint,
            eventFingerprint: null,
          })

        expect(result).toEqual({
          canCreateFlashAiDraft: false,
          targetLanguage: 'ro',
          verifiedEditorial: null,
          sourceGroundedValues: {
            sourceId: 4,
            sourceName:
              'Comisia Europeană — Digital Strategy / AI',
            language: 'en',
            sourceTitle:
              'Fourth GPAI Signatory Taskforce meeting',
            canonicalUrl:
              candidate().canonicalUrl,
            sourcePublishedAt:
              '2026-08-03',
            sourceFingerprint,
            eventFingerprint: null,
          },
          classification: null,
          draftControls: {
            editorialStatus: 'draft',
            automationDecision: 'review',
            payloadStatus: 'draft',
          },
          deferredDecisions: [
            'editorial_title',
            'pilon',
            'flash_type',
            'information_status',
            'risk_level',
            'health_classification',
            'editorial_content',
          ],
          blockers: [
            'generated_flash_content_required',
            'classification_required',
          ],
          reviewSignals: [
            'event_identity_pending',
          ],
          evidence: {
            sourceVerificationPassed: true,
            sourceDuplicateFound: false,
            eventFingerprintDuplicateFound: false,
            sourceFingerprintReviewSignal: false,
            titleReviewSignal: false,
            finalDedupPending: true,
            classificationAvailable: false,
          },
        })
      },
    )

    it(
      'consumes validated classification while keeping generated editorial content as a blocker',
      () => {
        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(),
            dedup: dedup(),
            sourceFingerprint,
            eventFingerprint: null,
            validatedClassification,
          })

        expect(result.classification)
          .toEqual(
            validatedClassification,
          )

        expect(result.deferredDecisions)
          .toEqual([
            'editorial_title',
            'editorial_content',
          ])

        expect(result.blockers)
          .toEqual([
            'generated_flash_content_required',
          ])

        expect(result.evidence)
          .toMatchObject({
            classificationAvailable: true,
          })

        expect(result.canCreateFlashAiDraft)
          .toBe(false)

        expect(result.reviewSignals)
          .toContain(
            'event_identity_pending',
          )
      },
    )

    it(
      'accepts a quality-gated verified final editorial and marks the draft eligible',
      () => {
        const editorial = {
          language:
            'ro' as const,
          editorialTitle:
            'Titlu editorial verificat',
          editorialParagraphs: [
            Array.from(
              { length: 500 },
              () => 'cuvânt',
            ).join(' '),
          ],
        }

        const lexicalContent =
          buildVerifiedFlashEditorialLexicalContent(
            editorial.editorialParagraphs,
          )

        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(),
            dedup: dedup(),
            sourceFingerprint,
            eventFingerprint: null,
            validatedClassification,
            verifiedEditorial: {
              editorial,
              lexicalContent,
            },
          })

        expect(result.blockers)
          .not.toContain(
            'generated_flash_content_required',
          )

        expect(result.deferredDecisions)
          .not.toContain(
            'editorial_title',
          )

        expect(result.deferredDecisions)
          .not.toContain(
            'editorial_content',
          )

        expect(result.verifiedEditorial)
          .toEqual({
            editorialTitle:
              editorial.editorialTitle,
            lexicalContent,
          })

        expect(result.canCreateFlashAiDraft)
          .toBe(true)
      },
    )

    it(
      'fails closed when editorial language does not match target language',
      () => {
        const editorial = {
          language:
            'ro' as const,
          editorialTitle:
            'Titlu editorial verificat',
          editorialParagraphs: [
            Array.from(
              { length: 500 },
              () => 'cuvânt',
            ).join(' '),
          ],
        }

        expect(
          () =>
            evaluateFlashArticlePersistenceReadiness({
              candidate: candidate(),
              sourceVerification:
                sourceVerification(),
              dedup: dedup(),
              sourceFingerprint,
              targetLanguage: 'en',
              validatedClassification,
              verifiedEditorial: {
                editorial,
                lexicalContent:
                  buildVerifiedFlashEditorialLexicalContent(
                    editorial.editorialParagraphs,
                  ),
              },
            }),
        ).toThrow(
          'Flash persistence readiness editorial language does not match target language.',
        )
      },
    )

    it(
      'fails closed when supplied final editorial does not pass the deterministic quality gate',
      () => {
        const editorial = {
          language:
            'ro' as const,
          editorialTitle:
            'Titlu editorial verificat',
          editorialParagraphs: [
            'Text prea scurt.',
          ],
        }

        expect(
          () =>
            evaluateFlashArticlePersistenceReadiness({
              candidate: candidate(),
              sourceVerification:
                sourceVerification(),
              dedup: dedup(),
              sourceFingerprint,
              validatedClassification,
              verifiedEditorial: {
                editorial,
                lexicalContent:
                  buildVerifiedFlashEditorialLexicalContent(
                    editorial.editorialParagraphs,
                  ),
              },
            }),
        ).toThrow(
          'Flash persistence readiness requires a quality-gated final editorial.',
        )
      },
    )

    it(
      'fails closed when verified Lexical content does not exactly match the final editorial',
      () => {
        const editorial = {
          language:
            'ro' as const,
          editorialTitle:
            'Titlu editorial verificat',
          editorialParagraphs: [
            Array.from(
              { length: 500 },
              () => 'cuvânt',
            ).join(' '),
          ],
        }

        const differentLexicalContent =
          buildVerifiedFlashEditorialLexicalContent([
            Array.from(
              { length: 500 },
              () => 'altcuvânt',
            ).join(' '),
          ])

        expect(
          () =>
            evaluateFlashArticlePersistenceReadiness({
              candidate: candidate(),
              sourceVerification:
                sourceVerification(),
              dedup: dedup(),
              sourceFingerprint,
              validatedClassification,
              verifiedEditorial: {
                editorial,
                lexicalContent:
                  differentLexicalContent,
              },
            }),
        ).toThrow(
          'Flash persistence readiness verified Lexical content does not match final editorial.',
        )
      },
    )

    it(
      'blocks persistence when canonical source URL is already used',
      () => {
        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(),
            dedup: dedup({
              sourceDuplicateFound: true,
              reasons: [
                'missing_event_fingerprint',
                'canonical_source_url_match',
              ],
            }),
            sourceFingerprint,
          })

        expect(result.blockers)
          .toContain(
            'canonical_source_duplicate',
          )
      },
    )

    it(
      'blocks persistence on an exact grounded event fingerprint duplicate',
      () => {
        const eventFingerprint =
          'a'.repeat(64)

        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(),
            dedup: dedup({
              eventFingerprintDuplicateFound: true,
              finalDedupPending: false,
              reasons: [
                'event_fingerprint_match',
              ],
            }),
            sourceFingerprint,
            eventFingerprint,
          })

        expect(result.blockers)
          .toContain(
            'grounded_event_duplicate',
          )

        expect(result.reviewSignals)
          .not.toContain(
            'event_identity_pending',
          )
      },
    )

    it(
      'blocks persistence when technical source verification fails',
      () => {
        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(false),
            dedup: dedup(),
            sourceFingerprint,
          })

        expect(result.blockers)
          .toContain(
            'source_verification_failed',
          )
      },
    )

    it(
      'keeps source fingerprint and title matches as review signals rather than strong duplicate blockers',
      () => {
        const result =
          evaluateFlashArticlePersistenceReadiness({
            candidate: candidate(),
            sourceVerification:
              sourceVerification(),
            dedup: dedup({
              sourceFingerprintReviewSignal: true,
              titleReviewSignal: true,
              reasons: [
                'missing_event_fingerprint',
                'source_fingerprint_match',
                'normalized_title_match',
              ],
            }),
            sourceFingerprint,
          })

        expect(result.reviewSignals)
          .toEqual([
            'source_fingerprint_match',
            'normalized_title_match',
            'event_identity_pending',
          ])

        expect(result.blockers)
          .toContain(
            'classification_required',
          )

        expect(result.blockers)
          .toContain(
            'generated_flash_content_required',
          )
      },
    )

    it(
      'fails closed when candidate and dedup canonical URLs disagree',
      () => {
        expect(
          () =>
            evaluateFlashArticlePersistenceReadiness({
              candidate: candidate(),
              sourceVerification:
                sourceVerification(),
              dedup: dedup({
                candidateCanonicalUrl:
                  'https://example.com/different',
              }),
              sourceFingerprint,
            }),
        ).toThrow(
          'Flash persistence readiness candidate URL does not match dedup evidence.',
        )
      },
    )

    it(
      'fails closed when sourceFingerprint is missing',
      () => {
        expect(
          () =>
            evaluateFlashArticlePersistenceReadiness({
              candidate: candidate(),
              sourceVerification:
                sourceVerification(),
              dedup: dedup(),
              sourceFingerprint: '   ',
            }),
        ).toThrow(
          'Flash persistence readiness requires sourceFingerprint.',
        )
      },
    )
  },
)
