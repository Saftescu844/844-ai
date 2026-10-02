import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import type {
  FlashContradictionDecisionEvidence,
} from './contradictionDecisionAdapter'

import type {
  FlashExtraordinaryClaimDecisionEvidence,
} from './extraordinaryClaimDecisionAdapter'

import type {
  FlashFactualDecisionEvidence,
} from './factualSupportDecisionAdapter'

import type {
  FlashMedicalInterpretationDecisionEvidence,
} from './medicalInterpretationDecisionAdapter'

import type {
  FlashRegulatoryStatusDecisionEvidence,
} from './regulatoryStatusDecisionAdapter'

import type {
  FlashSafetyDecisionEvidence,
} from './safetyDecisionAdapter'

import type {
  FlashSourceVerificationDecisionEvidence,
} from './sourceVerificationDecisionAdapter'

export type FlashPairCompletenessEvidence =
  Pick<
    FlashDecisionEvidence,
    | 'roComplete'
    | 'enComplete'
  >

export type FlashDedupDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    | 'dedupPassed'
    | 'obviousDuplicate'
  >

export type FlashRuntimeEvidenceComponent =
  | 'dedup'
  | 'sourceVerification'
  | 'factualSupport'
  | 'contradictions'
  | 'safety'
  | 'medicalInterpretation'
  | 'extraordinaryClaim'
  | 'regulatoryStatus'

export interface FlashRuntimeEvidenceAggregatorInput {
  pairCompleteness:
    FlashPairCompletenessEvidence

  dedup:
    FlashDedupDecisionEvidence | null

  sourceVerification:
    FlashSourceVerificationDecisionEvidence | null

  factualSupport:
    FlashFactualDecisionEvidence | null

  contradictions:
    FlashContradictionDecisionEvidence | null

  safety:
    FlashSafetyDecisionEvidence | null

  medicalInterpretation:
    FlashMedicalInterpretationDecisionEvidence | null

  extraordinaryClaim:
    FlashExtraordinaryClaimDecisionEvidence | null

  regulatoryStatus:
    FlashRegulatoryStatusDecisionEvidence | null
}

export interface FlashRuntimeEvidenceAggregatorResult {
  complete: boolean

  missingComponents:
    FlashRuntimeEvidenceComponent[]

  decisionEvidence:
    FlashDecisionEvidence
}

const missingDedup:
  FlashDedupDecisionEvidence = {
    dedupPassed: false,
    obviousDuplicate: false,
  }

const missingSourceVerification:
  FlashSourceVerificationDecisionEvidence = {
    sourceVerificationPassed: false,
  }

const missingFactualSupport:
  FlashFactualDecisionEvidence = {
    factsSupportedBySources: false,
    fabricatedInformation: false,
    fabricatedCitations: false,
  }

const missingContradictions:
  FlashContradictionDecisionEvidence = {
    materialContradictions: false,
  }

const missingSafety:
  FlashSafetyDecisionEvidence = {
    safetyGateTriggered: false,
    individualDiagnosis: false,
    individualTreatmentRecommendation: false,
    medicationChange: false,
    dangerousInstructions: false,
    fundamentalEditorialViolation: false,
  }

const missingMedicalInterpretation:
  FlashMedicalInterpretationDecisionEvidence = {
    importantMedicalInterpretation: false,
  }

const missingExtraordinaryClaim:
  FlashExtraordinaryClaimDecisionEvidence = {
    extraordinaryClaimNeedsReview: false,
  }

const missingRegulatoryStatus:
  FlashRegulatoryStatusDecisionEvidence = {
    regulatoryStatusUnclear: false,
  }

export function aggregateFlashRuntimeEvidence(
  input:
    FlashRuntimeEvidenceAggregatorInput,
): FlashRuntimeEvidenceAggregatorResult {
  const missingComponents:
    FlashRuntimeEvidenceComponent[] = []

  if (input.dedup === null) {
    missingComponents.push('dedup')
  }

  if (
    input.sourceVerification === null
  ) {
    missingComponents.push(
      'sourceVerification',
    )
  }

  if (
    input.factualSupport === null
  ) {
    missingComponents.push(
      'factualSupport',
    )
  }

  if (
    input.contradictions === null
  ) {
    missingComponents.push(
      'contradictions',
    )
  }

  if (input.safety === null) {
    missingComponents.push('safety')
  }

  if (
    input.medicalInterpretation === null
  ) {
    missingComponents.push(
      'medicalInterpretation',
    )
  }

  if (
    input.extraordinaryClaim === null
  ) {
    missingComponents.push(
      'extraordinaryClaim',
    )
  }

  if (
    input.regulatoryStatus === null
  ) {
    missingComponents.push(
      'regulatoryStatus',
    )
  }

  const complete =
    missingComponents.length === 0

  const dedup =
    input.dedup ??
    missingDedup

  const sourceVerification =
    input.sourceVerification ??
    missingSourceVerification

  const factualSupport =
    input.factualSupport ??
    missingFactualSupport

  const contradictions =
    input.contradictions ??
    missingContradictions

  const safety =
    input.safety ??
    missingSafety

  const medicalInterpretation =
    input.medicalInterpretation ??
    missingMedicalInterpretation

  const extraordinaryClaim =
    input.extraordinaryClaim ??
    missingExtraordinaryClaim

  const regulatoryStatus =
    input.regulatoryStatus ??
    missingRegulatoryStatus

  return {
    complete,
    missingComponents,

    decisionEvidence: {
      ...input.pairCompleteness,

      ...dedup,
      ...sourceVerification,
      ...factualSupport,
      ...contradictions,
      ...safety,
      ...medicalInterpretation,
      ...extraordinaryClaim,
      ...regulatoryStatus,

      engineCertain:
        complete,

      /**
       * Nu inferăm un BLOCK permanent dintr-un
       * retrieval failure, timeout sau lipsa unei
       * verificări runtime.
       *
       * Acest flag va deveni true numai când vom
       * avea o concluzie autoritativă separată că
       * sursele sunt realmente neverificabile.
       */
      unverifiableSources:
        false,
    },
  }
}
