import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashHtmlArticleExtraction,
} from '@/lib/flash/ingestion/htmlArticleExtraction'
import type {
  FlashHtmlListingSource,
} from '@/lib/flash/ingestion/htmlListingCandidateIngestion'
import {
  normalizeFlashHtmlArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

const source:
  FlashHtmlListingSource = {
    sourceId: 4,
    sourceName:
      'Comisia Europeană — AI Act',
    registeredSourceUrl:
      'https://digital-strategy.ec.europa.eu/',
    sourceRole:
      'primary',
    editorialTrust:
      'high',
    citationMode:
      'paraphrase',
    allowAutoPublish:
      false,
  }

const article:
  FlashHtmlArticleExtraction = {
    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting?utm_source=test#main-content',
    title:
      'Fourth GPAI Signatory Taskforce meeting',
    contentType:
      'NEWS ARTICLE',
    publicationDate:
      '03 August 2026',
    lead:
      'The fourth meeting of the Signatory Taskforce under the General-Purpose AI (GPAI) Code of Practice focused on the Safety and Security Chapter and the Copyright Chapter.',
    bodyParagraphs: [
      'On 17 July 2026, the GPAI Signatory Taskforce covered topics related to the Safety and Security chapter and the Copyright chapter of the GPAI Code of Practice:',
      'The provider’s systemic riskmanagement text is preserved exactly as extracted.',
    ],
    bodyText: [
      'On 17 July 2026, the GPAI Signatory Taskforce covered topics related to the Safety and Security chapter and the Copyright chapter of the GPAI Code of Practice:',
      'The provider’s systemic riskmanagement text is preserved exactly as extracted.',
    ].join(
      '\n\n',
    ),
  }

describe(
  'Flash HTML article candidate normalization',
  () => {
    it(
      'builds a deterministic downstream candidate without changing editorial text',
      () => {
        const result =
          normalizeFlashHtmlArticleCandidate(
            source,
            article,
          )

        expect(
          result,
        ).toEqual({
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
            'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting?utm_source=test#main-content',
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
            article.lead,
          bodyParagraphs:
            article.bodyParagraphs,
          bodyText:
            article.bodyText,
        })

        expect(
          result.bodyText,
        ).toContain(
          'riskmanagement',
        )
      },
    )

    it(
      'rejects an unsupported publication date format instead of guessing',
      () => {
        expect(
          () =>
            normalizeFlashHtmlArticleCandidate(
              source,
              {
                ...article,
                publicationDate:
                  '2026/08/03',
              },
            ),
        ).toThrow(
          'Flash normalized article has an unsupported publication date format.',
        )
      },
    )

    it(
      'rejects an invalid calendar date',
      () => {
        expect(
          () =>
            normalizeFlashHtmlArticleCandidate(
              source,
              {
                ...article,
                publicationDate:
                  '31 February 2026',
              },
            ),
        ).toThrow(
          'Flash normalized article has an invalid publication date.',
        )
      },
    )

    it(
      'rejects a URL outside the current /en/news/... ingestion contract',
      () => {
        expect(
          () =>
            normalizeFlashHtmlArticleCandidate(
              source,
              {
                ...article,
                finalUrl:
                  'https://digital-strategy.ec.europa.eu/en/events/test',
              },
            ),
        ).toThrow(
          'Flash normalized article URL must be an /en/news/... page.',
        )
      },
    )
  },
)
