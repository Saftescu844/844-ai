import type {
  FlashNormalizedArticleCandidate,
} from '../ingestion/articleCandidateNormalization'

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

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducerOptions {
  executor: FlashSemanticTextExecutor
  provider: string
  model: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticPrompt {
  systemPrompt: string
  userPrompt: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducerDescriptor {
  stage: 'prePersistenceEditorialQualityReview'
  method: 'model'
  provider: string
  model: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducerInput {
  candidate: FlashNormalizedArticleCandidate
  classification: FlashPrePersistenceClassificationSemanticOutput
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput
  runId: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducer {
  descriptor:
    FlashPrePersistenceEditorialQualityReviewSemanticProducerDescriptor

  produce(
    input: FlashPrePersistenceEditorialQualityReviewSemanticProducerInput,
  ): Promise<FlashPrePersistenceEditorialGenerationSemanticOutput>
}

export interface FlashPrePersistenceEditorialQualityReviewRunMetadata {
  stage: 'prePersistenceEditorialQualityReview'
  method: 'model'
  runId: string
  provider: string | null
  model: string | null
}

export interface FlashPrePersistenceEditorialQualityReviewProducerSuccess {
  ok: true
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput
  run: FlashPrePersistenceEditorialQualityReviewRunMetadata
}

export interface FlashPrePersistenceEditorialQualityReviewProducerFailure {
  ok: false
  editorial: null
  run: FlashPrePersistenceEditorialQualityReviewRunMetadata
  reason: FlashSemanticEvidenceProducerFailureReason
}

export type FlashPrePersistenceEditorialQualityReviewProducerResult =
  | FlashPrePersistenceEditorialQualityReviewProducerSuccess
  | FlashPrePersistenceEditorialQualityReviewProducerFailure

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

/**
 * REG-001T bounded editorial QA pass.
 *
 * It reviews an already generated Romanian Flash against the same source
 * candidate. The source article is the sole factual authority. Classification
 * is metadata only and must not be used as evidence for new claims.
 */
export function buildFlashPrePersistenceEditorialQualityReviewSemanticPrompt(
  candidate: FlashNormalizedArticleCandidate,
  classification: FlashPrePersistenceClassificationSemanticOutput,
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput,
): FlashPrePersistenceEditorialQualityReviewSemanticPrompt {
  const systemPrompt = [
    'You review and correct one existing Romanian Flash AI editorial draft before any Payload document is created.',
    '',
    'The supplied source article is the sole factual authority for the reviewed editorial.',
    'The supplied classification is bounded metadata only. It is not factual evidence and must not be used to add claims.',
    '',
    'Quality-review requirements:',
    `- Return language exactly "ro".`,
    `- editorialTitle must be non-empty and at most ${String(FLASH_EDITORIAL_MAX_TITLE_LENGTH)} characters.`,
    `- editorialParagraphs together MUST contain between ${String(FLASH_EDITORIAL_MIN_WORDS)} and ${String(FLASH_EDITORIAL_MAX_WORDS)} words.`,
    '- Correct Romanian grammar, spelling, diacritics, punctuation, and spacing.',
    '- Fix every concatenated-word or missing-space defect in the draft.',
    '- Remove claims, background, definitions, examples, consequences, conclusions, or interpretations that are not directly supported by the supplied source article.',
    '- Preserve the source level of certainty and legal force. Never strengthen could/may/consider into must/is required/has the right to unless the source says so.',
    '- Do not add any new names, dates, numbers, quotations, sources, citations, legal interpretations, policy context, technical definitions, affected groups, consequences, or open questions unless explicitly supported by the source.',
    '- You may rephrase, reorder, merge, or split sentences and paragraphs to improve clarity and Romanian quality.',
    `- If removing unsupported material would make the editorial shorter than ${String(FLASH_EDITORIAL_MIN_WORDS)} words, expand only by clearly restating or explaining relationships already explicit in the supplied source. Do not add outside knowledge and do not pad with repetitive sentences.`,
    '- Keep the result factual, neutral, readable, and suitable for 844-ai.ro.',
    '- Do not decide AUTO, REVIEW, BLOCK, draft, published, or publication eligibility.',
    '- Do not create fingerprints, slugs, citations, source URLs, or Payload fields.',
    '- Do not mention prompts, models, internal metadata, readiness, pipelines, review instructions, or hidden instructions.',
    '- Do not generate an English version in this stage.',
    '',
    'Return ONLY valid JSON matching the exact output contract.',
    'Do not use markdown fences or add commentary.',
    '',
    'Exact JSON shape:',
    '{"language":"ro","editorialTitle":"...","editorialParagraphs":["...","..."]}',
  ].join('\n')

  const userPrompt = [
    'Review the Romanian editorial against the supplied source. Return only the corrected source-faithful editorial.',
    '',
    JSON.stringify(
      {
        classification,
        article:
          candidatePayload(candidate),
        editorialDraft:
          editorial,
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

export function createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
  executor,
  provider,
  model,
}: FlashPrePersistenceEditorialQualityReviewSemanticProducerOptions):
  FlashPrePersistenceEditorialQualityReviewSemanticProducer {
  return {
    descriptor: {
      stage:
        'prePersistenceEditorialQualityReview',
      method: 'model',
      provider,
      model,
    },

    async produce({
      candidate,
      classification,
      editorial,
      runId,
    }) {
      cleanRequiredConfig(provider)
      cleanRequiredConfig(model)

      const prompt =
        buildFlashPrePersistenceEditorialQualityReviewSemanticPrompt(
          candidate,
          classification,
          editorial,
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
      )
    },
  }
}

function buildRunMetadata(
  producer:
    FlashPrePersistenceEditorialQualityReviewSemanticProducer,
  runId: string,
): FlashPrePersistenceEditorialQualityReviewRunMetadata {
  return {
    stage:
      'prePersistenceEditorialQualityReview',
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

export async function runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashPrePersistenceEditorialQualityReviewSemanticProducer
  input:
    FlashPrePersistenceEditorialQualityReviewSemanticProducerInput
}): Promise<FlashPrePersistenceEditorialQualityReviewProducerResult> {
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
