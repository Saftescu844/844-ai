import type {
  Payload,
} from 'payload'

import {
  loadFlashDecisionContextByIdReadOnly,
  type FlashPayloadDecisionContext,
} from '../payloadDecisionContextReadOnly'

import {
  buildFlashContradictionDecisionEvidence,
  type FlashContradictionDecisionAdapterResult,
} from './contradictionDecisionAdapter'

import type {
  FlashContradictionEvidenceInput,
} from './contradictionEvidence'

import {
  buildFlashExtraordinaryClaimDecisionEvidence,
  type FlashExtraordinaryClaimDecisionAdapterResult,
} from './extraordinaryClaimDecisionAdapter'

import type {
  FlashExtraordinaryClaimEvidenceInput,
} from './extraordinaryClaimEvidence'

import {
  buildFlashVerifiedFactualDecisionEvidence,
  type FlashVerifiedFactualPipelineResult,
} from './factualSupportVerifiedPipeline'

import type {
  FlashFactualProvenanceInput,
} from './factualSupportProvenance'

import {
  buildFlashMedicalInterpretationDecisionEvidence,
  type FlashMedicalInterpretationDecisionAdapterResult,
} from './medicalInterpretationDecisionAdapter'

import type {
  FlashMedicalInterpretationEvidenceInput,
} from './medicalInterpretationEvidence'

import {
  evaluateFlashDedupByIdReadOnly,
  type FlashPayloadDedupEvaluation,
  type FlashPayloadDedupOptions,
} from './payloadDedupReadOnlyEvaluator'

import {
  runFlashSourceVerificationFromPayloadReadOnly,
  type FlashPayloadSourceVerificationRuntimeResult,
} from './payloadSourceVerificationRuntime'

import {
  buildFlashRegulatoryStatusDecisionEvidence,
  type FlashRegulatoryStatusDecisionAdapterResult,
} from './regulatoryStatusDecisionAdapter'

import type {
  FlashRegulatoryStatusEvidenceInput,
} from './regulatoryStatusEvidence'

import {
  evaluateFlashRuntimeDecision,
  type FlashRuntimeDecisionEvaluatorResult,
} from './runtimeDecisionEvaluator'

import {
  buildFlashSafetyDecisionEvidence,
  type FlashSafetyDecisionAdapterResult,
} from './safetyDecisionAdapter'

import type {
  FlashSafetyEvidenceInput,
} from './safetyEvidence'

import type {
  FlashSourceRetrieverOptions,
} from './sourceRetriever'

type FlashPayloadReader =
  Pick<
    Payload,
    'findByID' | 'find'
  >

export interface FlashRuntimeSemanticEvidenceInput {
  /**
   * null = componenta nu a rulat.
   *
   * Un obiect prezent înseamnă că evaluatorul
   * respectiv a rulat, chiar dacă rezultatul
   * conduce ulterior la REVIEW sau BLOCK.
   */
  factualSupport:
    FlashFactualProvenanceInput | null

  contradictions:
    FlashContradictionEvidenceInput | null

  safety:
    FlashSafetyEvidenceInput | null

  medicalInterpretation:
    FlashMedicalInterpretationEvidenceInput | null

  extraordinaryClaim:
    FlashExtraordinaryClaimEvidenceInput | null

  regulatoryStatus:
    FlashRegulatoryStatusEvidenceInput | null
}

export interface FlashPayloadRuntimeDecisionOptions {
  dedup?:
    FlashPayloadDedupOptions

  sourceRetriever?:
    FlashSourceRetrieverOptions
}

export interface FlashPayloadRuntimeDecisionResult {
  context:
    FlashPayloadDecisionContext

  dedup:
    FlashPayloadDedupEvaluation

  sourceVerification:
    FlashPayloadSourceVerificationRuntimeResult

  factualSupport:
    FlashVerifiedFactualPipelineResult | null

  contradictions:
    FlashContradictionDecisionAdapterResult | null

  safety:
    FlashSafetyDecisionAdapterResult | null

  medicalInterpretation:
    FlashMedicalInterpretationDecisionAdapterResult | null

  extraordinaryClaim:
    FlashExtraordinaryClaimDecisionAdapterResult | null

  regulatoryStatus:
    FlashRegulatoryStatusDecisionAdapterResult | null

  runtimeDecision:
    FlashRuntimeDecisionEvaluatorResult
}

/**
 * Orchestrator read-only pentru evaluarea unui Flash.
 *
 * Poate:
 * - citi Flash + Surse din Payload;
 * - citi alte Flash-uri pentru dedup;
 * - face HTTP retrieval controlat pentru surse.
 *
 * Nu:
 * - scrie în Payload;
 * - schimbă editorialStatus;
 * - schimbă automationDecision;
 * - publică;
 * - apelează publisher-ul legacy.
 */
export async function evaluateFlashRuntimeByIdReadOnly(
  payload:
    FlashPayloadReader,
  flashId:
    number,
  semanticEvidence:
    FlashRuntimeSemanticEvidenceInput,
  options:
    FlashPayloadRuntimeDecisionOptions = {},
): Promise<FlashPayloadRuntimeDecisionResult> {
  const context =
    await loadFlashDecisionContextByIdReadOnly(
      payload,
      flashId,
    )

  const dedup =
    await evaluateFlashDedupByIdReadOnly(
      payload,
      flashId,
      options.dedup,
    )

  const sourceVerification =
    await runFlashSourceVerificationFromPayloadReadOnly(
      payload,
      flashId,
      options.sourceRetriever,
    )

  const factualSupport =
    semanticEvidence.factualSupport ===
    null
      ? null
      : buildFlashVerifiedFactualDecisionEvidence(
          semanticEvidence
            .factualSupport,
        )

  const contradictions =
    semanticEvidence.contradictions ===
    null
      ? null
      : buildFlashContradictionDecisionEvidence(
          semanticEvidence
            .contradictions,
        )

  const safety =
    semanticEvidence.safety === null
      ? null
      : buildFlashSafetyDecisionEvidence(
          semanticEvidence.safety,
        )

  const medicalInterpretation =
    semanticEvidence
      .medicalInterpretation === null
      ? null
      : buildFlashMedicalInterpretationDecisionEvidence(
          semanticEvidence
            .medicalInterpretation,
        )

  const extraordinaryClaim =
    semanticEvidence
      .extraordinaryClaim === null
      ? null
      : buildFlashExtraordinaryClaimDecisionEvidence(
          semanticEvidence
            .extraordinaryClaim,
        )

  const regulatoryStatus =
    semanticEvidence
      .regulatoryStatus === null
      ? null
      : buildFlashRegulatoryStatusDecisionEvidence(
          semanticEvidence
            .regulatoryStatus,
        )

  const runtimeDecision =
    evaluateFlashRuntimeDecision({
      flash:
        context.flash,

      sources:
        context.sources,

      runtimeEvidence: {
        pairCompleteness:
          context
            .pairCompleteness,

        dedup: {
          dedupPassed:
            dedup.evidence
              .dedupPassed,

          obviousDuplicate:
            dedup.evidence
              .obviousDuplicate,
        },

        /**
         * completeDecisionEvidence este null pentru
         * coverage partial/notRun.
         *
         * Nu transformăm o verificare parțială
         * într-un PASS.
         */
        sourceVerification:
          sourceVerification
            .completeDecisionEvidence,

        factualSupport:
          factualSupport
            ?.decisionEvidence ??
          null,

        contradictions:
          contradictions
            ?.decisionEvidence ??
          null,

        safety:
          safety
            ?.decisionEvidence ??
          null,

        medicalInterpretation:
          medicalInterpretation
            ?.decisionEvidence ??
          null,

        extraordinaryClaim:
          extraordinaryClaim
            ?.decisionEvidence ??
          null,

        regulatoryStatus:
          regulatoryStatus
            ?.decisionEvidence ??
          null,
      },
    })

  return {
    context,
    dedup,
    sourceVerification,

    factualSupport,
    contradictions,
    safety,
    medicalInterpretation,
    extraordinaryClaim,
    regulatoryStatus,

    runtimeDecision,
  }
}
