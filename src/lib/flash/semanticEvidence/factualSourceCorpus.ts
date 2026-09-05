import type {
  FlashPayloadSourceVerificationRuntimeResult,
} from '../runtimeEvidence/payloadSourceVerificationRuntime'

export type FlashFactualSourceCorpusIssueReason =
  | 'source_verification_not_run'
  | 'source_verification_incomplete'
  | 'duplicate_citation_id'
  | 'missing_retrieval_result'
  | 'unexpected_retrieval_result'
  | 'retrieval_failed'
  | 'text_content_unavailable'

export interface FlashFactualSourceDocument {
  /**
   * Identitatea citării folosită ulterior de
   * FlashFactualProvenanceInput.
   *
   * Este exact retrievalInput.id / candidate.id.
   */
  citationId:
    string

  rowIndex:
    number

  rowId:
    string | null

  sourceId:
    number | null

  registeredSourceUrl:
    string

  concreteUrl:
    string

  finalUrl:
    string | null

  contentType:
    string | null

  /**
   * Conținut reutilizat din Source Verification.
   * Acest bridge NU face HTTP retrieval.
   */
  textContent:
    string
}

export interface FlashFactualSourceCorpusIssue {
  citationId:
    string | null

  reason:
    FlashFactualSourceCorpusIssueReason
}

export interface FlashFactualSourceCorpus {
  /**
   * true înseamnă:
   * - Source Verification a rulat cu coverage complet;
   * - fiecare retrieval planificat are rezultat;
   * - fiecare rezultat este reutilizabil factual;
   * - nu există identități duplicate/inconsistente.
   */
  complete:
    boolean

  documents:
    FlashFactualSourceDocument[]

  issues:
    FlashFactualSourceCorpusIssue[]
}

function pushIssue(
  issues:
    FlashFactualSourceCorpusIssue[],
  issue:
    FlashFactualSourceCorpusIssue,
): void {
  if (
    issues.some(
      existing =>
        existing.citationId ===
          issue.citationId &&
        existing.reason ===
          issue.reason,
    )
  ) {
    return
  }

  issues.push(
    issue,
  )
}

/**
 * Bridge determinist, read-only:
 *
 * Source Verification Runtime
 *   -> Factual Source Corpus
 *
 * Nu:
 * - face HTTP;
 * - apelează modele;
 * - scrie în Payload;
 * - produce verdict factual;
 * - publică.
 */
export function buildFlashFactualSourceCorpus(
  input:
    FlashPayloadSourceVerificationRuntimeResult,
): FlashFactualSourceCorpus {
  const issues:
    FlashFactualSourceCorpusIssue[] =
      []

  if (
    input.verification ===
    null
  ) {
    pushIssue(
      issues,
      {
        citationId:
          null,

        reason:
          'source_verification_not_run',
      },
    )
  }

  if (
    input.verificationCoverage !==
    'complete'
  ) {
    pushIssue(
      issues,
      {
        citationId:
          null,

        reason:
          'source_verification_incomplete',
      },
    )
  }

  const plannedByCitationId =
    new Map<
      string,
      {
        rowIndex:
          number

        rowId:
          string | null

        sourceId:
          number | null

        registeredSourceUrl:
          string

        concreteUrl:
          string
      }
    >()

  for (
    const item
    of input.plan.items
  ) {
    if (
      item.action !==
        'retrieve' ||
      item.retrievalInput ===
        null
    ) {
      continue
    }

    const citationId =
      item.retrievalInput.id

    if (
      plannedByCitationId.has(
        citationId,
      )
    ) {
      pushIssue(
        issues,
        {
          citationId,

          reason:
            'duplicate_citation_id',
        },
      )

      continue
    }

    plannedByCitationId.set(
      citationId,
      {
        rowIndex:
          item.rowIndex,

        rowId:
          item.rowId,

        sourceId:
          item.sourceId,

        registeredSourceUrl:
          item.retrievalInput
            .registeredSourceUrl,

        concreteUrl:
          item.retrievalInput
            .concreteUrl,
      },
    )
  }

  const retrievals =
    input.verification
      ?.retrievals ??
    []

  const seenRetrievalIds =
    new Set<string>()

  const documents:
    FlashFactualSourceDocument[] =
      []

  for (
    const retrieval
    of retrievals
  ) {
    const citationId =
      retrieval.candidate.id

    if (
      seenRetrievalIds.has(
        citationId,
      )
    ) {
      pushIssue(
        issues,
        {
          citationId,

          reason:
            'duplicate_citation_id',
        },
      )

      continue
    }

    seenRetrievalIds.add(
      citationId,
    )

    const planned =
      plannedByCitationId.get(
        citationId,
      )

    if (!planned) {
      pushIssue(
        issues,
        {
          citationId,

          reason:
            'unexpected_retrieval_result',
        },
      )

      continue
    }

    if (
      retrieval.failureReason !==
        null ||
      retrieval.candidate.retrieved !==
        true ||
      retrieval.candidate.contentAvailable !==
        true
    ) {
      pushIssue(
        issues,
        {
          citationId,

          reason:
            'retrieval_failed',
        },
      )

      continue
    }

    const textContent =
      retrieval.textContent
        ?.trim()

    if (!textContent) {
      pushIssue(
        issues,
        {
          citationId,

          reason:
            'text_content_unavailable',
        },
      )

      continue
    }

    documents.push({
      citationId,

      rowIndex:
        planned.rowIndex,

      rowId:
        planned.rowId,

      sourceId:
        planned.sourceId,

      registeredSourceUrl:
        planned.registeredSourceUrl,

      concreteUrl:
        planned.concreteUrl,

      finalUrl:
        retrieval.candidate
          .finalUrl ??
        null,

      contentType:
        retrieval.contentType,

      textContent,
    })
  }

  for (
    const citationId
    of plannedByCitationId.keys()
  ) {
    if (
      !seenRetrievalIds.has(
        citationId,
      )
    ) {
      pushIssue(
        issues,
        {
          citationId,

          reason:
            'missing_retrieval_result',
        },
      )
    }
  }

  return {
    complete:
      input.verificationCoverage ===
        'complete' &&
      input.verification !==
        null &&
      issues.length ===
        0,

    documents,
    issues,
  }
}
