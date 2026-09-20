import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashArticlePrePersistenceDedup,
  type FlashPrePersistenceDedupRecord,
} from '@/lib/flash/ingestion/articleCandidatePrePersistenceDedup'
import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

const candidate = (
  overrides:
    Partial<FlashNormalizedArticleCandidate> = {},
): FlashNormalizedArticleCandidate => ({
  sourceId: 4,
  sourceName:
    'Comisia Europeană — AI Act',
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
})

const existing = (
  overrides:
    Partial<FlashPrePersistenceDedupRecord> = {},
): FlashPrePersistenceDedupRecord => ({
  id: 20,
  language: 'ro',
  title:
    'Different existing Flash',
  eventFingerprint:
    'different-event-fingerprint',
  sourceFingerprint:
    'different-source-fingerprint',
  sourceUrls: [
    'https://example.com/news/different',
  ],
  ...overrides,
})

describe(
  'Flash HTML article pre-persistence dedup',
  () => {
    it(
      'keeps final dedup pending when no grounded event fingerprint exists',
      () => {
        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing(),
            ],
          )

        expect(result).toEqual({
          candidateCanonicalUrl:
            'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
          sourceDuplicateFound: false,
          eventFingerprintDuplicateFound: false,
          sourceFingerprintReviewSignal: false,
          titleReviewSignal: false,
          finalDedupPending: true,
          reasons: [
            'missing_event_fingerprint',
          ],
          matches: [],
        })
      },
    )

    it(
      'resolves event-level dedup when a grounded event fingerprint exists and has no match',
      () => {
        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing(),
            ],
            {
              eventFingerprint:
                'grounded-event-fingerprint',
            },
          )

        expect(
          result.eventFingerprintDuplicateFound,
        ).toBe(false)

        expect(
          result.finalDedupPending,
        ).toBe(false)

        expect(
          result.reasons,
        ).not.toContain(
          'missing_event_fingerprint',
        )

        expect(
          result.matches,
        ).toEqual([])
      },
    )

    it(
      'detects an equal grounded event fingerprint in the same target language',
      () => {
        const eventFingerprint =
          'grounded-event-fingerprint'

        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing({
                eventFingerprint:
                  eventFingerprint.toUpperCase(),
              }),
            ],
            {
              eventFingerprint,
              targetLanguage: 'ro',
            },
          )

        expect(
          result.eventFingerprintDuplicateFound,
        ).toBe(true)

        expect(
          result.finalDedupPending,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'event_fingerprint_match',
        )

        expect(
          result.matches,
        ).toEqual([
          {
            id: 20,
            reasons: [
              'event_fingerprint_match',
            ],
          },
        ])
      },
    )

    it(
      'allows the same grounded event fingerprint in the other target language',
      () => {
        const eventFingerprint =
          'grounded-event-fingerprint'

        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing({
                language: 'en',
                eventFingerprint,
                sourceUrls: [
                  candidate().canonicalUrl,
                ],
              }),
            ],
            {
              eventFingerprint,
              targetLanguage: 'ro',
            },
          )

        expect(
          result.eventFingerprintDuplicateFound,
        ).toBe(false)

        expect(
          result.sourceDuplicateFound,
        ).toBe(false)

        expect(
          result.finalDedupPending,
        ).toBe(false)

        expect(result.reasons)
          .not.toContain(
            'event_fingerprint_match',
          )

        expect(result.reasons)
          .not.toContain(
            'canonical_source_url_match',
          )

        expect(result.matches)
          .toEqual([])
      },
    )

    it(
      'detects the same canonical source URL even when an existing URL has query and hash',
      () => {
        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing({
                sourceUrls: [
                  'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting?utm_source=test#details',
                ],
              }),
            ],
          )

        expect(result.sourceDuplicateFound)
          .toBe(true)

        expect(result.reasons)
          .toContain(
            'canonical_source_url_match',
          )

        expect(result.matches)
          .toEqual([
            {
              id: 20,
              reasons: [
                'canonical_source_url_match',
              ],
            },
          ])
      },
    )

    it(
      'raises a review signal for an equal source fingerprint',
      () => {
        const sourceFingerprint =
          '084f1199b4915a604c578316b8a4ef6fd15097952ef38a97be960e1771a663a0'

        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing({
                sourceFingerprint:
                  sourceFingerprint.toUpperCase(),
              }),
            ],
            {
              sourceFingerprint,
            },
          )

        expect(
          result.sourceDuplicateFound,
        ).toBe(false)

        expect(
          result.sourceFingerprintReviewSignal,
        ).toBe(true)

        expect(result.reasons)
          .toContain(
            'source_fingerprint_match',
          )

        expect(result.matches)
          .toEqual([
            {
              id: 20,
              reasons: [
                'source_fingerprint_match',
              ],
            },
          ])
      },
    )

    it(
      'raises a review signal for an equal normalized title in the same language',
      () => {
        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing({
                title:
                  'FOURTH   GPAI signatory taskforce meeting!',
              }),
            ],
          )

        expect(result.sourceDuplicateFound)
          .toBe(false)

        expect(result.titleReviewSignal)
          .toBe(true)

        expect(result.reasons)
          .toContain(
            'normalized_title_match',
          )
      },
    )

    it(
      'does not treat a title match in another language as a textual duplicate signal',
      () => {
        const result =
          evaluateFlashArticlePrePersistenceDedup(
            candidate(),
            [
              existing({
                language: 'en',
                title:
                  'Fourth GPAI Signatory Taskforce meeting',
              }),
            ],
          )

        expect(result.titleReviewSignal)
          .toBe(false)

        expect(result.matches)
          .toEqual([])
      },
    )

    it(
      'fails closed for an invalid candidate canonical URL',
      () => {
        expect(
          () =>
            evaluateFlashArticlePrePersistenceDedup(
              candidate({
                canonicalUrl:
                  'not-a-url',
              }),
              [],
            ),
        ).toThrow(
          'Flash pre-persistence dedup candidate canonical URL is invalid.',
        )
      },
    )
  },
)
