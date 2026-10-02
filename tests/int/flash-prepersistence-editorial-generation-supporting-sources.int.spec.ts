import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashSupportingPolicySemanticMaterial,
} from '@/lib/flash/ingestion/supportingPolicySemanticMaterial'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

import {
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
    contentType: 'News article',
    sourcePublicationDateRaw:
      '3 August 2026',
    sourcePublicationDate:
      '2026-08-03',
    lead:
      'The European AI Office hosted the fourth GPAI Signatory Taskforce meeting.',
    bodyParagraphs: [
      'The meeting focused on Safety and Security and Copyright.',
    ],
    bodyText:
      'The meeting focused on Safety and Security and Copyright.',
  }

const classification:
  FlashPrePersistenceClassificationSemanticOutput = {
    pilonId: 1,
    flashType: 'regulation',
    informationStatus: 'official',
    riskLevel: 'medium',
    isHealthRelated: false,
  }

const supportingSources:
  FlashSupportingPolicySemanticMaterial[] = [
    {
      id: 'supporting-1',
      sourceUrl:
        'https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai',
      title:
        'The General-Purpose AI Code of Practice',
      semanticText:
        'The Code of Practice supports compliance with the AI Act and contains Transparency, Copyright, and Safety and Security chapters.',
      textLength: 125,
      wordCount: 20,
    },
    {
      id: 'supporting-2',
      sourceUrl:
        'https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice',
      title:
        'Signatory Taskforce of the General-Purpose AI Code of Practice',
      semanticText:
        'The Signatory Taskforce facilitates exchanges related to implementation of the Code of Practice.',
      textLength: 91,
      wordCount: 14,
    },
  ]

describe(
  'Flash editorial generation with verified supporting sources',
  () => {
    it(
      'keeps the primary article authoritative for event-specific claims while exposing verified supporting context',
      () => {
        const prompt =
          buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
            candidate,
            classification,
            supportingSources,
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'The primary source article is authoritative for what happened in the specific event',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Never turn supporting context into a claim that it happened at, resulted from, or was decided by the primary event',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"primaryArticle"',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"supportingSources"',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'The General-Purpose AI Code of Practice',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'Signatory Taskforce of the General-Purpose AI Code of Practice',
        )
      },
    )

    it(
      'remains backward compatible when no supporting materials are supplied',
      () => {
        const prompt =
          buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
            candidate,
            classification,
          )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"supportingSources": []',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'Fourth GPAI Signatory Taskforce meeting',
        )
      },
    )
  },
)
