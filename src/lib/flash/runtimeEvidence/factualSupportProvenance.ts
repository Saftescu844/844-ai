import type {
  FactualCitationID,
  FactualSupportStatus,
  FlashFactualClaim,
} from './factualSupportEvidence'

export type FactualVerificationMethod =
  | 'deterministic'
  | 'separateModelPass'
  | 'human'

export type CitationCheckVerdict =
  | 'supports'
  | 'partiallySupports'
  | 'contradicts'
  | 'notFound'

export interface FlashClaimCandidate {
  id: string
  text: string
  citationIds?: FactualCitationID[]
}

export interface FlashCitationCheck {
  citationId: FactualCitationID
  verdict: CitationCheckVerdict

  /**
   * Locator runtime către dovada concretă din sursă:
   * secțiune, paragraf, fragment hash etc.
   *
   * Nu este necesar să fie textul integral al sursei.
   */
  evidenceRef: string
}

export interface FlashClaimVerification {
  claimId: string
  supportStatus: FactualSupportStatus

  method: FactualVerificationMethod

  generationRunId?: string | null
  verificationRunId?: string | null

  citationChecks: FlashCitationCheck[]

  /**
   * Aceste semnale pot produce BLOCK în Decision Engine.
   * În v1 nu acceptăm o constatare exclusiv model-only.
   */
  explicitlyFabricated?: boolean
  fabricatedCitation?: boolean
}

export interface FlashFactualProvenanceInput {
  claims: FlashClaimCandidate[]
  verifications: FlashClaimVerification[]
}

export type FactualProvenanceReason =
  | 'no_claims'
  | 'duplicate_claim_id'
  | 'missing_verification'
  | 'duplicate_verification'
  | 'unknown_claim'
  | 'missing_verification_run'
  | 'same_generation_and_verification_run'
  | 'unknown_citation'
  | 'missing_evidence_ref'
  | 'supported_without_supporting_evidence'
  | 'supported_with_contradicting_evidence'
  | 'contradicted_without_contradicting_evidence'
  | 'model_only_fabrication_not_authoritative'

export interface FlashFactualProvenanceResult {
  valid: boolean
  reasons: FactualProvenanceReason[]
  verifiedClaims: FlashFactualClaim[]
}

function cleanRunID(
  value: string | null | undefined,
): string | null {
  const cleaned = value?.trim()

  return cleaned
    ? cleaned
    : null
}

function hasDuplicateStrings(
  values: string[],
): boolean {
  return new Set(values).size !== values.length
}

export function validateFlashFactualProvenance(
  input: FlashFactualProvenanceInput,
): FlashFactualProvenanceResult {
  const reasons =
    new Set<FactualProvenanceReason>()

  if (input.claims.length === 0) {
    reasons.add('no_claims')
  }

  const claimIDs =
    input.claims.map(claim => claim.id)

  if (hasDuplicateStrings(claimIDs)) {
    reasons.add('duplicate_claim_id')
  }

  const verificationIDs =
    input.verifications.map(
      verification => verification.claimId,
    )

  if (
    hasDuplicateStrings(
      verificationIDs,
    )
  ) {
    reasons.add(
      'duplicate_verification',
    )
  }

  const claimsByID =
    new Map(
      input.claims.map(
        claim => [claim.id, claim],
      ),
    )

  const verificationsByClaimID =
    new Map(
      input.verifications.map(
        verification => [
          verification.claimId,
          verification,
        ],
      ),
    )

  for (
    const verification
    of input.verifications
  ) {
    if (
      !claimsByID.has(
        verification.claimId,
      )
    ) {
      reasons.add('unknown_claim')
    }
  }

  const verifiedClaims:
    FlashFactualClaim[] = []

  for (const claim of input.claims) {
    const verification =
      verificationsByClaimID.get(
        claim.id,
      )

    if (!verification) {
      reasons.add(
        'missing_verification',
      )
      continue
    }

    if (
      verification.method ===
      'separateModelPass'
    ) {
      const generationRunID =
        cleanRunID(
          verification.generationRunId,
        )

      const verificationRunID =
        cleanRunID(
          verification.verificationRunId,
        )

      if (
        !generationRunID ||
        !verificationRunID
      ) {
        reasons.add(
          'missing_verification_run',
        )
      } else if (
        generationRunID ===
        verificationRunID
      ) {
        reasons.add(
          'same_generation_and_verification_run',
        )
      }

      if (
        verification.explicitlyFabricated ===
          true ||
        verification.fabricatedCitation ===
          true
      ) {
        reasons.add(
          'model_only_fabrication_not_authoritative',
        )
      }
    }

    const declaredCitationIDs =
      new Set(
        (claim.citationIds ?? [])
          .map(String),
      )

    for (
      const check
      of verification.citationChecks
    ) {
      if (
        !declaredCitationIDs.has(
          String(check.citationId),
        )
      ) {
        reasons.add(
          'unknown_citation',
        )
      }

      if (
        check.evidenceRef.trim()
          .length === 0
      ) {
        reasons.add(
          'missing_evidence_ref',
        )
      }
    }

    if (
      verification.supportStatus ===
      'supported'
    ) {
      const hasSupportingEvidence =
        verification.citationChecks
          .some(
            check =>
              check.verdict ===
              'supports',
          )

      if (!hasSupportingEvidence) {
        reasons.add(
          'supported_without_supporting_evidence',
        )
      }

      const hasContradictingEvidence =
        verification.citationChecks
          .some(
            check =>
              check.verdict ===
              'contradicts',
          )

      if (hasContradictingEvidence) {
        reasons.add(
          'supported_with_contradicting_evidence',
        )
      }
    }

    if (
      verification.supportStatus ===
      'contradicted'
    ) {
      const hasContradictingEvidence =
        verification.citationChecks
          .some(
            check =>
              check.verdict ===
              'contradicts',
          )

      if (!hasContradictingEvidence) {
        reasons.add(
          'contradicted_without_contradicting_evidence',
        )
      }
    }

    verifiedClaims.push({
      id: claim.id,
      text: claim.text,
      citationIds:
        claim.citationIds,
      supportStatus:
        verification.supportStatus,

      explicitlyFabricated:
        verification.method ===
          'separateModelPass'
          ? false
          : verification
              .explicitlyFabricated ===
            true,

      fabricatedCitation:
        verification.method ===
          'separateModelPass'
          ? false
          : verification
              .fabricatedCitation ===
            true,
    })
  }

  return {
    valid: reasons.size === 0,
    reasons: [...reasons],
    verifiedClaims,
  }
}
