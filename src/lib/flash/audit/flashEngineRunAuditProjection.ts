import type {
  FlashAutomationDecision,
  FlashDecisionInput,
  FlashDecisionReason,
} from '../decisionEngine'

import type {
  FlashRuntimeEvidenceComponent,
} from '../runtimeEvidence/runtimeEvidenceAggregator'

import type {
  FlashSemanticEvidenceProducerFailureReason,
} from '../semanticEvidence/semanticEvidenceProducer'

import {
  classifyFlashProducerFailureRecovery,
  type FlashProducerRecoveryDisposition,
} from '../resilience/classifyProducerFailureRecovery'

export type FlashEngineRunProducerStatus =
  | 'completed'
  | 'failed'
  | 'notRun'

type ProducerResult =
  | {
      ok: true
    }
  | {
      ok: false

      reason:
        FlashSemanticEvidenceProducerFailureReason
    }
  | null

type RequiredProducerResult =
  Exclude<
    ProducerResult,
    null
  >

/**
 * Contract structural minim pentru proiecția de audit.
 *
 * Rezultatul complet al runtime-ului factual este
 * compatibil cu acest contract, dar adapterul vede și
 * persistă numai informația explicit necesară auditului.
 */
export interface FlashEngineRunAuditProjectionInput {
  factualEvidenceSetComplete:
    boolean

  factualSourceCorpus: {
    complete:
      boolean

    documents:
      readonly unknown[]
  }

  factualChunks:
    readonly unknown[]

  factualClaimExtractionProduction:
    ProducerResult

  factualVerificationProduction:
    ProducerResult

  semanticRuntime: {
    contradictionProduction:
      ProducerResult

    safetyProduction:
      RequiredProducerResult

    medicalInterpretationProduction:
      RequiredProducerResult

    extraordinaryClaimProduction:
      RequiredProducerResult

    regulatoryStatusProduction:
      RequiredProducerResult

    runtime: {
      runtimeDecision: {
        aggregatedEvidence: {
          complete:
            boolean

          missingComponents:
            FlashRuntimeEvidenceComponent[]
        }

        decisionInput:
          FlashDecisionInput

        decision: {
          decision:
            FlashAutomationDecision

          reasons:
            FlashDecisionReason[]
        }
      }
    }
  }
}

export interface FlashEngineRunCompletedAuditProjection {
  decision:
    FlashAutomationDecision

  reasons:
    {
      reason:
        FlashDecisionReason
    }[]

  decisionInputSnapshot:
    FlashDecisionInput

  evidenceSummary: {
    factual: {
      evidenceSetComplete:
        boolean

      sourceCorpusComplete:
        boolean

      sourceDocumentCount:
        number

      chunkCount:
        number

      claimExtraction:
        FlashEngineRunProducerStatus

      claimExtractionFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      claimExtractionRecoveryDisposition:
        FlashProducerRecoveryDisposition | null

      verification:
        FlashEngineRunProducerStatus

      verificationFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      verificationRecoveryDisposition:
        FlashProducerRecoveryDisposition | null
    }

    semantic: {
      contradictions:
        FlashEngineRunProducerStatus

      contradictionsFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      contradictionsRecoveryDisposition:
        FlashProducerRecoveryDisposition | null

      safety:
        FlashEngineRunProducerStatus

      safetyFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      safetyRecoveryDisposition:
        FlashProducerRecoveryDisposition | null

      medicalInterpretation:
        FlashEngineRunProducerStatus

      medicalInterpretationFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      medicalInterpretationRecoveryDisposition:
        FlashProducerRecoveryDisposition | null

      extraordinaryClaim:
        FlashEngineRunProducerStatus

      extraordinaryClaimFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      extraordinaryClaimRecoveryDisposition:
        FlashProducerRecoveryDisposition | null

      regulatoryStatus:
        FlashEngineRunProducerStatus

      regulatoryStatusFailureReason:
        FlashSemanticEvidenceProducerFailureReason | null

      regulatoryStatusRecoveryDisposition:
        FlashProducerRecoveryDisposition | null
    }

    runtime: {
      aggregatedEvidenceComplete:
        boolean

      engineCertain:
        boolean

      missingComponents:
        FlashRuntimeEvidenceComponent[]
    }
  }
}

function producerStatus(
  result:
    ProducerResult,
): FlashEngineRunProducerStatus {
  if (result === null) {
    return 'notRun'
  }

  return result.ok
    ? 'completed'
    : 'failed'
}

function producerFailureReason(
  result:
    ProducerResult,
): FlashSemanticEvidenceProducerFailureReason | null {
  if (
    result === null ||
    result.ok
  ) {
    return null
  }

  return result.reason
}

function producerRecoveryDisposition(
  result:
    ProducerResult,
): FlashProducerRecoveryDisposition | null {
  const reason =
    producerFailureReason(
      result,
    )

  return reason === null
    ? null
    : classifyFlashProducerFailureRecovery(
        reason,
      )
}

/**
 * Construiește proiecția persistentă pentru un run
 * finalizat cu succes la nivel de orchestrare.
 *
 * Intenționat NU copiază:
 * - textul documentelor sursă;
 * - factual chunks / evidenceText;
 * - semanticDocument;
 * - răspunsuri brute ale providerului;
 * - obiectele complete ale producerilor.
 */
export function buildFlashEngineRunCompletedAuditProjection(
  input:
    FlashEngineRunAuditProjectionInput,
): FlashEngineRunCompletedAuditProjection {
  const runtimeDecision =
    input
      .semanticRuntime
      .runtime
      .runtimeDecision

  return {
    decision:
      runtimeDecision
        .decision
        .decision,

    reasons:
      runtimeDecision
        .decision
        .reasons
        .map(
          reason => ({
            reason,
          }),
        ),

    decisionInputSnapshot:
      runtimeDecision
        .decisionInput,

    evidenceSummary: {
      factual: {
        evidenceSetComplete:
          input
            .factualEvidenceSetComplete,

        sourceCorpusComplete:
          input
            .factualSourceCorpus
            .complete,

        sourceDocumentCount:
          input
            .factualSourceCorpus
            .documents
            .length,

        chunkCount:
          input
            .factualChunks
            .length,

        claimExtraction:
          producerStatus(
            input
              .factualClaimExtractionProduction,
          ),

        claimExtractionFailureReason:
          producerFailureReason(
            input
              .factualClaimExtractionProduction,
          ),

        claimExtractionRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .factualClaimExtractionProduction,
          ),

        verification:
          producerStatus(
            input
              .factualVerificationProduction,
          ),

        verificationFailureReason:
          producerFailureReason(
            input
              .factualVerificationProduction,
          ),

        verificationRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .factualVerificationProduction,
          ),
      },

      semantic: {
        contradictions:
          producerStatus(
            input
              .semanticRuntime
              .contradictionProduction,
          ),

        contradictionsFailureReason:
          producerFailureReason(
            input
              .semanticRuntime
              .contradictionProduction,
          ),

        contradictionsRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .semanticRuntime
              .contradictionProduction,
          ),

        safety:
          producerStatus(
            input
              .semanticRuntime
              .safetyProduction,
          ),

        safetyFailureReason:
          producerFailureReason(
            input
              .semanticRuntime
              .safetyProduction,
          ),

        safetyRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .semanticRuntime
              .safetyProduction,
          ),

        medicalInterpretation:
          producerStatus(
            input
              .semanticRuntime
              .medicalInterpretationProduction,
          ),

        medicalInterpretationFailureReason:
          producerFailureReason(
            input
              .semanticRuntime
              .medicalInterpretationProduction,
          ),

        medicalInterpretationRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .semanticRuntime
              .medicalInterpretationProduction,
          ),

        extraordinaryClaim:
          producerStatus(
            input
              .semanticRuntime
              .extraordinaryClaimProduction,
          ),

        extraordinaryClaimFailureReason:
          producerFailureReason(
            input
              .semanticRuntime
              .extraordinaryClaimProduction,
          ),

        extraordinaryClaimRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .semanticRuntime
              .extraordinaryClaimProduction,
          ),

        regulatoryStatus:
          producerStatus(
            input
              .semanticRuntime
              .regulatoryStatusProduction,
          ),

        regulatoryStatusFailureReason:
          producerFailureReason(
            input
              .semanticRuntime
              .regulatoryStatusProduction,
          ),

        regulatoryStatusRecoveryDisposition:
          producerRecoveryDisposition(
            input
              .semanticRuntime
              .regulatoryStatusProduction,
          ),
      },

      runtime: {
        aggregatedEvidenceComplete:
          runtimeDecision
            .aggregatedEvidence
            .complete,

        engineCertain:
          runtimeDecision
            .decisionInput
            .engineCertain,

        missingComponents: [
          ...runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ],
      },
    },
  }
}
