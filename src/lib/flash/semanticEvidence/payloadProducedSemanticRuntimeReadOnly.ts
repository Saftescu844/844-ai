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
    | 'safety'
    | 'medicalInterpretation'
    | 'extraordinaryClaim'
    | 'regulatoryStatus'
  >

export interface FlashPayloadProducedSemanticRuntimeResult {
  semanticDocument:
    FlashSemanticDocument

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

  const runtime =
    await evaluateFlashRuntimeByIdReadOnly(
      payload,
      flashId,
      {
        ...semanticEvidence,

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
    safetyProduction,
    medicalInterpretationProduction,
    extraordinaryClaimProduction,
    regulatoryStatusProduction,
    runtime,
  }
}
