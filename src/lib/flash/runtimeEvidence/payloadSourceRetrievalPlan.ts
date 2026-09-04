import type { Payload } from 'payload'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import type {
  FlashSourceRetrievalInput,
} from './sourceRetriever'

type FlashPayloadReader =
  Pick<Payload, 'findByID' | 'find'>

type FlashSourceRow =
  NonNullable<
    FlashAi['surseFlash']
  >[number]

export type FlashSourceRetrievalSkipReason =
  | 'missing_source_relation'
  | 'source_not_found'
  | 'source_inactive'
  | 'ingestion_disabled'

export interface FlashSourceRetrievalPlanItem {
  rowIndex: number
  rowId: string | null
  sourceId: number | null

  action:
    | 'retrieve'
    | 'skip'

  skipReason:
    FlashSourceRetrievalSkipReason | null

  retrievalInput:
    FlashSourceRetrievalInput | null
}

export interface FlashSourceRetrievalPlan {
  flashId: number
  totalRows: number
  retrieveCount: number
  skipCount: number
  items:
    FlashSourceRetrievalPlanItem[]
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

function rowIdentifier(
  flashId: number,
  row:
    FlashSourceRow,
  rowIndex: number,
): string {
  if (
    typeof row.id === 'string' &&
    row.id.trim()
  ) {
    return row.id
  }

  return `${flashId}:${rowIndex}`
}

function skippedItem(
  rowIndex: number,
  rowId: string | null,
  sourceId: number | null,
  skipReason:
    FlashSourceRetrievalSkipReason,
): FlashSourceRetrievalPlanItem {
  return {
    rowIndex,
    rowId,
    sourceId,
    action: 'skip',
    skipReason,
    retrievalInput: null,
  }
}

/**
 * Construiește doar planul de retrieval.
 *
 * Citește FlashAI + registrul Surse,
 * dar NU face requesturi HTTP,
 * NU modifică Payload și
 * NU publică nimic.
 *
 * allowAutoPublish și editorialTrust
 * NU decid dacă retrieval-ul este permis.
 * Acestea rămân porți separate
 * în Decision Engine.
 */
export async function buildFlashSourceRetrievalPlanReadOnly(
  payload:
    FlashPayloadReader,
  flashId: number,
): Promise<FlashSourceRetrievalPlan> {
  const flash =
    await payload.findByID({
      collection: 'flash-ai',
      id: flashId,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

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
            collection: 'surse',
            depth: 0,
            limit:
              sourceIds.length,
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
      sourceDocs.map(
        source => [
          source.id,
          source,
        ],
      ),
    )

  const items =
    sourceRows.map(
      (
        row,
        rowIndex,
      ): FlashSourceRetrievalPlanItem => {
        const sourceId =
          relationID(
            row.sursa,
          )

        const rowId =
          typeof row.id === 'string'
            ? row.id
            : null

        if (
          sourceId === null
        ) {
          return skippedItem(
            rowIndex,
            rowId,
            null,
            'missing_source_relation',
          )
        }

        const source =
          sourceMap.get(
            sourceId,
          )

        if (!source) {
          return skippedItem(
            rowIndex,
            rowId,
            sourceId,
            'source_not_found',
          )
        }

        if (
          source.activa !== true
        ) {
          return skippedItem(
            rowIndex,
            rowId,
            sourceId,
            'source_inactive',
          )
        }

        if (
          source.allowIngestion !==
          true
        ) {
          return skippedItem(
            rowIndex,
            rowId,
            sourceId,
            'ingestion_disabled',
          )
        }

        return {
          rowIndex,
          rowId,
          sourceId,
          action: 'retrieve',
          skipReason: null,

          retrievalInput: {
            id:
              rowIdentifier(
                flash.id,
                row,
                rowIndex,
              ),

            registeredSourceUrl:
              source.url,

            concreteUrl:
              row.url,
          },
        }
      },
    )

  const retrieveCount =
    items.filter(
      item =>
        item.action ===
        'retrieve',
    ).length

  return {
    flashId: flash.id,
    totalRows:
      items.length,
    retrieveCount,
    skipCount:
      items.length -
      retrieveCount,
    items,
  }
}
