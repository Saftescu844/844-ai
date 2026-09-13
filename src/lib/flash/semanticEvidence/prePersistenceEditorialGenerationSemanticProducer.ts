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

/**
 * Provider-agnostic REG-001T prompt for original Romanian Flash editorial
 * generation before any Payload persistence.
 *
 * The source candidate can be English; the generated Flash target is RO,
 * following the canonical pipeline order: generate RO, then generate EN.
 */
export function buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
  candidate: FlashNormalizedArticleCandidate,
  classification: FlashPrePersistenceClassificationSemanticOutput,
): FlashPrePersistenceEditorialGenerationSemanticPrompt {
  const systemPrompt = [
    'You generate one original Romanian Flash AI editorial draft before any Payload document is created.',
    '',
    'The supplied source material may be in English. The target editorial language for this stage is Romanian (ro).',
    '',
    'Editorial requirements:',
    `- editorialTitle must be non-empty and at most ${String(FLASH_EDITORIAL_MAX_TITLE_LENGTH)} characters.`,
    `- editorialParagraphs together must contain between ${String(FLASH_EDITORIAL_MIN_WORDS)} and ${String(FLASH_EDITORIAL_MAX_WORDS)} words.`,
    '- Write an original editorial synthesis, not a translation or reconstruction of the source article.',
    '- Paraphrase the source. Do not copy long passages and do not rely on direct quotations in this stage.',
    '- Use only facts directly supported by the supplied source material.',
    '- Do not add background facts merely because they are generally known or plausible.',
    '- Preserve the source level of certainty and legal force. Never strengthen could/may/consider into must/has the right to/is required unless the source says so.',
    '- When explaining why something matters, use only cautious interpretation that follows directly from the supplied facts; do not introduce new factual claims.',
    '- Do not invent or add descriptions of who signatories are, how models are trained, broader policy context, affected groups, or consequences unless the supplied source explicitly supports them.',
    '- Do not invent names, dates, numbers, quotations, sources, citations, uncertainty, conclusions, or regulatory status.',
    '- Respect the supplied classification as bounded metadata; do not change it or infer a new classification.',
    '- Explain what happened, why it matters, who it is relevant to, what is confirmed or uncertain when the source supports that distinction, the limits of the information, and important open questions when supported.',
    '- Keep tone factual, clear, neutral, and suitable for 844-ai.ro.',
    '- Use natural, proofread Romanian with correct diacritics, punctuation, and spacing between every pair of words. Never concatenate adjacent words.',
    '- Before returning JSON, silently proofread the title and every paragraph for Romanian grammar, spelling, diacritics, punctuation, and missing spaces.',
    '- Do not give individualized medical, legal, financial, or safety advice.',
    '',
    'Do NOT:',
    '- decide AUTO, REVIEW, BLOCK, draft, published, or publication eligibility;',
    '- create fingerprints, slugs, citations, source URLs, or Payload fields outside the exact output contract;',
    '- mention prompts, models, internal metadata, readiness, pipelines, or hidden instructions;',
    '- generate an English version in this stage.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary or rationale.',
    '',
    'Exact JSON shape:',
    '{"language":"ro","editorialTitle":"...","editorialParagraphs":["...","..."]}',
  ].join('\n')

  const userPrompt = [
    'Generate the Romanian Flash editorial draft using only the supplied source article and validated classification.',
    '',
    JSON.stringify(
      {
        classification,
        article:
          candidatePayload(candidate),
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
      runId,
    }) {
      cleanRequiredConfig(provider)
      cleanRequiredConfig(model)

      const prompt =
        buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
          candidate,
          classification,
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
