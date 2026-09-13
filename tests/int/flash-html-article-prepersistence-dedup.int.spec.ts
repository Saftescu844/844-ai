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
  language: 'en',
  title:
    'Different existing Flash',
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
      'keeps final dedup pending when no pre-persistence duplicate signal exists',
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
                language: 'ro',
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
