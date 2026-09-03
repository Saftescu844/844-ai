import type { Payload } from 'payload'

import type { FlashAi } from '@/payload-types'

import {
  evaluateFlashDedup,
  type DedupRecordID,
  type FlashDedupEvidence,
  type FlashDedupRecord,
} from './dedupEvidence'

type FlashPayloadReader =
  Pick<Payload, 'findByID' | 'find'>

export interface FlashPayloadDedupOptions {
  /**
   * Numărul maxim de Flash-uri recente în aceeași limbă
   * folosite pentru semnalul euristic de titlu normalizat.
   *
   * Fingerprint-urile sunt căutate separat și nu depind
   * de această fereastră.
   */
  titleSampleLimit?: number
}

export interface FlashPayloadDedupEvaluation {
  flashId: number
  alternativeId: DedupRecordID | null
  candidateCount: number
  evidence: FlashDedupEvidence
}

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

function cleanFingerprint(
  value: string | null | undefined,
): string | null {
  const cleaned = value?.trim()

  return cleaned
    ? cleaned
    : null
}

function normalizeTitleSampleLimit(
  value: number | undefined,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 200
  }

  return Math.min(
    500,
    Math.max(1, Math.trunc(value)),
  )
}

function toDedupRecord(
  flash: FlashAi,
): FlashDedupRecord {
  return {
    id: flash.id,
    language: flash.limba,
    title: flash.titlu,
    eventFingerprint:
      flash.eventFingerprint,
    sourceFingerprint:
      flash.sourceFingerprint,
  }
}

function addUniqueDocs(
  target: Map<string, FlashAi>,
  docs: FlashAi[],
): void {
  for (const doc of docs) {
    target.set(
      String(doc.id),
      doc,
    )
  }
}

export async function evaluateFlashDedupByIdReadOnly(
  payload: FlashPayloadReader,
  flashId: number,
  options: FlashPayloadDedupOptions = {},
): Promise<FlashPayloadDedupEvaluation> {
  const candidate =
    await payload.findByID({
      collection: 'flash-ai',
      id: flashId,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

  const eventFingerprint =
    cleanFingerprint(
      candidate.eventFingerprint,
    )

  const sourceFingerprint =
    cleanFingerprint(
      candidate.sourceFingerprint,
    )

  const alternativeId =
    relationID(
      candidate.versiuneAlternativa,
    )

  const candidateDocs =
    new Map<string, FlashAi>()

  /*
   * Semnal puternic:
   * eventFingerprint se caută independent de limbă.
   */
  if (eventFingerprint) {
    const matches =
      await payload.find({
        collection: 'flash-ai',
        depth: 0,
        draft: true,
        overrideAccess: true,
        limit: 100,
        where: {
          eventFingerprint: {
            equals: eventFingerprint,
          },
        },
      })

    addUniqueDocs(
      candidateDocs,
      matches.docs,
    )
  }

  /*
   * Semnal secundar:
   * aceeași sursă poate indica același eveniment,
   * dar nu este suficientă pentru BLOCK.
   */
  if (sourceFingerprint) {
    const matches =
      await payload.find({
        collection: 'flash-ai',
        depth: 0,
        draft: true,
        overrideAccess: true,
        limit: 100,
        where: {
          sourceFingerprint: {
            equals: sourceFingerprint,
          },
        },
      })

    addUniqueDocs(
      candidateDocs,
      matches.docs,
    )
  }

  /*
   * Semnal euristic:
   * comparăm titlul normalizat cu un eșantion
   * recent din aceeași limbă.
   *
   * Nu este motiv de BLOCK.
   */
  const titleSample =
    await payload.find({
      collection: 'flash-ai',
      depth: 0,
      draft: true,
      overrideAccess: true,
      limit:
        normalizeTitleSampleLimit(
          options.titleSampleLimit,
        ),
      sort: '-createdAt',
      where: {
        limba: {
          equals: candidate.limba,
        },
      },
    })

  addUniqueDocs(
    candidateDocs,
    titleSample.docs,
  )

  const existing =
    [...candidateDocs.values()]
      .map(toDedupRecord)

  const ignoreExistingIds:
    DedupRecordID[] = []

  if (alternativeId !== null) {
    ignoreExistingIds.push(
      alternativeId,
    )
  }

  const evidence =
    evaluateFlashDedup({
      candidate:
        toDedupRecord(candidate),
      existing,
      ignoreExistingIds,
    })

  return {
    flashId,
    alternativeId,
    candidateCount:
      existing.length,
    evidence,
  }
}
