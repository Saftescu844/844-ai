import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

import {
  evaluateFlashRuntimeByIdReadOnly,
  type FlashPayloadRuntimeDecisionOptions,
  type FlashPayloadRuntimeDecisionResult,
  type FlashRuntimeSemanticEvidenceInput,
} from '../runtimeEvidence/payloadRuntimeDecisionOrchestrator'

import type {
  FlashContradictionEvidenceInput,
} from '../runtimeEvidence/contradictionEvidence'

import type {
  FlashExtraordinaryClaimEvidenceInput,
} from '../runtimeEvidence/extraordinaryClaimEvidence'

import type {
  FlashMedicalInterpretationEvidenceInput,
} from '../runtimeEvidence/medicalInterpretationEvidence'

import type {
  FlashRegulatoryStatusEvidenceInput,
} from '../runtimeEvidence/regulatoryStatusEvidence'

import type {
  FlashSafetyEvidenceInput,
} from '../runtimeEvidence/safetyEvidence'

import {
  buildFlashContradictionSemanticCandidatesFromFactualProvenance,
  type FlashContradictionCandidateBridgeResult,
  type FlashContradictionEvidenceTextResolver,
} from './contradictionCandidateBridge'

import {
  runFlashContradictionSemanticProducer,
  type FlashContradictionSemanticProducer,
} from './contradictionSemanticProducer'

import {
  buildFlashSemanticDocument,
  type FlashSemanticDocument,
} from './semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
  type FlashSemanticEvidenceProducer,
  type FlashSemanticEvidenceProducerResult,
} from './semanticEvidenceProducer'

type FlashPayloadReader =
  Pick<
    Payload,
    'findByID' | 'find'
  >

export type FlashRuntimeSemanticEvidenceWithoutProducedComponents =
  Omit<
    FlashRuntimeSemanticEvidenceInput,
    | 'contradictions'
    | 'safety'
    | 'medicalInterpretation'
    | 'extraordinaryClaim'
    | 'regulatoryStatus'
  >

export interface FlashPayloadProducedSemanticRuntimeResult {
  semanticDocument:
    FlashSemanticDocument

  contradictionBridge:
    FlashContradictionCandidateBridgeResult | null

  contradictionProduction:
    FlashSemanticEvidenceProducerResult<
      FlashContradictionEvidenceInput
    > | null

  safetyProduction:
    FlashSemanticEvidenceProducerResult<
      FlashSafetyEvidenceInput
    >

  medicalInterpretationProduction:
    FlashSemanticEvidenceProducerResult<
      FlashMedicalInterpretationEvidenceInput
    >

  extraordinaryClaimProduction:
    FlashSemanticEvidenceProducerResult<
      FlashExtraordinaryClaimEvidenceInput
    >

  regulatoryStatusProduction:
    FlashSemanticEvidenceProducerResult<
      FlashRegulatoryStatusEvidenceInput
    >

  runtime:
    FlashPayloadRuntimeDecisionResult
}

/**
 * Wrapper read-only pentru producerea semantică
 * înainte de orchestratorul runtime existent.
 *
 * Produce independent:
 * - Contradictions, din factual provenance;
 * - Safety;
 * - Medical Interpretation;
 * - Extraordinary Claim;
 * - Regulatory Status.
 *
 * Nu:
 * - modifică orchestratorul stabil;
 * - scrie în Payload;
 * - schimbă editorialStatus;
 * - schimbă automationDecision;
 * - publică;
 * - apelează publisher-ul legacy.
 *
 * Un producer eșuat devine doar componenta sa null.
 * Nu produce PASS implicit și nu invalidează
 * componentele produse cu succes.
 */
export async function evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
  payload,
  flashId,
  runId,
  safetyProducer,
  medicalInterpretationProducer,
  extraordinaryClaimProducer,
  regulatoryStatusProducer,
  contradictionProducer,
  contradictionEvidenceTextResolver,
  semanticEvidence,
  options = {},
}: {
  payload:
    FlashPayloadReader

  flashId:
    number

  runId:
    string

  safetyProducer:
    FlashSemanticEvidenceProducer<
      FlashSafetyEvidenceInput
    >

  medicalInterpretationProducer:
    FlashSemanticEvidenceProducer<
      FlashMedicalInterpretationEvidenceInput
    >

  extraordinaryClaimProducer:
    FlashSemanticEvidenceProducer<
      FlashExtraordinaryClaimEvidenceInput
    >

  regulatoryStatusProducer:
    FlashSemanticEvidenceProducer<
      FlashRegulatoryStatusEvidenceInput
    >

  contradictionProducer?:
    FlashContradictionSemanticProducer

  contradictionEvidenceTextResolver?:
    FlashContradictionEvidenceTextResolver

  semanticEvidence:
    FlashRuntimeSemanticEvidenceWithoutProducedComponents

  options?:
    FlashPayloadRuntimeDecisionOptions
}): Promise<
  FlashPayloadProducedSemanticRuntimeResult
> {
  /**
   * Citim documentul editorial o singură dată
   * pentru toți producătorii semantici.
   */
  const flash =
    await payload.findByID({
      collection:
        'flash-ai',

      id:
        flashId,

      depth:
        0,

      draft:
        true,

      overrideAccess:
        true,
    }) as FlashAi

  const semanticDocument =
    buildFlashSemanticDocument(
      flash,
    )

  const safetyProduction =
    await runFlashSemanticEvidenceProducer({
      producer:
        safetyProducer,

      input: {
        document:
          semanticDocument,

        runId:
          `${runId}:safety`,
      },
    })

  const medicalInterpretationProduction =
    await runFlashSemanticEvidenceProducer({
      producer:
        medicalInterpretationProducer,

      input: {
        document:
          semanticDocument,

        runId:
          `${runId}:medicalInterpretation`,
      },
    })

  const extraordinaryClaimProduction =
    await runFlashSemanticEvidenceProducer({
      producer:
        extraordinaryClaimProducer,

      input: {
        document:
          semanticDocument,

        runId:
          `${runId}:extraordinaryClaim`,
      },
    })

  const regulatoryStatusProduction =
    await runFlashSemanticEvidenceProducer({
      producer:
        regulatoryStatusProducer,

      input: {
        document:
          semanticDocument,

        runId:
          `${runId}:regulatoryStatus`,
      },
    })

  /**
   * Contradictions reutilizează exact factual provenance
   * primit deja de runtime.
   *
   * Nu există un al doilea input factual paralel.
   */
  const contradictionBridge =
    semanticEvidence.factualSupport ===
      null ||
    contradictionEvidenceTextResolver ===
      undefined
      ? null
      : await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
          input:
            semanticEvidence.factualSupport,

          resolveEvidenceText:
            contradictionEvidenceTextResolver,
        })

  /**
   * Un bridge incomplet NU devine cases: [].
   *
   * Doar un candidate set complet poate fi trimis
   * producerului semantic.
   */
  const contradictionProduction =
    contradictionBridge !== null &&
    contradictionBridge.complete &&
    contradictionProducer !==
      undefined
      ? await runFlashContradictionSemanticProducer({
          producer:
            contradictionProducer,

          input: {
            runId:
              `${runId}:contradictions`,

            candidateSetComplete:
              true,

            candidates:
              contradictionBridge.candidates,
          },
        })
      : null

  const runtime =
    await evaluateFlashRuntimeByIdReadOnly(
      payload,
      flashId,
      {
        ...semanticEvidence,

        contradictions:
          contradictionProduction?.ok ===
          true
            ? contradictionProduction.evidence
            : null,

        safety:
          safetyProduction.ok
            ? safetyProduction.evidence
            : null,

        medicalInterpretation:
          medicalInterpretationProduction.ok
            ? medicalInterpretationProduction.evidence
            : null,

        extraordinaryClaim:
          extraordinaryClaimProduction.ok
            ? extraordinaryClaimProduction.evidence
            : null,

        regulatoryStatus:
          regulatoryStatusProduction.ok
            ? regulatoryStatusProduction.evidence
            : null,
      },
      options,
    )

  return {
    semanticDocument,
    contradictionBridge,
    contradictionProduction,
    safetyProduction,
    medicalInterpretationProduction,
    extraordinaryClaimProduction,
    regulatoryStatusProduction,
    runtime,
  }
}
