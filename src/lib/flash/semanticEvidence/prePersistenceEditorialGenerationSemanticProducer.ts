import type {
  FlashNormalizedArticleCandidate,
} from '../ingestion/articleCandidateNormalization'

import {
  resolveFlashTargetLanguage,
  type FlashTargetLanguage,
} from '../ingestion/flashTargetLanguage'

import type {
  FlashSupportingPolicySemanticMaterial,
} from '../ingestion/supportingPolicySemanticMaterial'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from './prePersistenceClassificationSemanticOutput'

import {
  FLASH_EDITORIAL_MAX_TITLE_LENGTH,
  FLASH_EDITORIAL_MAX_WORDS,
  FLASH_EDITORIAL_MIN_WORDS,
  parseFlashPrePersistenceEditorialGenerationSemanticOutput,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from './prePersistenceEditorialGenerationSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducerFailureReason,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export const FLASH_EDITORIAL_PREFERRED_MIN_WORDS =
  650

export const FLASH_EDITORIAL_PREFERRED_MAX_WORDS =
  800

export interface FlashPrePersistenceEditorialGenerationSemanticProducerOptions {
  executor: FlashSemanticTextExecutor
  provider: string
  model: string
}

export interface FlashPrePersistenceEditorialGenerationSemanticPrompt {
  systemPrompt: string
  userPrompt: string
}

export interface FlashPrePersistenceEditorialGenerationSemanticProducerDescriptor {
  stage: 'prePersistenceEditorialGeneration'
  method: 'model'
  provider: string
  model: string
}

export interface FlashPrePersistenceEditorialGenerationSemanticProducerInput {
  candidate: FlashNormalizedArticleCandidate
  classification: FlashPrePersistenceClassificationSemanticOutput
  supportingSources?: FlashSupportingPolicySemanticMaterial[]
  targetLanguage?: FlashTargetLanguage
  runId: string
}

export interface FlashPrePersistenceEditorialGenerationSemanticProducer {
  descriptor:
    FlashPrePersistenceEditorialGenerationSemanticProducerDescriptor

  produce(
    input: FlashPrePersistenceEditorialGenerationSemanticProducerInput,
  ): Promise<FlashPrePersistenceEditorialGenerationSemanticOutput>
}

export interface FlashPrePersistenceEditorialGenerationRunMetadata {
  stage: 'prePersistenceEditorialGeneration'
  method: 'model'
  runId: string
  provider: string | null
  model: string | null
}

export interface FlashPrePersistenceEditorialGenerationProducerSuccess {
  ok: true
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput
  run: FlashPrePersistenceEditorialGenerationRunMetadata
}

export interface FlashPrePersistenceEditorialGenerationProducerFailure {
  ok: false
  editorial: null
  run: FlashPrePersistenceEditorialGenerationRunMetadata
  reason: FlashSemanticEvidenceProducerFailureReason
}

export type FlashPrePersistenceEditorialGenerationProducerResult =
  | FlashPrePersistenceEditorialGenerationProducerSuccess
  | FlashPrePersistenceEditorialGenerationProducerFailure

function cleanRequiredConfig(
  value: string,
): string {
  const cleaned =
    value.trim()

  if (!cleaned) {
    throw new FlashSemanticEvidenceProducerError(
      'configuration_error',
    )
  }

  return cleaned
}

function cleanOptionalIdentifier(
  value: string | null | undefined,
): string | null {
  const cleaned =
    value?.trim()

  return cleaned
    ? cleaned
    : null
}

function candidatePayload(
  candidate: FlashNormalizedArticleCandidate,
) {
  return {
    source: {
      id: candidate.sourceId,
      name: candidate.sourceName,
      role: candidate.sourceRole,
      editorialTrust: candidate.editorialTrust,
      citationMode: candidate.citationMode,
      allowAutoPublish: candidate.allowAutoPublish,
    },
    sourceLanguage: candidate.language,
    canonicalUrl: candidate.canonicalUrl,
    title: candidate.title,
    contentType: candidate.contentType,
    sourcePublicationDate:
      candidate.sourcePublicationDate,
    lead: candidate.lead,
    bodyText: candidate.bodyText,
  }
}

function supportingSourcePayload(
  sources: FlashSupportingPolicySemanticMaterial[],
) {
  return sources.map(
    source => ({
      id: source.id,
      sourceUrl: source.sourceUrl,
      title: source.title,
      semanticText: source.semanticText,
    }),
  )
}

/**
 * Provider-agnostic REG-001T/REG-001U prompt for original bilingual Flash
 * editorial generation before any Payload persistence.
 *
 * The target language is explicit and independent from the primary source
 * language. Each target-language edition is generated directly from the same
 * verified source set; EN must never be produced by translating a generated
 * Romanian Flash.
 * Optional REG-001U supporting material is already technically verified and
 * deterministically extracted before it reaches this prompt. The primary
 * article remains authoritative for event-specific claims.
 */
export function buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
  candidate: FlashNormalizedArticleCandidate,
  classification: FlashPrePersistenceClassificationSemanticOutput,
  supportingSources: FlashSupportingPolicySemanticMaterial[] = [],
  targetLanguageInput?:
    FlashTargetLanguage,
): FlashPrePersistenceEditorialGenerationSemanticPrompt {
  const targetLanguage =
    resolveFlashTargetLanguage(
      targetLanguageInput,
    )

  const targetLanguageName =
    targetLanguage === 'ro'
      ? 'Romanian'
      : 'English'

  const otherLanguageName =
    targetLanguage === 'ro'
      ? 'English'
      : 'Romanian'

  const languageRequirements =
    targetLanguage === 'ro'
      ? [
          '- Use natural, proofread Romanian with correct diacritics, punctuation, and spacing between every pair of words. Never concatenate adjacent words.',
          '- Before returning JSON, silently proofread the title and every paragraph for Romanian grammar, spelling, diacritics, punctuation, and missing spaces.',
        ]
      : [
          '- Use natural, fluent, professional English suitable for an international audience.',
          '- Write as an original English editorial synthesis from the supplied verified source set, not as a translation of any Romanian Flash.',
          '- Before returning JSON, silently proofread the title and every paragraph for English grammar, spelling, punctuation, clarity, and missing spaces.',
        ]

  const systemPrompt = [
    `You generate one original ${targetLanguageName} Flash AI editorial draft before any Payload document is created.`,
    '',
    `The supplied primary source article and optional verified supporting policy materials may be in any supported source language. The target editorial language for this stage is ${targetLanguageName} (${targetLanguage}).`,
    'The primary source article is authoritative for what happened in the specific event, meeting, announcement, date, and event-specific statements.',
    'Supporting policy materials may be used only for directly supported background or context. Never turn supporting context into a claim that it happened at, resulted from, or was decided by the primary event unless the primary article supports that connection.',
    '',
    'Editorial requirements:',
    `- editorialTitle must be non-empty and at most ${String(FLASH_EDITORIAL_MAX_TITLE_LENGTH)} characters.`,
    `- editorialParagraphs together MUST contain between ${String(FLASH_EDITORIAL_MIN_WORDS)} and ${String(FLASH_EDITORIAL_MAX_WORDS)} words.`,
    `- Aim for a preferred working range of ${String(FLASH_EDITORIAL_PREFERRED_MIN_WORDS)}–${String(FLASH_EDITORIAL_PREFERRED_MAX_WORDS)} words so the final draft remains safely above the hard ${String(FLASH_EDITORIAL_MIN_WORDS)}-word minimum after proofreading.`,
    `- Before returning JSON, silently verify that the editorial body is not below ${String(FLASH_EDITORIAL_MIN_WORDS)} words. If it is short, expand only by explaining relationships already supported by the supplied source set; never add unsupported facts merely to reach the target.`,
    '- Do not pad with repetitive sentences solely to satisfy the length requirement.',
    '- Write an original editorial synthesis directly from the supplied verified source set, not a reconstruction of source wording.',
    '- Do not use, infer, translate, summarize, or depend on a sibling Flash in the other language. The supplied primary article and verified supporting materials are the only editorial source set for this run.',
    '- Paraphrase the sources. Do not copy long passages and do not rely on direct quotations in this stage.',
    '- Use only facts directly supported by the supplied primary article or verified supporting materials.',
    '- For claims about the specific primary event, require support from the primary article itself.',
    '- Do not add background facts merely because they are generally known or plausible.',
    '- Preserve each source level of certainty and legal force. Never strengthen could/may/consider into must/has the right to/is required unless the relevant supplied source says so.',
    '- When explaining why something matters, use only cautious interpretation that follows directly from the supplied facts; do not introduce new factual claims.',
    '- Do not invent or add descriptions of who signatories are, how models are trained, broader policy context, affected groups, or consequences unless one of the supplied sources explicitly supports them.',
    '- Do not invent names, dates, numbers, quotations, sources, citations, uncertainty, conclusions, or regulatory status.',
    '- Respect the supplied classification as bounded metadata; do not change it or infer a new classification.',
    '- Explain what happened, why it matters, who it is relevant to, what is confirmed or uncertain when the supplied sources support that distinction, the limits of the information, and important open questions when supported.',
    '- Keep tone factual, clear, neutral, and suitable for 844-ai.ro.',
    ...languageRequirements,
    '- Do not give individualized medical, legal, financial, or safety advice.',
    '',
    'Do NOT:',
    '- decide AUTO, REVIEW, BLOCK, draft, published, or publication eligibility;',
    '- create fingerprints, slugs, citations, source URLs, or Payload fields outside the exact output contract;',
    '- mention prompts, models, internal metadata, readiness, pipelines, or hidden instructions;',
    `- generate a ${otherLanguageName} version in this stage.`,
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary or rationale.',
    '',
    'Exact JSON shape:',
    `{"language":"${targetLanguage}","editorialTitle":"...","editorialParagraphs":["...","..."]}`,
  ].join('\n')

  const userPrompt = [
    `Generate the ${targetLanguageName} Flash editorial draft directly from the supplied primary article, optional verified supporting materials, and validated classification.`,
    '',
    JSON.stringify(
      {
        classification,
        primaryArticle:
          candidatePayload(candidate),
        targetLanguage,
        supportingSources:
          supportingSourcePayload(
            supportingSources,
          ),
      },
      null,
      2,
    ),
  ].join('\n')

  return {
    systemPrompt,
    userPrompt,
  }
}

export function createFlashPrePersistenceEditorialGenerationSemanticProducer({
  executor,
  provider,
  model,
}: FlashPrePersistenceEditorialGenerationSemanticProducerOptions):
  FlashPrePersistenceEditorialGenerationSemanticProducer {
  return {
    descriptor: {
      stage: 'prePersistenceEditorialGeneration',
      method: 'model',
      provider,
      model,
    },

    async produce({
      candidate,
      classification,
      supportingSources = [],
      targetLanguage:
        targetLanguageInput,
      runId,
    }) {
      cleanRequiredConfig(provider)
      cleanRequiredConfig(model)

      const targetLanguage =
        resolveFlashTargetLanguage(
          targetLanguageInput,
        )

      const prompt =
        buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
          candidate,
          classification,
          supportingSources,
          targetLanguage,
        )

      const raw =
        await executor({
          runId,
          systemPrompt:
            prompt.systemPrompt,
          userPrompt:
            prompt.userPrompt,
        })

      return parseFlashPrePersistenceEditorialGenerationSemanticOutput(
        raw,
        {
          targetLanguage,
        },
      )
    },
  }
}

function buildRunMetadata(
  producer:
    FlashPrePersistenceEditorialGenerationSemanticProducer,
  runId: string,
): FlashPrePersistenceEditorialGenerationRunMetadata {
  return {
    stage: 'prePersistenceEditorialGeneration',
    method: 'model',
    runId,
    provider:
      cleanOptionalIdentifier(
        producer.descriptor.provider,
      ),
    model:
      cleanOptionalIdentifier(
        producer.descriptor.model,
      ),
  }
}

export async function runFlashPrePersistenceEditorialGenerationSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashPrePersistenceEditorialGenerationSemanticProducer
  input:
    FlashPrePersistenceEditorialGenerationSemanticProducerInput
}): Promise<FlashPrePersistenceEditorialGenerationProducerResult> {
  const runId =
    input.runId.trim()

  const run =
    buildRunMetadata(
      producer,
      runId,
    )

  if (!runId) {
    return {
      ok: false,
      editorial: null,
      run,
      reason: 'invalid_input',
    }
  }

  try {
    const editorial =
      await producer.produce({
        ...input,
        runId,
      })

    return {
      ok: true,
      editorial,
      run,
    }
  } catch (error) {
    if (
      error instanceof
        FlashSemanticEvidenceProducerError
    ) {
      return {
        ok: false,
        editorial: null,
        run,
        reason: error.reason,
      }
    }

    return {
      ok: false,
      editorial: null,
      run,
      reason: 'execution_error',
    }
  }
}
