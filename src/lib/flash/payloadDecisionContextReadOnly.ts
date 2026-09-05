import type { Payload } from 'payload'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import type {
  FlashDecisionEvidence,
  FlashDecisionRecord,
  FlashDecisionSource,
} from './decisionInputAdapter'

type FlashPayloadReader =
  Pick<Payload, 'findByID' | 'find'>

export type FlashDecisionPairCompleteness =
  Pick<
    FlashDecisionEvidence,
    'roComplete' | 'enComplete'
  >

export interface FlashPayloadDecisionContext {
  flashId: number

  alternativeId:
    number | null

  flash:
    FlashDecisionRecord

  sources:
    FlashDecisionSource[]

  pairCompleteness:
    FlashDecisionPairCompleteness

  sourceCount: number
}

function relationID(
  relation:
    | number
    | { id: number }
    | null
    | undefined,
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

function isConcreteHttpUrl(
  value:
    string | null | undefined,
): boolean {
  if (!value) {
    return false
  }

  try {
    const url =
      new URL(value)

    return (
      (
        url.protocol === 'https:' ||
        url.protocol === 'http:'
      ) &&
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
    informationStatus:
      flash.informationStatus,

    riskLevel:
      flash.riskLevel,

    isHealthRelated:
      flash.isHealthRelated === true,

    clinicalValidationStatus:
      flash.clinicalValidationStatus,

    disclaimerTypes:
      flash.disclaimerTypes ?? [],
  }
}

function deriveLanguageCompleteness(
  flash:
    FlashAi,
  alternative:
    FlashAi | null,
): FlashDecisionPairCompleteness {
  const languages =
    new Set<'ro' | 'en'>()

  languages.add(
    flash.limba,
  )

  if (alternative) {
    languages.add(
      alternative.limba,
    )
  }

  return {
    roComplete:
      languages.has('ro'),

    enComplete:
      languages.has('en'),
  }
}

function toDecisionSource(
  concreteUrl:
    string,
  source:
    Surse | null,
): FlashDecisionSource {
  return {
    registered:
      source !== null,

    active:
      source?.activa === true,

    hasConcreteURL:
      isConcreteHttpUrl(
        concreteUrl,
      ),

    allowIngestion:
      source?.allowIngestion === true,

    allowAutoPublish:
      source?.allowAutoPublish === true,

    editorialTrust:
      source?.editorialTrust ??
      'restricted',
  }
}

/**
 * Încarcă exclusiv contextul necesar Decision Engine.
 *
 * Payload este folosit read-only.
 * Nu face HTTP retrieval.
 * Nu scrie în DB.
 * Nu publică.
 */
export async function loadFlashDecisionContextByIdReadOnly(
  payload:
    FlashPayloadReader,
  flashId:
    number,
): Promise<FlashPayloadDecisionContext> {
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
    })

  const alternativeId =
    relationID(
      flash.versiuneAlternativa,
    )

  const alternative =
    alternativeId === null
      ? null
      : alternativeId === flash.id
        ? flash
        : await payload.findByID({
            collection:
              'flash-ai',

            id:
              alternativeId,

            depth:
              0,

            draft:
              true,

            overrideAccess:
              true,
          })

  const pairCompleteness =
    deriveLanguageCompleteness(
      flash,
      alternative,
    )

  const sourceRows =
    flash.surseFlash ?? []

  const sourceIds = [
    ...new Set(
      sourceRows
        .map(
          row =>
            relationID(
              row.sursa,
            ),
        )
        .filter(
          (
            id,
          ): id is number =>
            id !== null,
        ),
    ),
  ]

  const sourceDocs =
    sourceIds.length === 0
      ? []
      : (
          await payload.find({
            collection:
              'surse',

            depth:
              0,

            limit:
              sourceIds.length,

            overrideAccess:
              true,

            where: {
              id: {
                in:
                  sourceIds,
              },
            },
          })
        ).docs

  const sourceMap =
    new Map<number, Surse>(
      sourceDocs.map(
        source => [
          source.id,
          source,
        ],
      ),
    )

  const sources =
    sourceRows.map(
      (
        row,
      ): FlashDecisionSource => {
        const sourceId =
          relationID(
            row.sursa,
          )

        const source =
          sourceId === null
            ? null
            : sourceMap.get(
                sourceId,
              ) ?? null

        return toDecisionSource(
          row.url,
          source,
        )
      },
    )

  return {
    flashId:
      flash.id,

    alternativeId,

    flash:
      toDecisionRecord(
        flash,
      ),

    sources,

    pairCompleteness,

    sourceCount:
      sources.length,
  }
}
