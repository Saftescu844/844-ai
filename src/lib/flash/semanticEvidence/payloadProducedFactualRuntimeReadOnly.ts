import type {
  FlashAi,
} from '@/payload-types'

import {
  runFlashSourceVerificationFromPayloadReadOnly,
  type FlashPayloadSourceVerificationRuntimeResult,
} from '../runtimeEvidence/payloadSourceVerificationRuntime'

import {
  runFlashFactualClaimExtractionSemanticProducer,
  type FlashFactualClaimExtractionProducerResult,
  type FlashFactualClaimExtractionSemanticProducer,
} from './factualClaimExtractionSemanticProducer'

import {
  buildFlashFactualSourceChunks,
  type FlashFactualSourceChunk,
} from './factualSourceChunks'

import {
  buildFlashFactualSourceCorpus,
  type FlashFactualSourceCorpus,
} from './factualSourceCorpus'

import {
  runFlashFactualVerificationSemanticProducer,
  type FlashFactualVerificationProducerResult,
  type FlashFactualVerificationSemanticProducer,
} from './factualVerificationSemanticProducer'

import {
  evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly,
  type FlashPayloadProducedSemanticRuntimeResult,
} from './payloadProducedSemanticRuntimeReadOnly'

import {
  buildFlashSemanticDocument,
} from './semanticDocument'

type ProducedSemanticRuntimeInput =
  Parameters<
    typeof evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly
  >[0]

export type FlashRuntimeSemanticEvidenceWithoutProducedFactualComponents =
  Omit<
    ProducedSemanticRuntimeInput['semanticEvidence'],
    'factualSupport'
  >

export type FlashPayloadProducedFactualRuntimeInput =
  Omit<
    ProducedSemanticRuntimeInput,
    | 'semanticEvidence'
    | 'options'
    | 'contradictionEvidenceTextResolver'
  > & {
    factualClaimExtractionProducer:
      FlashFactualClaimExtractionSemanticProducer

    factualVerificationProducer:
      FlashFactualVerificationSemanticProducer

    semanticEvidence:
      FlashRuntimeSemanticEvidenceWithoutProducedFactualComponents

    options?:
      NonNullable<
        ProducedSemanticRuntimeInput['options']
      >
  }

export interface FlashPayloadProducedFactualRuntimeResult {
  /**
   * Source Verification executat o singură dată.
   *
   * Același obiect este injectat ulterior în
   * orchestratorul runtime.
   */
  factualSourceVerification:
    FlashPayloadSourceVerificationRuntimeResult

  factualSourceCorpus:
    FlashFactualSourceCorpus

  factualChunks:
    FlashFactualSourceChunk[]

  /**
   * false dacă retrieval/corpus/normalizare nu au
   * produs un set complet de evidence utilizabil.
   *
   * În acest caz nu consumăm modelele factuale.
   */
  factualEvidenceSetComplete:
    boolean

  factualClaimExtractionProduction:
    FlashFactualClaimExtractionProducerResult | null

  factualVerificationProduction:
    FlashFactualVerificationProducerResult | null

  semanticRuntime:
    FlashPayloadProducedSemanticRuntimeResult
}

function evidenceKey({
  citationId,
  evidenceRef,
}: {
  citationId:
    string | number

  evidenceRef:
    string
}): string {
  return [
    String(
      citationId,
    ),
    evidenceRef,
  ].join(
    '\0',
  )
}

/**
 * Wrapper read-only pentru factual production completă.
 *
 * Flux:
 *
 * Source Verification (un singur HTTP retrieval)
 *   -> Factual Source Corpus
 *   -> deterministic chunks
 *   -> factual claim extraction
 *   -> separate factual verification
 *   -> existing factual provenance/runtime pipeline
 *   -> existing contradiction pipeline
 *   -> existing semantic/runtime orchestrator
 *
 * Nu:
 * - face Payload writes;
 * - publică;
 * - schimbă statusuri;
 * - citește chei API;
 * - creează clienți AI;
 * - apelează publisher-ul legacy.
 *
 * Provider requests apar numai prin producerii
 * injectați explicit de apelant.
 */
export async function evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly(
  input:
    FlashPayloadProducedFactualRuntimeInput,
): Promise<
  FlashPayloadProducedFactualRuntimeResult
> {
  /**
   * Singura execuție Source Verification din acest flux.
   */
  const factualSourceVerification =
    await runFlashSourceVerificationFromPayloadReadOnly(
      input.payload,
      input.flashId,
      input.options
        ?.sourceRetriever,
    )

  const factualSourceCorpus =
    buildFlashFactualSourceCorpus(
      factualSourceVerification,
    )

  const factualChunkSets =
    factualSourceCorpus
      .documents
      .map(
        document =>
          buildFlashFactualSourceChunks(
            document,
          ),
      )

  const factualChunks =
    factualChunkSets.flatMap(
      chunkSet =>
        chunkSet.chunks,
    )

  /**
   * Corpus complet nu este suficient dacă normalizarea
   * unui document nu produce niciun chunk.
   *
   * Nu prezentăm un document pierdut la normalizare
   * drept evidence set complet.
   */
  const factualEvidenceSetComplete =
    factualSourceCorpus.complete &&
    factualChunkSets.every(
      chunkSet =>
        chunkSet.chunks.length >
        0,
    )

  let factualClaimExtractionProduction:
    FlashFactualClaimExtractionProducerResult | null =
      null

  let factualVerificationProduction:
    FlashFactualVerificationProducerResult | null =
      null

  if (
    factualEvidenceSetComplete
  ) {
    /**
     * Citire read-only pentru documentul semantic factual.
     *
     * Wrapperul semantic existent își păstrează propria
     * citire; nu introducem acum un refactor mai larg doar
     * pentru eliminarea unei citiri Payload ieftine.
     */
    const flash =
      await input.payload.findByID({
        collection:
          'flash-ai',

        id:
          input.flashId,

        depth:
          0,

        draft:
          true,

        overrideAccess:
          true,
      }) as FlashAi

    const factualSemanticDocument =
      buildFlashSemanticDocument(
        flash,
      )

    factualClaimExtractionProduction =
      await runFlashFactualClaimExtractionSemanticProducer({
        producer:
          input
            .factualClaimExtractionProducer,

        input: {
          document:
            factualSemanticDocument,

          runId:
            `${input.runId}:factualClaimExtraction`,
        },
      })

    if (
      factualClaimExtractionProduction.ok
    ) {
      factualVerificationProduction =
        await runFlashFactualVerificationSemanticProducer({
          producer:
            input
              .factualVerificationProducer,

          input: {
            runId:
              `${input.runId}:factualVerification`,

            generationRunId:
              factualClaimExtractionProduction
                .run
                .runId,

            evidenceSetComplete:
              true,

            claims:
              factualClaimExtractionProduction
                .extraction
                .claims,

            chunks:
              factualChunks,
          },
        })
    }
  }

  const factualSupport =
    factualVerificationProduction?.ok ===
    true
      ? factualVerificationProduction
          .provenance
      : null

  /**
   * Contradictions trebuie să poată rezolva evidenceRef
   * exact din aceleași chunks folosite la factual
   * verification, fără alt retrieval.
   */
  const evidenceTextByRef =
    new Map<
      string,
      string
    >(
      factualChunks.map(
        chunk => [
          evidenceKey({
            citationId:
              chunk.citationId,

            evidenceRef:
              chunk.evidenceRef,
          }),

          chunk.evidenceText,
        ],
      ),
    )

  const contradictionEvidenceTextResolver:
    ProducedSemanticRuntimeInput[
      'contradictionEvidenceTextResolver'
    ] =
      async ({
        citationId,
        evidenceRef,
      }) =>
        evidenceTextByRef.get(
          evidenceKey({
            citationId,
            evidenceRef,
          }),
        ) ??
        null

  const semanticRuntime =
    await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
      payload:
        input.payload,

      flashId:
        input.flashId,

      runId:
        input.runId,

      safetyProducer:
        input.safetyProducer,

      medicalInterpretationProducer:
        input.medicalInterpretationProducer,

      extraordinaryClaimProducer:
        input.extraordinaryClaimProducer,

      regulatoryStatusProducer:
        input.regulatoryStatusProducer,

      ...(
        input.contradictionProducer ===
        undefined
          ? {}
          : {
              contradictionProducer:
                input.contradictionProducer,
            }
      ),

      contradictionEvidenceTextResolver,

      semanticEvidence: {
        ...input.semanticEvidence,

        factualSupport,
      },

      options: {
        ...(
          input.options ??
          {}
        ),

        /**
         * Critic:
         * orchestratorul primește exact rezultatul
         * calculat mai sus și NU mai face HTTP retrieval.
         */
        precomputedSourceVerification:
          factualSourceVerification,
      },
    })

  return {
    factualSourceVerification,
    factualSourceCorpus,
    factualChunks,
    factualEvidenceSetComplete,
    factualClaimExtractionProduction,
    factualVerificationProduction,
    semanticRuntime,
  }
}
