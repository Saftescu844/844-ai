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
  FlashMedicalInterpretationEvidenceInput,
} from '../runtimeEvidence/medicalInterpretationEvidence'

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
    'safety' | 'medicalInterpretation'
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

  runtime:
    FlashPayloadRuntimeDecisionResult
}

/**
 * Wrapper read-only pentru producerea semantică
 * Safety + Medical Interpretation înainte de
 * orchestratorul runtime existent.
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
 * Nu produce PASS implicit.
 */
export async function evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
  payload,
  flashId,
  runId,
  safetyProducer,
  medicalInterpretationProducer,
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

  semanticEvidence:
    FlashRuntimeSemanticEvidenceWithoutProducedComponents

  options?:
    FlashPayloadRuntimeDecisionOptions
}): Promise<
  FlashPayloadProducedSemanticRuntimeResult
> {
  /**
   * Citim documentul editorial o singură dată
   * pentru ambii producători semantici.
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
      },
      options,
    )

  return {
    semanticDocument,
    safetyProduction,
    medicalInterpretationProduction,
    runtime,
  }
}
