import type { Payload } from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

type FlashPayloadReader =
  Pick<Payload, 'findByID'>

export interface FlashPayloadPairCompletenessEvidence {
  roComplete: boolean
  enComplete: boolean
}

export interface FlashPayloadPairCompletenessEvaluation {
  flashId: number
  language: 'ro' | 'en'
  alternativeId: number | null
  alternativeLanguage:
    | 'ro'
    | 'en'
    | null

  evidence:
    FlashPayloadPairCompletenessEvidence
}

function relationID(
  relation:
    FlashAi['versiuneAlternativa'],
): number | null {
  if (
    typeof relation === 'number'
  ) {
    return relation
  }

  if (
    relation &&
    typeof relation === 'object' &&
    typeof relation.id === 'number'
  ) {
    return relation.id
  }

  return null
}

/**
 * Evaluează exclusiv existența perechii RO/EN.
 *
 * Nu validează conținutul editorial,
 * nu scrie în Payload și nu publică.
 */
export async function evaluateFlashPairCompletenessByIdReadOnly(
  payload:
    FlashPayloadReader,
  flashId: number,
): Promise<FlashPayloadPairCompletenessEvaluation> {
  const candidate =
    await payload.findByID({
      collection: 'flash-ai',
      id: flashId,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

  const alternativeId =
    relationID(
      candidate.versiuneAlternativa,
    )

  let alternative:
    FlashAi | null = null

  if (
    alternativeId !== null
  ) {
    if (
      alternativeId ===
      candidate.id
    ) {
      alternative = candidate
    } else {
      alternative =
        await payload.findByID({
          collection: 'flash-ai',
          id: alternativeId,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })
    }
  }

  const languages =
    new Set<'ro' | 'en'>([
      candidate.limba,

      ...(
        alternative
          ? [
              alternative.limba,
            ]
          : []
      ),
    ])

  return {
    flashId:
      candidate.id,

    language:
      candidate.limba,

    alternativeId,

    alternativeLanguage:
      alternative?.limba ??
      null,

    evidence: {
      roComplete:
        languages.has('ro'),

      enComplete:
        languages.has('en'),
    },
  }
}
