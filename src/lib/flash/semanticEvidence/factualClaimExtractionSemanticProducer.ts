import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  buildFlashFactualClaimCandidates,
  type FlashFactualClaimExtractionAdapterResult,
} from './factualClaimExtractionAdapter'

import {
  parseFlashFactualClaimExtractionSemanticOutput,
} from './factualClaimExtractionSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducerFailureReason,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface FlashFactualClaimExtractionSemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashFactualClaimExtractionSemanticPrompt {
  systemPrompt:
    string

  userPrompt:
    string
}

export interface FlashFactualClaimExtractionSemanticProducerDescriptor {
  /**
   * Pipeline stage local.
   *
   * Nu face parte din FlashSemanticEvidenceKind
   * și nu reprezintă evidence final pentru
   * Decision Engine.
   */
  stage:
    'factualClaimExtraction'

  method:
    'model'

  provider:
    string

  model:
    string
}

export interface FlashFactualClaimExtractionSemanticProducerInput {
  document:
    FlashSemanticDocument

  /**
   * Acesta devine generationRunId în etapa
   * ulterioară de factual provenance.
   */
  runId:
    string
}

export interface FlashFactualClaimExtractionSemanticProducer {
  descriptor:
    FlashFactualClaimExtractionSemanticProducerDescriptor

  produce(
    input:
      FlashFactualClaimExtractionSemanticProducerInput,
  ): Promise<
    FlashFactualClaimExtractionAdapterResult
  >
}

export interface FlashFactualClaimExtractionRunMetadata {
  stage:
    'factualClaimExtraction'

  method:
    'model'

  runId:
    string

  provider:
    string | null

  model:
    string | null
}

export interface FlashFactualClaimExtractionProducerSuccess {
  ok:
    true

  extraction:
    FlashFactualClaimExtractionAdapterResult

  run:
    FlashFactualClaimExtractionRunMetadata
}

export interface FlashFactualClaimExtractionProducerFailure {
  ok:
    false

  extraction:
    null

  run:
    FlashFactualClaimExtractionRunMetadata

  reason:
    FlashSemanticEvidenceProducerFailureReason
}

export type FlashFactualClaimExtractionProducerResult =
  | FlashFactualClaimExtractionProducerSuccess
  | FlashFactualClaimExtractionProducerFailure

function cleanRequiredConfig(
  value:
    string,
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
  value:
    string | null | undefined,
): string | null {
  const cleaned =
    value?.trim()

  return cleaned
    ? cleaned
    : null
}

function documentPayload(
  document:
    FlashSemanticDocument,
) {
  return {
    language:
      document.language,

    title:
      document.title,

    excerpt:
      document.excerpt,

    bodyText:
      document.bodyText,
  }
}

/**
 * Prompt provider-agnostic pentru extragerea
 * afirmațiilor factuale.
 *
 * Etapa:
 * - identifică claims;
 * - NU verifică adevărul;
 * - NU inspectează surse;
 * - NU creează identități sau citări;
 * - NU decide publicarea.
 */
export function buildFlashFactualClaimExtractionSemanticPrompt(
  document:
    FlashSemanticDocument,
): FlashFactualClaimExtractionSemanticPrompt {
  const systemPrompt = [
    'You are a factual-claim extractor for an editorial Flash document.',
    '',
    'Your job is ONLY to identify externally verifiable factual assertions that materially contribute to the document.',
    '',
    'You do NOT decide whether any claim is true or false.',
    'You do NOT verify claims against sources.',
    'You do NOT select or cite sources.',
    'You do NOT decide whether the document should be published.',
    'You do NOT return AUTO, REVIEW, BLOCK, publication status, risk score, or editorial decision.',
    '',
    'Extract concrete factual assertions such as:',
    '- events or actions that happened;',
    '- dates, quantities, measurements, percentages, or counts;',
    '- research methods, populations, outcomes, or findings;',
    '- regulatory actions or statuses;',
    '- product, company, institutional, or public announcements;',
    '- concrete capabilities, availability, launches, changes, or incidents.',
    '',
    'Do not extract:',
    '- opinions or value judgments;',
    '- rhetorical questions;',
    '- purely editorial transitions;',
    '- generic advice without a concrete factual assertion;',
    '- the same material claim repeatedly when it appears more than once.',
    '',
    'Prefer atomic claims. If a sentence contains multiple materially independent factual assertions, return exact substrings that isolate them when possible.',
    '',
    'sourceField rules:',
    '- allowed values are title, excerpt, body;',
    '- sourceField=body refers to the supplied bodyText field.',
    '',
    'evidenceText rules:',
    '- evidenceText MUST be an exact verbatim substring of the declared sourceField;',
    '- never paraphrase evidenceText;',
    '- never invent evidenceText;',
    '- never normalize or rewrite numbers, dates, names, or wording.',
    '',
    'Identity rules:',
    '- do NOT return claimId;',
    '- do NOT return citationId;',
    '- do NOT return chunkId;',
    '- do NOT return evidenceRef;',
    '- those identifiers are created only by application code.',
    '',
    'If there are no externally verifiable factual assertions, return an empty claims array.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary.',
    '',
    'Exact JSON shape:',
    '{"claims":[{"sourceField":"title|excerpt|body","evidenceText":"exact substring"}]}',
  ].join('\n')

  const userPrompt = [
    'Extract factual claims from this Flash document.',
    '',
    JSON.stringify(
      documentPayload(
        document,
      ),
      null,
      2,
    ),
  ].join('\n')

  return {
    systemPrompt,
    userPrompt,
  }
}

export function createFlashFactualClaimExtractionSemanticProducer({
  executor,
  provider,
  model,
}: FlashFactualClaimExtractionSemanticProducerOptions):
  FlashFactualClaimExtractionSemanticProducer {
  return {
    descriptor: {
      stage:
        'factualClaimExtraction',

      method:
        'model',

      provider,

      model,
    },

    async produce({
      document,
      runId,
    }) {
      cleanRequiredConfig(
        provider,
      )

      cleanRequiredConfig(
        model,
      )

      const prompt =
        buildFlashFactualClaimExtractionSemanticPrompt(
          document,
        )

      const raw =
        await executor({
          runId,

          systemPrompt:
            prompt.systemPrompt,

          userPrompt:
            prompt.userPrompt,
        })

      const output =
        parseFlashFactualClaimExtractionSemanticOutput(
          raw,
        )

      return buildFlashFactualClaimCandidates({
        document,
        output,
      })
    },
  }
}

function buildRunMetadata(
  producer:
    FlashFactualClaimExtractionSemanticProducer,
  runId:
    string,
): FlashFactualClaimExtractionRunMetadata {
  return {
    stage:
      'factualClaimExtraction',

    method:
      'model',

    runId,

    provider:
      cleanOptionalIdentifier(
        producer
          .descriptor
          .provider,
      ),

    model:
      cleanOptionalIdentifier(
        producer
          .descriptor
          .model,
      ),
  }
}

/**
 * Runner specializat.
 *
 * Nu folosim runFlashSemanticEvidenceProducer deoarece
 * factualClaimExtraction este un pas precursor al
 * Factual Support, nu o componentă semantică finală
 * a Decision Engine.
 *
 * Păstrează însă aceleași failure reasons.
 */
export async function runFlashFactualClaimExtractionSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashFactualClaimExtractionSemanticProducer

  input:
    FlashFactualClaimExtractionSemanticProducerInput
}): Promise<
  FlashFactualClaimExtractionProducerResult
> {
  const runId =
    input.runId.trim()

  const run =
    buildRunMetadata(
      producer,
      runId,
    )

  if (!runId) {
    return {
      ok:
        false,

      extraction:
        null,

      run,

      reason:
        'invalid_input',
    }
  }

  try {
    const extraction =
      await producer.produce({
        ...input,
        runId,
      })

    return {
      ok:
        true,

      extraction,

      run,
    }
  } catch (error) {
    if (
      error instanceof
      FlashSemanticEvidenceProducerError
    ) {
      return {
        ok:
          false,

        extraction:
          null,

        run,

        reason:
          error.reason,
      }
    }

    return {
      ok:
        false,

      extraction:
        null,

      run,

      reason:
        'execution_error',
    }
  }
}
