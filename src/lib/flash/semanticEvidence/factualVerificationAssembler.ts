import type {
  FactualSupportStatus,
} from '../runtimeEvidence/factualSupportEvidence'

import type {
  CitationCheckVerdict,
  FlashClaimCandidate,
  FlashClaimVerification,
  FlashFactualProvenanceInput,
} from '../runtimeEvidence/factualSupportProvenance'

import type {
  FlashFactualSourceChunk,
} from './factualSourceChunks'

import type {
  FlashFactualVerificationSemanticOutput,
} from './factualVerificationSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashFactualVerificationClaimInput {
  id:
    string

  text:
    string
}

function invalidOutput():
  never {
  throw new FlashSemanticEvidenceProducerError(
    'invalid_output',
  )
}

function chunkOccurrenceKey({
  chunkId,
  chunkIndex,
}: {
  chunkId:
    string

  chunkIndex:
    number
}): string {
  return [
    chunkId,
    String(
      chunkIndex,
    ),
  ].join(
    '\0',
  )
}

function ensureTrustedInputIsUnambiguous({
  claims,
  chunks,
}: {
  claims:
    readonly FlashFactualVerificationClaimInput[]

  chunks:
    readonly FlashFactualSourceChunk[]
}): void {
  const claimIds =
    claims.map(
      claim =>
        claim.id,
    )

  if (
    new Set(
      claimIds,
    ).size !==
    claimIds.length
  ) {
    throw new Error(
      'Duplicate trusted factual claim ID',
    )
  }

  const chunkKeys =
    chunks.map(
      chunk =>
        chunkOccurrenceKey(
          chunk,
        ),
    )

  if (
    new Set(
      chunkKeys,
    ).size !==
    chunkKeys.length
  ) {
    throw new Error(
      'Duplicate trusted factual chunk occurrence',
    )
  }
}

function deriveSupportStatus(
  verdicts:
    readonly CitationCheckVerdict[],
):
  FactualSupportStatus {
  if (
    verdicts.some(
      verdict =>
        verdict ===
          'contradicts',
    )
  ) {
    return 'contradicted'
  }

  if (
    verdicts.some(
      verdict =>
        verdict ===
          'supports',
    )
  ) {
    return 'supported'
  }

  if (
    verdicts.some(
      verdict =>
        verdict ===
          'partiallySupports',
    )
  ) {
    return 'partial'
  }

  if (
    verdicts.length >
      0 &&
    verdicts.every(
      verdict =>
        verdict ===
          'notFound',
    )
  ) {
    return 'unsupported'
  }

  return 'unverifiable'
}

/**
 * Reconstruiește provenance numai din:
 *
 * - claims create anterior de cod;
 * - chunks create anterior de cod;
 * - selecțiile modelului validate strict.
 *
 * Modelul nu poate controla:
 * - citationId;
 * - evidenceRef;
 * - supportStatus;
 * - metoda de verificare;
 * - run IDs.
 *
 * Output-ul modelului trebuie să acopere EXACT:
 * - fiecare claim primit;
 * - fiecare chunk primit pentru fiecare claim.
 *
 * Ordinea finală este cea a input-urilor trusted,
 * nu ordinea aleasă de model.
 */
export function buildFlashFactualVerificationProvenance({
  claims,
  chunks,
  output,
  generationRunId,
  verificationRunId,
}: {
  claims:
    readonly FlashFactualVerificationClaimInput[]

  chunks:
    readonly FlashFactualSourceChunk[]

  output:
    FlashFactualVerificationSemanticOutput

  generationRunId:
    string

  verificationRunId:
    string
}):
  FlashFactualProvenanceInput {
  ensureTrustedInputIsUnambiguous({
    claims,
    chunks,
  })

  const outputClaimsById =
    new Map(
      output.claims.map(
        claim => [
          claim.claimId,
          claim,
        ],
      ),
    )

  if (
    outputClaimsById.size !==
      output.claims.length ||
    outputClaimsById.size !==
      claims.length
  ) {
    invalidOutput()
  }

  const trustedClaimIds =
    new Set(
      claims.map(
        claim =>
          claim.id,
      ),
    )

  for (
    const outputClaim
    of output.claims
  ) {
    if (
      !trustedClaimIds.has(
        outputClaim.claimId,
      )
    ) {
      invalidOutput()
    }
  }

  const trustedChunksByKey =
    new Map(
      chunks.map(
        chunk => [
          chunkOccurrenceKey(
            chunk,
          ),
          chunk,
        ],
      ),
    )

  const claimCandidates:
    FlashClaimCandidate[] =
      []

  const verifications:
    FlashClaimVerification[] =
      []

  for (
    const claim
    of claims
  ) {
    const outputClaim =
      outputClaimsById.get(
        claim.id,
      )

    if (!outputClaim) {
      invalidOutput()
    }

    const checksByKey =
      new Map(
        outputClaim.checks.map(
          check => [
            chunkOccurrenceKey(
              check,
            ),
            check,
          ],
        ),
      )

    if (
      checksByKey.size !==
        outputClaim.checks.length ||
      checksByKey.size !==
        chunks.length
    ) {
      invalidOutput()
    }

    for (
      const check
      of outputClaim.checks
    ) {
      if (
        !trustedChunksByKey.has(
          chunkOccurrenceKey(
            check,
          ),
        )
      ) {
        invalidOutput()
      }
    }

    const citationChecks =
      chunks.map(
        chunk => {
          const check =
            checksByKey.get(
              chunkOccurrenceKey(
                chunk,
              ),
            )

          if (!check) {
            invalidOutput()
          }

          return {
            citationId:
              chunk.citationId,

            verdict:
              check.verdict,

            evidenceRef:
              chunk.evidenceRef,
          }
        },
      )

    const citationIds =
      [
        ...new Set(
          citationChecks.map(
            check =>
              String(
                check.citationId,
              ),
          ),
        ),
      ]

    const supportStatus =
      deriveSupportStatus(
        citationChecks.map(
          check =>
            check.verdict,
        ),
      )

    claimCandidates.push({
      id:
        claim.id,

      text:
        claim.text,

      citationIds,
    })

    verifications.push({
      claimId:
        claim.id,

      supportStatus,

      method:
        'separateModelPass',

      generationRunId:
        generationRunId.trim(),

      verificationRunId:
        verificationRunId.trim(),

      citationChecks,
    })
  }

  return {
    claims:
      claimCandidates,

    verifications,
  }
}
