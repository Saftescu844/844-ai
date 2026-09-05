import type {
  FlashFactualProvenanceInput,
} from '../runtimeEvidence/factualSupportProvenance'

import type {
  FlashFactualSourceChunk,
} from './factualSourceChunks'

import {
  buildFlashFactualVerificationProvenance,
  type FlashFactualVerificationClaimInput,
} from './factualVerificationAssembler'

import {
  parseFlashFactualVerificationSemanticOutput,
} from './factualVerificationSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducerFailureReason,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface FlashFactualVerificationSemanticProducerInput {
  /**
   * Rularea verificatorului factual.
   *
   * Devine verificationRunId în provenance.
   */
  runId:
    string

  /**
   * Rularea distinctă care a extras claims.
   */
  generationRunId:
    string

  /**
   * false înseamnă că upstream nu a putut construi
   * setul complet de evidence disponibil.
   *
   * Un set parțial nu poate fi tratat drept
   * "notFound" sau "unverifiable".
   */
  evidenceSetComplete:
    boolean

  claims:
    FlashFactualVerificationClaimInput[]

  chunks:
    FlashFactualSourceChunk[]
}

export interface FlashFactualVerificationSemanticProducerDescriptor {
  stage:
    'factualVerification'

  method:
    'model'

  provider:
    string

  model:
    string
}

export interface FlashFactualVerificationSemanticProducer {
  descriptor:
    FlashFactualVerificationSemanticProducerDescriptor

  produce(
    input:
      FlashFactualVerificationSemanticProducerInput,
  ): Promise<
    FlashFactualProvenanceInput
  >
}

export interface FlashFactualVerificationSemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashFactualVerificationSemanticPrompt {
  systemPrompt:
    string

  userPrompt:
    string
}

export interface FlashFactualVerificationRunMetadata {
  stage:
    'factualVerification'

  method:
    'model'

  runId:
    string

  generationRunId:
    string

  provider:
    string | null

  model:
    string | null
}

export interface FlashFactualVerificationProducerSuccess {
  ok:
    true

  provenance:
    FlashFactualProvenanceInput

  run:
    FlashFactualVerificationRunMetadata
}

export interface FlashFactualVerificationProducerFailure {
  ok:
    false

  provenance:
    null

  run:
    FlashFactualVerificationRunMetadata

  reason:
    FlashSemanticEvidenceProducerFailureReason
}

export type FlashFactualVerificationProducerResult =
  | FlashFactualVerificationProducerSuccess
  | FlashFactualVerificationProducerFailure

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

function chunkOccurrenceKey(
  chunk:
    Pick<
      FlashFactualSourceChunk,
      'chunkId' | 'chunkIndex'
    >,
): string {
  return [
    chunk.chunkId,
    String(
      chunk.chunkIndex,
    ),
  ].join(
    '\0',
  )
}

function duplicateClaimIDs(
  claims:
    FlashFactualVerificationClaimInput[],
): boolean {
  const ids =
    claims.map(
      claim =>
        claim.id,
    )

  return (
    new Set(
      ids,
    ).size !==
    ids.length
  )
}

function duplicateChunkOccurrences(
  chunks:
    FlashFactualSourceChunk[],
): boolean {
  const keys =
    chunks.map(
      chunk =>
        chunkOccurrenceKey(
          chunk,
        ),
    )

  return (
    new Set(
      keys,
    ).size !==
    keys.length
  )
}

function buildRunMetadata(
  producer:
    FlashFactualVerificationSemanticProducer,
  runId:
    string,
  generationRunId:
    string,
): FlashFactualVerificationRunMetadata {
  return {
    stage:
      'factualVerification',

    method:
      'model',

    runId,

    generationRunId,

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

function failure(
  run:
    FlashFactualVerificationRunMetadata,
  reason:
    FlashSemanticEvidenceProducerFailureReason,
): FlashFactualVerificationProducerFailure {
  return {
    ok:
      false,

    provenance:
      null,

    run,

    reason,
  }
}

function promptClaims(
  claims:
    FlashFactualVerificationClaimInput[],
) {
  return claims.map(
    claim => ({
      claimId:
        claim.id,

      claimText:
        claim.text,
    }),
  )
}

function promptChunks(
  chunks:
    FlashFactualSourceChunk[],
) {
  return chunks.map(
    chunk => ({
      chunkId:
        chunk.chunkId,

      chunkIndex:
        chunk.chunkIndex,

      evidenceText:
        chunk.evidenceText,
    }),
  )
}

/**
 * Prompt provider-agnostic pentru factual verification.
 *
 * Modelul vede textul claims și evidence chunks,
 * dar nu primește trusted runtime locators.
 */
export function buildFlashFactualVerificationSemanticPrompt({
  claims,
  chunks,
}: {
  claims:
    FlashFactualVerificationClaimInput[]

  chunks:
    FlashFactualSourceChunk[]
}): FlashFactualVerificationSemanticPrompt {
  const systemPrompt = [
    'You are a factual verification engine for an editorial Flash evidence pipeline.',
    '',
    'You receive factual claims extracted in a separate generation run and trusted source chunks prepared by application code.',
    '',
    'Your ONLY job is to classify how EACH supplied source chunk relates to EACH supplied factual claim.',
    '',
    'Allowed verdicts:',
    '- supports: the chunk directly supports the material factual claim as stated;',
    '- partiallySupports: the chunk supports a meaningful part of the claim, but not the complete material claim or only a materially narrower scope;',
    '- contradicts: the chunk makes a materially incompatible factual statement about the claim;',
    '- notFound: the chunk does not provide sufficient relevant evidence for the claim.',
    '',
    'Important rules:',
    '- Evaluate only the supplied claim text and supplied evidenceText.',
    '- Do NOT perform source lookup.',
    '- Do NOT use outside knowledge.',
    '- Do NOT rank source trust or authority.',
    '- Do NOT infer support from missing information.',
    '- Do NOT interpret unrelated evidence as partial support.',
    '- Do NOT decide the final supportStatus.',
    '- Do NOT decide whether information is fabricated.',
    '- Do NOT decide AUTO, REVIEW, BLOCK, publication status, risk level, or editorial action.',
    '',
    'Coverage rules:',
    '- Return exactly one claim object for every supplied claimId.',
    '- Inside each claim, return exactly one check for every supplied chunk occurrence.',
    '- Copy claimId, chunkId, and chunkIndex only from the supplied input.',
    '- Do not add ids.',
    '- Do not omit ids.',
    '- Do not evaluate the same chunk occurrence more than once for one claim.',
    '',
    'Trusted identity rules:',
    '- Do NOT return citationId.',
    '- Do NOT return evidenceRef.',
    '- Do NOT return source URL.',
    '- Do NOT return supportStatus.',
    '- Do NOT return generationRunId.',
    '- Do NOT return verificationRunId.',
    '- Application code reconstructs all trusted provenance fields.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary.',
    '',
    'Exact JSON shape:',
    '{"claims":[{"claimId":"...","checks":[{"chunkId":"...","chunkIndex":0,"verdict":"supports|partiallySupports|contradicts|notFound"}]}]}',
  ].join(
    '\n',
  )

  const userPrompt = [
    'Verify every factual claim against every supplied trusted source chunk.',
    '',
    JSON.stringify(
      {
        claims:
          promptClaims(
            claims,
          ),

        chunks:
          promptChunks(
            chunks,
          ),
      },
      null,
      2,
    ),
  ].join(
    '\n',
  )

  return {
    systemPrompt,
    userPrompt,
  }
}

export function createFlashFactualVerificationSemanticProducer({
  executor,
  provider,
  model,
}: FlashFactualVerificationSemanticProducerOptions):
  FlashFactualVerificationSemanticProducer {
  return {
    descriptor: {
      stage:
        'factualVerification',

      method:
        'model',

      provider,

      model,
    },

    async produce({
      runId,
      generationRunId,
      claims,
      chunks,
    }) {
      /**
       * Fără claims nu există nimic de verificat.
       *
       * Provenance validatorul existent va decide ulterior
       * semnificația factuală a no_claims.
       */
      if (
        claims.length ===
        0
      ) {
        return {
          claims:
            [],

          verifications:
            [],
        }
      }

      /**
       * Set complet + zero chunks =
       * claims sunt unverifiable în această etapă.
       *
       * Nu consumăm modelul pentru un produs cartezian gol.
       */
      if (
        chunks.length ===
        0
      ) {
        return buildFlashFactualVerificationProvenance({
          claims,

          chunks,

          output: {
            claims:
              claims.map(
                claim => ({
                  claimId:
                    claim.id,

                  checks:
                    [],
                }),
              ),
          },

          generationRunId,

          verificationRunId:
            runId,
        })
      }

      cleanRequiredConfig(
        provider,
      )

      cleanRequiredConfig(
        model,
      )

      const prompt =
        buildFlashFactualVerificationSemanticPrompt({
          claims,
          chunks,
        })

      const raw =
        await executor({
          runId,

          systemPrompt:
            prompt.systemPrompt,

          userPrompt:
            prompt.userPrompt,
        })

      const output =
        parseFlashFactualVerificationSemanticOutput(
          raw,
        )

      return buildFlashFactualVerificationProvenance({
        claims,

        chunks,

        output,

        generationRunId,

        verificationRunId:
          runId,
      })
    },
  }
}

/**
 * Runner specializat pentru factual verification.
 *
 * Nu folosim generic FlashSemanticEvidenceKind deoarece
 * factualVerification este un pas intern al factualSupport,
 * nu o componentă semantică finală din Decision Engine.
 */
export async function runFlashFactualVerificationSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashFactualVerificationSemanticProducer

  input:
    FlashFactualVerificationSemanticProducerInput
}): Promise<
  FlashFactualVerificationProducerResult
> {
  const runId =
    input.runId.trim()

  const generationRunId =
    input.generationRunId.trim()

  const run =
    buildRunMetadata(
      producer,
      runId,
      generationRunId,
    )

  if (
    !runId ||
    !generationRunId ||
    runId ===
      generationRunId ||
    !input.evidenceSetComplete ||
    duplicateClaimIDs(
      input.claims,
    ) ||
    duplicateChunkOccurrences(
      input.chunks,
    )
  ) {
    return failure(
      run,
      'invalid_input',
    )
  }

  try {
    const provenance =
      await producer.produce({
        ...input,

        runId,

        generationRunId,
      })

    return {
      ok:
        true,

      provenance,

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
