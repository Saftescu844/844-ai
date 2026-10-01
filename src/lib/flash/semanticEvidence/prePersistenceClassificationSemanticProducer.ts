import type {
  FlashNormalizedArticleCandidate,
} from '../ingestion/articleCandidateNormalization'

import {
  parseFlashPrePersistenceClassificationSemanticOutput,
  type FlashPrePersistenceClassificationSemanticOutput,
} from './prePersistenceClassificationSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducerFailureReason,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface FlashPrePersistencePilonOption {
  id: number
  name: string
}

export interface FlashPrePersistenceClassificationSemanticProducerOptions {
  executor: FlashSemanticTextExecutor
  provider: string
  model: string
}

export interface FlashPrePersistenceClassificationSemanticPrompt {
  systemPrompt: string
  userPrompt: string
}

export interface FlashPrePersistenceClassificationSemanticProducerDescriptor {
  /**
   * Local precursor stage. It is not final Decision Engine evidence.
   */
  stage: 'prePersistenceClassification'
  method: 'model'
  provider: string
  model: string
}

export interface FlashPrePersistenceClassificationSemanticProducerInput {
  candidate: FlashNormalizedArticleCandidate
  allowedPilons: FlashPrePersistencePilonOption[]
  runId: string
}

export interface FlashPrePersistenceClassificationSemanticProducer {
  descriptor:
    FlashPrePersistenceClassificationSemanticProducerDescriptor

  produce(
    input: FlashPrePersistenceClassificationSemanticProducerInput,
  ): Promise<FlashPrePersistenceClassificationSemanticOutput>
}

export interface FlashPrePersistenceClassificationRunMetadata {
  stage: 'prePersistenceClassification'
  method: 'model'
  runId: string
  provider: string | null
  model: string | null
}

export interface FlashPrePersistenceClassificationProducerSuccess {
  ok: true
  classification: FlashPrePersistenceClassificationSemanticOutput
  run: FlashPrePersistenceClassificationRunMetadata
}

export interface FlashPrePersistenceClassificationProducerFailure {
  ok: false
  classification: null
  run: FlashPrePersistenceClassificationRunMetadata
  reason: FlashSemanticEvidenceProducerFailureReason
}

export type FlashPrePersistenceClassificationProducerResult =
  | FlashPrePersistenceClassificationProducerSuccess
  | FlashPrePersistenceClassificationProducerFailure

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

function normalizeAllowedPilons(
  allowedPilons: FlashPrePersistencePilonOption[],
): FlashPrePersistencePilonOption[] {
  if (allowedPilons.length === 0) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  const normalized =
    allowedPilons.map(
      pilon => {
        const name =
          pilon.name.trim()

        if (
          !Number.isInteger(pilon.id) ||
          pilon.id <= 0 ||
          !name
        ) {
          throw new FlashSemanticEvidenceProducerError(
            'invalid_output',
          )
        }

        return {
          id: pilon.id,
          name,
        }
      },
    )

  const uniqueIds =
    new Set(
      normalized.map(
        pilon => pilon.id,
      ),
    )

  if (
    uniqueIds.size !== normalized.length
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  return normalized
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
      allowAutoPublish: candidate.allowAutoPublish,
    },
    language: candidate.language,
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
 * Provider-agnostic prompt for pre-persistence classification.
 *
 * This stage classifies only bounded metadata required by FlashAI.
 * It does not generate Flash editorial content and does not make a
 * publication decision.
 */
export function buildFlashPrePersistenceClassificationSemanticPrompt(
  candidate: FlashNormalizedArticleCandidate,
  allowedPilons: FlashPrePersistencePilonOption[],
): FlashPrePersistenceClassificationSemanticPrompt {
  const pilons =
    normalizeAllowedPilons(
      allowedPilons,
    )

  const systemPrompt = [
    'You classify one source article before any FlashAI document is created.',
    '',
    'Return ONLY bounded classification metadata.',
    'Do NOT generate or rewrite editorial content.',
    'Do NOT summarize the article.',
    'Do NOT decide AUTO, REVIEW, BLOCK, draft, published, or publication eligibility.',
    'Do NOT create event fingerprints, source fingerprints, citations, claims, or URLs.',
    '',
    'pilonId:',
    '- MUST be exactly one id from allowedPilons supplied by the application.',
    '- Do not invent a category outside that list.',
    '',
    'flashType allowed values:',
    'announcement, research, regulation, product, business, incident, update, other.',
    '',
    'informationStatus allowed values:',
    'official, confirmed, emerging, preliminary, disputed, unverified.',
    '- official means the material itself is an official institutional/organizational communication or official action/status.',
    '- confirmed means the reported material is established but is not being classified merely as an official communication.',
    '- emerging/preliminary/disputed/unverified must reflect uncertainty visible in the supplied material; do not invent uncertainty.',
    '',
    'riskLevel allowed values: low, medium, high.',
    '- risk is editorial/safety sensitivity, not novelty or importance.',
    '- use higher risk for material where errors could cause substantial harm, including significant medical, safety, legal/regulatory, financial, or security consequences.',
    '',
    'isHealthRelated:',
    '- true only when health, medicine, clinical care, diagnosis, treatment, medical devices, biomedical research, or patient-relevant health evidence is materially part of the article.',
    '- incidental words such as health in a non-medical context are not enough.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary or rationale.',
    '',
    'Exact JSON shape:',
    '{"pilonId":1,"flashType":"announcement|research|regulation|product|business|incident|update|other","informationStatus":"official|confirmed|emerging|preliminary|disputed|unverified","riskLevel":"low|medium|high","isHealthRelated":false}',
  ].join('\n')

  const userPrompt = [
    'Classify this source article using only the supplied article and allowed pilons.',
    '',
    JSON.stringify(
      {
        allowedPilons: pilons,
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

export function createFlashPrePersistenceClassificationSemanticProducer({
  executor,
  provider,
  model,
}: FlashPrePersistenceClassificationSemanticProducerOptions):
  FlashPrePersistenceClassificationSemanticProducer {
  return {
    descriptor: {
      stage: 'prePersistenceClassification',
      method: 'model',
      provider,
      model,
    },

    async produce({
      candidate,
      allowedPilons,
      runId,
    }) {
      cleanRequiredConfig(provider)
      cleanRequiredConfig(model)

      const normalizedPilons =
        normalizeAllowedPilons(
          allowedPilons,
        )

      const prompt =
        buildFlashPrePersistenceClassificationSemanticPrompt(
          candidate,
          normalizedPilons,
        )

      const raw =
        await executor({
          runId,
          systemPrompt:
            prompt.systemPrompt,
          userPrompt:
            prompt.userPrompt,
        })

      const classification =
        parseFlashPrePersistenceClassificationSemanticOutput(
          raw,
        )

      if (
        !normalizedPilons.some(
          pilon =>
            pilon.id ===
              classification.pilonId,
        )
      ) {
        throw new FlashSemanticEvidenceProducerError(
          'invalid_output',
        )
      }

      return classification
    },
  }
}

function buildRunMetadata(
  producer:
    FlashPrePersistenceClassificationSemanticProducer,
  runId: string,
): FlashPrePersistenceClassificationRunMetadata {
  return {
    stage: 'prePersistenceClassification',
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

export async function runFlashPrePersistenceClassificationSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashPrePersistenceClassificationSemanticProducer
  input:
    FlashPrePersistenceClassificationSemanticProducerInput
}): Promise<FlashPrePersistenceClassificationProducerResult> {
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
      classification: null,
      run,
      reason: 'invalid_input',
    }
  }

  try {
    const classification =
      await producer.produce({
        ...input,
        runId,
      })

    return {
      ok: true,
      classification,
      run,
    }
  } catch (error) {
    if (
      error instanceof
        FlashSemanticEvidenceProducerError
    ) {
      return {
        ok: false,
        classification: null,
        run,
        reason: error.reason,
      }
    }

    return {
      ok: false,
      classification: null,
      run,
      reason: 'execution_error',
    }
  }
}
