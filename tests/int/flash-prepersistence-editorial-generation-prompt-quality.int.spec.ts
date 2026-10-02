import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

import {
  FLASH_EDITORIAL_PREFERRED_MAX_WORDS,
  FLASH_EDITORIAL_PREFERRED_MIN_WORDS,
  buildFlashPrePersistenceEditorialGenerationSemanticPrompt,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'

const candidate:
  FlashNormalizedArticleCandidate = {
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
    contentType:
      'News article',
    sourcePublicationDateRaw:
      '3 August 2026',
    sourcePublicationDate:
      '2026-08-03',
    lead:
      'The fourth GPAI Signatory Taskforce meeting covered Safety and Security and Copyright.',
    bodyParagraphs: [
      'The AI Office said marginal-risk clauses could only be invoked in exceptional circumstances and under safeguards.',
    ],
    bodyText:
      'The AI Office said marginal-risk clauses could only be invoked in exceptional circumstances and under safeguards.',
  }

const classification:
  FlashPrePersistenceClassificationSemanticOutput = {
    pilonId: 1,
    flashType:
      'regulation',
    informationStatus:
      'official',
    riskLevel:
      'low',
    isHealthRelated:
      false,
  }

describe(
  'Flash REG-001T editorial prompt quality constraints',
  () => {
    it(
      'requires source fidelity, Romanian proofreading, and a safe preferred length buffer without changing the hard contract',
      () => {
        const prompt =
          buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
            candidate,
            classification,
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Use only facts directly supported by the supplied primary article or verified supporting materials.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Preserve each source level of certainty and legal force.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Never concatenate adjacent words.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'silently proofread the title and every paragraph',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'MUST contain between 500 and 1000 words',
        )

        expect(
          FLASH_EDITORIAL_PREFERRED_MIN_WORDS,
        ).toBe(650)

        expect(
          FLASH_EDITORIAL_PREFERRED_MAX_WORDS,
        ).toBe(800)

        expect(
          prompt.systemPrompt,
        ).toContain(
          'preferred working range of 650–800 words',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'silently verify that the editorial body is not below 500 words',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'never add unsupported facts merely to reach the target',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do not pad with repetitive sentences solely to satisfy the length requirement.',
        )
      },
    )
  },
)
