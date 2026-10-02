import type {
  FlashContradictionEvidenceInput,
} from '../runtimeEvidence/contradictionEvidence'

import {
  parseFlashContradictionSemanticOutput,
  toFlashContradictionEvidenceInput,
  type FlashContradictionSemanticCandidate,
} from './contradictionSemanticComparison'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducerDescriptor,
  type FlashSemanticEvidenceProducerFailureReason,
  type FlashSemanticEvidenceProducerResult,
  type FlashSemanticEvidenceRunMetadata,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface FlashContradictionSemanticProducerInput {
  runId:
    string

  /**
   * false înseamnă că upstream nu a putut rezolva
   * toate fragmentele necesare comparației.
   *
   * Un set incomplet NU poate fi interpretat ca
   * "nu există contradicții".
   */
  candidateSetComplete:
    boolean

  candidates:
    FlashContradictionSemanticCandidate[]
}

export interface FlashContradictionSemanticProducer {
  descriptor:
    FlashSemanticEvidenceProducerDescriptor

  produce(
    input:
      FlashContradictionSemanticProducerInput,
  ): Promise<
    FlashContradictionEvidenceInput
  >
}

export interface FlashContradictionSemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashContradictionSemanticPrompt {
  systemPrompt:
    string

  userPrompt:
    string
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

function buildRunMetadata(
  producer:
    FlashContradictionSemanticProducer,
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

function duplicateCandidateIDs(
  candidates:
    FlashContradictionSemanticCandidate[],
): boolean {
  const ids =
    candidates.map(
      candidate =>
        candidate.id,
    )

  return (
    new Set(ids).size !==
    ids.length
  )
}

function failure(
  run:
    FlashSemanticEvidenceRunMetadata,
  reason:
    FlashSemanticEvidenceProducerFailureReason,
): FlashSemanticEvidenceProducerResult<
  FlashContradictionEvidenceInput
> {
  return {
    ok:
      false,

    evidence:
      null,

    run,

    reason,
  }
}

/**
 * Runner specializat pentru Contradictions.
 *
 * Păstrează aceeași formă de rezultat ca semantic
 * evidence producers existenți, dar inputul structural
 * este candidateSet + runId, nu SemanticDocument.
 */
export async function runFlashContradictionSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashContradictionSemanticProducer

  input:
    FlashContradictionSemanticProducerInput
}): Promise<
  FlashSemanticEvidenceProducerResult<
    FlashContradictionEvidenceInput
  >
> {
  const runId =
    input.runId.trim()

  const run =
    buildRunMetadata(
      producer,
      runId,
    )

  if (
    !runId ||
    !input.candidateSetComplete ||
    duplicateCandidateIDs(
      input.candidates,
    )
  ) {
    return failure(
      run,
      'invalid_input',
    )
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
      return failure(
        run,
        error.reason,
      )
    }

    return failure(
      run,
      'execution_error',
    )
  }
}

function promptCandidates(
  candidates:
    FlashContradictionSemanticCandidate[],
) {
  return candidates.map(
    candidate => ({
      id:
        candidate.id,

      subjectText:
        candidate.subjectText,

      firstEvidenceText:
        candidate
          .firstPosition
          .evidenceText,

      secondEvidenceText:
        candidate
          .secondPosition
          .evidenceText,
    }),
  )
}

/**
 * Promptul nu expune modelului citationId sau evidenceRef.
 *
 * Modelul vede doar:
 * - id-ul candidate-ului;
 * - claim-ul factual;
 * - cele două fragmente deja rezolvate.
 */
export function buildFlashContradictionSemanticPrompt(
  candidates:
    FlashContradictionSemanticCandidate[],
): FlashContradictionSemanticPrompt {
  const systemPrompt = [
    'You are a semantic comparison engine for an editorial Flash factual-evidence pipeline.',
    '',
    'You receive candidate pairs that were already constructed upstream from evidence associated with the SAME factual subject.',
    '',
    'Your ONLY job is to classify the semantic relationship between the two supplied evidence fragments.',
    '',
    'For every candidate return exactly:',
    '- id',
    '- relation',
    '- comparable',
    '- material',
    '',
    'Allowed relations:',
    '',
    '- materialConflict: the two fragments make materially incompatible factual statements about sufficiently comparable scope;',
    '',
    '- contestation: one position disputes, challenges, criticizes, or contests another, but the supplied evidence is not sufficient to establish a confirmed comparable material factual conflict;',
    '',
    '- contextDifference: the apparent tension is materially explained by differences such as population, time period, jurisdiction, product version, endpoint, definition, conditions, or other relevant context;',
    '',
    '- newerEvidence: one position is meaningfully later evidence that updates, supersedes, revises, or changes the evidentiary picture rather than representing a simple simultaneous conflict;',
    '',
    'comparable=true only when the two positions concern sufficiently equivalent scope for a direct factual comparison, including relevant population, period, jurisdiction, product, endpoint, definition, and conditions.',
    '',
    'material=true only when the difference would significantly change the factual conclusion or wording of the Flash claim.',
    '',
    'Important rules:',
    '- Do NOT decide which source is more trustworthy or authoritative.',
    '- Do NOT decide whether either position is ultimately true.',
    '- Do NOT assign equal weight to the two positions.',
    '- Do NOT perform source lookup.',
    '- Do NOT invent missing context.',
    '- Do NOT return citation ids.',
    '- Do NOT return evidence references.',
    '- Do NOT return subject ids.',
    '- Do NOT decide AUTO, REVIEW, BLOCK, publication status, risk level, or editorial action.',
    '',
    'Use materialConflict only when the supplied fragments themselves establish a materially incompatible comparison.',
    '',
    'A public disagreement, criticism, objection, or contestation is not automatically a materialConflict.',
    '',
    'A contextual difference or newer evidence is not automatically a materialConflict.',
    '',
    'Return exactly one case for every supplied candidate id.',
    'Do not add new ids.',
    'Do not omit ids.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary.',
    '',
    'Exact JSON shape:',
    '{"cases":[{"id":"...","relation":"contestation|materialConflict|contextDifference|newerEvidence","comparable":true|false,"material":true|false}]}',
  ].join('\n')

  const userPrompt = [
    'Classify these contradiction candidates.',
    '',
    JSON.stringify(
      {
        candidates:
          promptCandidates(
            candidates,
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

export function createFlashContradictionSemanticProducer({
  executor,
  provider,
  model,
}: FlashContradictionSemanticProducerOptions):
  FlashContradictionSemanticProducer {
  return {
    descriptor: {
      kind:
        'contradictions',

      method:
        'model',

      provider,

      model,
    },

    async produce({
      candidates,
      runId,
    }) {
      /**
       * Candidate set complet + zero candidates =
       * nu există nimic ce trebuie clasificat.
       *
       * Nu consumăm model inutil.
       */
      if (
        candidates.length ===
        0
      ) {
        return {
          cases:
            [],
        }
      }

      cleanRequiredConfig(
        provider,
      )

      cleanRequiredConfig(
        model,
      )

      const prompt =
        buildFlashContradictionSemanticPrompt(
          candidates,
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
        parseFlashContradictionSemanticOutput(
          raw,
        )

      return toFlashContradictionEvidenceInput({
        candidates,
        output,
      })
    },
  }
}
