import {
  createHash,
} from 'node:crypto'

import type {
  FlashClaimCandidate,
} from '../runtimeEvidence/factualSupportProvenance'

import type {
  FlashFactualClaimExtractionSemanticOutput,
  FlashFactualClaimSourceField,
} from './factualClaimExtractionSemanticOutput'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashExtractedFactualClaim {
  /**
   * ID creat exclusiv de cod.
   *
   * Modelul nu îl furnizează.
   */
  id:
    string

  text:
    string

  sourceField:
    FlashFactualClaimSourceField

  /**
   * Offset-ul primei apariții exacte în câmpul
   * SemanticDocument.
   */
  sourceOffset:
    number
}

export interface FlashFactualClaimExtractionAdapterResult {
  claims:
    FlashExtractedFactualClaim[]

  /**
   * Forma compatibilă cu contractul factual
   * existent.
   *
   * citationIds apar abia după verificarea față de
   * Factual Source Chunks.
   */
  claimCandidates:
    FlashClaimCandidate[]
}

function invalidOutput():
  never {
  throw new FlashSemanticEvidenceProducerError(
    'invalid_output',
  )
}

function sourceText({
  document,
  sourceField,
}: {
  document:
    FlashSemanticDocument

  sourceField:
    FlashFactualClaimSourceField
}): string | null {
  switch (
    sourceField
  ) {
    case 'title':
      return document.title

    case 'excerpt':
      return document.excerpt ??
        null

    case 'body':
      return document.bodyText
  }
}

function claimHash({
  sourceField,
  evidenceText,
}: {
  sourceField:
    FlashFactualClaimSourceField

  evidenceText:
    string
}): string {
  return createHash(
    'sha256',
  )
    .update(
      sourceField,
      'utf8',
    )
    .update(
      '\0',
      'utf8',
    )
    .update(
      evidenceText,
      'utf8',
    )
    .digest(
      'hex',
    )
}

/**
 * Transformă output-ul modelului în claims ancorate
 * deterministic în SemanticDocument.
 *
 * Reguli:
 * - evidenceText trebuie să existe EXACT în field-ul declarat;
 * - claimId este creat numai de cod;
 * - nu generează citationIds;
 * - nu decide supportStatus;
 * - nu verifică surse;
 * - nu decide AUTO / REVIEW / BLOCK.
 */
export function buildFlashFactualClaimCandidates({
  document,
  output,
}: {
  document:
    FlashSemanticDocument

  output:
    FlashFactualClaimExtractionSemanticOutput
}):
  FlashFactualClaimExtractionAdapterResult {
  const claims =
    output.claims.map(
      (
        claim,
      ): FlashExtractedFactualClaim => {
        const fieldText =
          sourceText({
            document,
            sourceField:
              claim.sourceField,
          })

        if (
          fieldText ===
          null
        ) {
          invalidOutput()
        }

        const sourceOffset =
          fieldText.indexOf(
            claim.evidenceText,
          )

        if (
          sourceOffset <
          0
        ) {
          invalidOutput()
        }

        const hash =
          claimHash({
            sourceField:
              claim.sourceField,

            evidenceText:
              claim.evidenceText,
          })

        return {
          id:
            `claim:${hash}`,

          text:
            claim.evidenceText,

          sourceField:
            claim.sourceField,

          sourceOffset,
        }
      },
    )

  const ids =
    claims.map(
      claim =>
        claim.id,
    )

  if (
    new Set(
      ids,
    ).size !==
    ids.length
  ) {
    invalidOutput()
  }

  return {
    claims,

    claimCandidates:
      claims.map(
        claim => ({
          id:
            claim.id,

          text:
            claim.text,
        }),
      ),
  }
}
