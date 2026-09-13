import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import {
  buildFlashArticleCandidateFingerprints,
} from '@/lib/flash/ingestion/articleCandidateSourceFingerprint'

function candidate(
  overrides:
    Partial<FlashNormalizedArticleCandidate> = {},
): FlashNormalizedArticleCandidate {
  return {
    sourceId: 4,
    sourceName:
      'Comisia Europeană — AI Act',
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
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    title:
      'Fourth GPAI Signatory Taskforce meeting',
    contentType:
      'NEWS ARTICLE',
    sourcePublicationDateRaw:
      '03 August 2026',
    sourcePublicationDate:
      '2026-08-03',
    lead:
      'Lead',
    bodyParagraphs: [
      'Paragraph',
    ],
    bodyText:
      'Paragraph',
    ...overrides,
  }
}

describe(
  'Flash HTML article source fingerprint',
  () => {
    it(
      'generates the expected deterministic SHA-256 fingerprint from canonical URL',
      () => {
        const result =
          buildFlashArticleCandidateFingerprints(
            candidate(),
          )

        expect(result).toEqual({
          sourceFingerprint:
            '084f1199b4915a604c578316b8a4ef6fd15097952ef38a97be960e1771a663a0',
          eventFingerprint:
            null,
          eventFingerprintStatus:
            'pending',
        })
      },
    )

    it(
      'does not change when non-URL editorial fields change',
      () => {
        const first =
          buildFlashArticleCandidateFingerprints(
            candidate(),
          )

        const second =
          buildFlashArticleCandidateFingerprints(
            candidate({
              title:
                'Different editorial title',
              lead:
                'Different lead',
              bodyText:
                'Different body',
              bodyParagraphs: [
                'Different body',
              ],
            }),
          )

        expect(
          second.sourceFingerprint,
        ).toBe(
          first.sourceFingerprint,
        )
      },
    )

    it(
      'changes when the canonical source URL changes',
      () => {
        const first =
          buildFlashArticleCandidateFingerprints(
            candidate(),
          )

        const second =
          buildFlashArticleCandidateFingerprints(
            candidate({
              canonicalUrl:
                'https://digital-strategy.ec.europa.eu/en/news/another-event',
            }),
          )

        expect(
          second.sourceFingerprint,
        ).not.toBe(
          first.sourceFingerprint,
        )
      },
    )

    it(
      'keeps event fingerprint explicitly pending',
      () => {
        const result =
          buildFlashArticleCandidateFingerprints(
            candidate(),
          )

        expect(
          result.eventFingerprint,
        ).toBeNull()

        expect(
          result.eventFingerprintStatus,
        ).toBe(
          'pending',
        )
      },
    )
  },
)
