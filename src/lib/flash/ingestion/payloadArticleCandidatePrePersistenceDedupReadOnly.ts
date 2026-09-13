import type { Payload } from 'payload'

import type { FlashAi } from '@/payload-types'

import {
  evaluateFlashArticlePrePersistenceDedup,
  type FlashPrePersistenceDedupEvidence,
  type FlashPrePersistenceDedupRecord,
} from './articleCandidatePrePersistenceDedup'
import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

type FlashPayloadReader =
  Pick<Payload, 'find'>

export interface FlashArticlePrePersistenceDedupReadOnlyOptions {
  /**
   * Fingerprint determinist calculat înainte de persistență.
   * Dacă este prezent, este folosit doar ca semnal de review.
   */
  sourceFingerprint?: string | null

  /**
   * Numărul maxim de Flash-uri recente din aceeași limbă
   * folosite pentru semnalul euristic de titlu normalizat.
   */
  titleSampleLimit?: number
}

export interface FlashArticlePrePersistenceDedupReadOnlyEvaluation {
  candidateCount: number
  evidence: FlashPrePersistenceDedupEvidence
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
    Math.max(
      1,
      Math.trunc(value),
    ),
  )
}

function normalizeFingerprint(
  value: string | null | undefined,
): string | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase()

  return normalized
    ? normalized
    : null
}

function toPrePersistenceRecord(
  flash: FlashAi,
): FlashPrePersistenceDedupRecord {
  return {
    id: flash.id,
    language: flash.limba,
    title: flash.titlu,
    sourceFingerprint:
      flash.sourceFingerprint,
    sourceUrls:
      (flash.surseFlash ?? [])
        .map(
          source =>
            source.url,
        ),
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

export async function evaluateFlashArticlePrePersistenceDedupReadOnly(
  payload: FlashPayloadReader,
  candidate: FlashNormalizedArticleCandidate,
  options:
    FlashArticlePrePersistenceDedupReadOnlyOptions = {},
): Promise<
  FlashArticlePrePersistenceDedupReadOnlyEvaluation
> {
  const candidateDocs =
    new Map<string, FlashAi>()

  const candidateSourceFingerprint =
    normalizeFingerprint(
      options.sourceFingerprint,
    )

  /*
   * Semnal puternic pre-persistență:
   * căutăm URL-ul canonic exact deja citat de un Flash.
   * Evaluatorul pur recanonizează apoi URL-urile găsite.
   */
  const sourceMatches =
    await payload.find({
      collection: 'flash-ai',
      depth: 0,
      draft: true,
      overrideAccess: true,
      limit: 100,
      where: {
        'surseFlash.url': {
          equals:
            candidate.canonicalUrl,
        },
      },
    })

  addUniqueDocs(
    candidateDocs,
    sourceMatches.docs,
  )

  /*
   * Semnal determinist de review:
   * dacă REG-001N a produs sourceFingerprint,
   * căutăm exact același fingerprint deja persistat.
   * Acest semnal nu transformă candidatul în duplicat evident.
   */
  if (candidateSourceFingerprint) {
    const fingerprintMatches =
      await payload.find({
        collection: 'flash-ai',
        depth: 0,
        draft: true,
        overrideAccess: true,
        limit: 100,
        where: {
          sourceFingerprint: {
            equals:
              candidateSourceFingerprint,
          },
        },
      })

    addUniqueDocs(
      candidateDocs,
      fingerprintMatches.docs,
    )
  }

  /*
   * Semnal euristic:
   * comparăm titlul normalizat doar cu Flash-uri
   * recente din aceeași limbă.
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
          equals:
            candidate.language,
        },
      },
    })

  addUniqueDocs(
    candidateDocs,
    titleSample.docs,
  )

  const existing =
    [...candidateDocs.values()]
      .map(
        toPrePersistenceRecord,
      )

  return {
    candidateCount:
      existing.length,
    evidence:
      evaluateFlashArticlePrePersistenceDedup(
        candidate,
        existing,
        {
          sourceFingerprint:
            candidateSourceFingerprint,
        },
      ),
  }
}
