import type { Payload } from 'payload'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import {
  buildFlashDecisionInput,
  type FlashDecisionEvidence,
  type FlashDecisionRecord,
  type FlashDecisionSource,
} from './decisionInputAdapter'

import {
  evaluateFlashDecision,
  type FlashDecisionResult,
} from './decisionEngine'

export type FlashRuntimeEvidence =
  Omit<
    FlashDecisionEvidence,
    'roComplete' | 'enComplete'
  >

export interface FlashReadOnlyEvaluation {
  flashId: number
  roComplete: boolean
  enComplete: boolean
  sourceCount: number
  result: FlashDecisionResult
}

type FlashPayloadReader =
  Pick<Payload, 'findByID' | 'find'>

function relationID(
  relation:
    | number
    | { id: number }
    | null
    | undefined,
): number | null {
  if (typeof relation === 'number') {
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

function isConcreteHttpUrl(
  value: string | null | undefined,
): boolean {
  if (!value) return false

  try {
    const url = new URL(value)

    return (
      (url.protocol === 'https:' ||
        url.protocol === 'http:') &&
      Boolean(url.hostname)
    )
  } catch {
    return false
  }
}

function toDecisionRecord(
  flash: FlashAi,
): FlashDecisionRecord {
  return {
    informationStatus: flash.informationStatus,
    riskLevel: flash.riskLevel,
    isHealthRelated:
      flash.isHealthRelated === true,
    clinicalValidationStatus:
      flash.clinicalValidationStatus,
    disclaimerTypes:
      flash.disclaimerTypes ?? [],
  }
}

function deriveLanguageCompleteness(
  flash: FlashAi,
  alternative: FlashAi | null,
): {
  roComplete: boolean
  enComplete: boolean
} {
  const languages = new Set<
    'ro' | 'en'
  >()

  languages.add(flash.limba)

  if (alternative) {
    languages.add(alternative.limba)
  }

  return {
    roComplete: languages.has('ro'),
    enComplete: languages.has('en'),
  }
}

function toDecisionSource(
  concreteUrl: string,
  source: Surse | null,
): FlashDecisionSource {
  return {
    registered: source !== null,
    active: source?.activa === true,
    hasConcreteURL:
      isConcreteHttpUrl(concreteUrl),
    allowIngestion:
      source?.allowIngestion === true,
    allowAutoPublish:
      source?.allowAutoPublish === true,
    editorialTrust:
      source?.editorialTrust ??
      'restricted',
  }
}

export async function evaluateFlashByIdReadOnly(
  payload: FlashPayloadReader,
  flashId: number,
  evidence: FlashRuntimeEvidence,
): Promise<FlashReadOnlyEvaluation> {
  const flash = await payload.findByID({
    collection: 'flash-ai',
    id: flashId,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  const alternativeId =
    relationID(flash.versiuneAlternativa)

  const alternative =
    alternativeId === null
      ? null
      : await payload.findByID({
          collection: 'flash-ai',
          id: alternativeId,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })

  const languageCompleteness =
    deriveLanguageCompleteness(
      flash,
      alternative,
    )

  const sourceRows =
    flash.surseFlash ?? []

  const sourceIds = [
    ...new Set(
      sourceRows
        .map((row) =>
          relationID(row.sursa),
        )
        .filter(
          (id): id is number =>
            id !== null,
        ),
    ),
  ]

  const sourceDocs =
    sourceIds.length === 0
      ? []
      : (
          await payload.find({
            collection: 'surse',
            depth: 0,
            limit: sourceIds.length,
            overrideAccess: true,
            where: {
              id: {
                in: sourceIds,
              },
            },
          })
        ).docs

  const sourceMap =
    new Map<number, Surse>(
      sourceDocs.map((source) => [
        source.id,
        source,
      ]),
    )

  const sources =
    sourceRows.map(
      (
        row,
      ): FlashDecisionSource => {
        const sourceId =
          relationID(row.sursa)

        const source =
          sourceId === null
            ? null
            : sourceMap.get(sourceId) ??
              null

        return toDecisionSource(
          row.url,
          source,
        )
      },
    )

  const input =
    buildFlashDecisionInput({
      flash: toDecisionRecord(flash),
      sources,
      evidence: {
        ...evidence,
        ...languageCompleteness,
      },
    })

  return {
    flashId: flash.id,
    ...languageCompleteness,
    sourceCount: sources.length,
    result:
      evaluateFlashDecision(input),
  }
}
