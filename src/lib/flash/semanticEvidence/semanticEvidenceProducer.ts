import type {
  FlashSemanticDocument,
} from './semanticDocument'

export type FlashSemanticEvidenceKind =
  | 'safety'
  | 'medicalInterpretation'
  | 'extraordinaryClaim'
  | 'regulatoryStatus'
  | 'contradictions'

export type FlashSemanticEvidenceMethod =
  | 'deterministic'
  | 'model'
  | 'human'

export interface FlashSemanticEvidenceProducerDescriptor {
  kind:
    FlashSemanticEvidenceKind

  method:
    FlashSemanticEvidenceMethod

  /**
   * Provider/model sunt metadata de proveniență.
   *
   * Pentru un evaluator deterministic sau human
   * pot rămâne null.
   */
  provider?:
    string | null

  model?:
    string | null
}

export interface FlashSemanticEvidenceProducerInput {
  document:
    FlashSemanticDocument

  /**
   * Identificator extern al rulării.
   *
   * Nu este generat aici, pentru ca orchestratorul
   * să poată controla și corela rulările.
   */
  runId:
    string
}

export interface FlashSemanticEvidenceProducer<
  TEvidence,
> {
  descriptor:
    FlashSemanticEvidenceProducerDescriptor

  produce(
    input:
      FlashSemanticEvidenceProducerInput,
  ): Promise<TEvidence>
}

export type FlashSemanticEvidenceProducerFailureReason =
  | 'invalid_input'
  | 'configuration_error'
  | 'provider_error'
  | 'provider_output_truncated'
  | 'provider_refusal'
  | 'provider_structured_output_invalid_json'
  | 'provider_structured_output_incomplete_json'
  | 'provider_structured_output_non_json'
  | 'provider_structured_output_multiple_text_blocks'
  | 'invalid_output'
  | 'invalid_output_json'
  | 'invalid_output_shape'
  | 'invalid_output_language'
  | 'invalid_output_title'
  | 'invalid_output_paragraphs'
  | 'invalid_output_too_short'
  | 'invalid_output_too_long'
  | 'invalid_output_quality_review_retention'
  | 'execution_error'

export interface FlashSemanticEvidenceRunMetadata {
  kind:
    FlashSemanticEvidenceKind

  method:
    FlashSemanticEvidenceMethod

  runId:
    string

  provider:
    string | null

  model:
    string | null
}

export interface FlashSemanticEvidenceProducerSuccess<
  TEvidence,
> {
  ok:
    true

  evidence:
    TEvidence

  run:
    FlashSemanticEvidenceRunMetadata
}

export interface FlashSemanticEvidenceProducerFailure {
  ok:
    false

  evidence:
    null

  run:
    FlashSemanticEvidenceRunMetadata

  reason:
    FlashSemanticEvidenceProducerFailureReason
}

export type FlashSemanticEvidenceProducerResult<
  TEvidence,
> =
  | FlashSemanticEvidenceProducerSuccess<TEvidence>
  | FlashSemanticEvidenceProducerFailure

export class FlashSemanticEvidenceProducerError
  extends Error {
  readonly reason:
    Exclude<
      FlashSemanticEvidenceProducerFailureReason,
      'invalid_input' | 'execution_error'
    >

  constructor(
    reason:
      Exclude<
        FlashSemanticEvidenceProducerFailureReason,
        'invalid_input' | 'execution_error'
      >,
  ) {
    super(reason)

    this.name =
      'FlashSemanticEvidenceProducerError'

    this.reason =
      reason
  }
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

function buildRunMetadata(
  producer:
    FlashSemanticEvidenceProducer<unknown>,
  runId:
    string,
): FlashSemanticEvidenceRunMetadata {
  return {
    kind:
      producer.descriptor.kind,

    method:
      producer.descriptor.method,

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
 * Executor comun pentru semantic evidence producers.
 *
 * Contract:
 * - nu generează runId;
 * - nu decide AUTO / REVIEW / BLOCK;
 * - nu transformă eșecul în evidence pozitiv;
 * - nu aruncă mai departe erori normale ale producerului.
 *
 * Un rezultat `ok: false` trebuie tratat de nivelul
 * superior ca evidence indisponibil/incomplet.
 */
export async function runFlashSemanticEvidenceProducer<
  TEvidence,
>({
  producer,
  input,
}: {
  producer:
    FlashSemanticEvidenceProducer<TEvidence>

  input:
    FlashSemanticEvidenceProducerInput
}): Promise<
  FlashSemanticEvidenceProducerResult<TEvidence>
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

      evidence:
        null,

      run,

      reason:
        'invalid_input',
    }
  }

  try {
    const evidence =
      await producer.produce({
        ...input,
        runId,
      })

    return {
      ok:
        true,

      evidence,

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

        evidence:
          null,

        run,

        reason:
          error.reason,
      }
    }

    return {
      ok:
        false,

      evidence:
        null,

      run,

      reason:
        'execution_error',
    }
  }
}
