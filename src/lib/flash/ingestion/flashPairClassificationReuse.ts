import type { FlashNormalizedArticleCandidate } from './articleCandidateNormalization'
import { buildFlashAiStagingWriteInputFromHandoffValue } from './flashAiStagingWriteHandoff'
import { parseFlashPrePersistenceClassificationSemanticOutput } from '../semanticEvidence/prePersistenceClassificationSemanticOutput'
import type { FlashPrePersistencePilonOption } from '../semanticEvidence/prePersistenceClassificationSemanticProducer'

/** Local same-run RO handoff reuse, never a publication or persistence grant. */
export function reuseFlashPairClassification({
  handoff, candidate, sourceFingerprint, eventFingerprint, allowedPilons,
}: {
  handoff: unknown
  candidate: FlashNormalizedArticleCandidate
  sourceFingerprint: string
  eventFingerprint: string | null
  allowedPilons: FlashPrePersistencePilonOption[]
}) {
  const ro = buildFlashAiStagingWriteInputFromHandoffValue(handoff)
  if (ro.projection.limba !== 'ro') {
    throw new Error('Classification reuse requires a validated RO handoff.')
  }
  // URL identity alone is insufficient: the source can change between fetches.
  // Compare every normalized input supplied to classification, including provenance.
  const fields = [
    'sourceId', 'sourceName', 'sourceRole', 'editorialTrust', 'citationMode',
    'allowAutoPublish', 'language', 'finalUrl', 'canonicalUrl', 'title', 'contentType',
    'sourcePublicationDateRaw', 'sourcePublicationDate', 'lead', 'bodyParagraphs',
    'bodyText', 'sourceAdapter', 'provenanceParagraphs', 'leadKind', 'primaryEvidenceUrls',
  ] as const
  if (fields.some(field => JSON.stringify(ro.candidate[field]) !== JSON.stringify(candidate[field])) ||
      ro.projection.sourceFingerprint !== sourceFingerprint ||
      ro.projection.eventFingerprint !== eventFingerprint) {
    throw new Error('Classification reuse requires the identical source candidate and fingerprints.')
  }
  // Parse the original bounded contract too; the handoff converter is not a JSON schema validator.
  const classification = parseFlashPrePersistenceClassificationSemanticOutput(
    JSON.stringify((handoff as { readiness: { classification: unknown } }).readiness.classification),
  )
  if (!allowedPilons.some(pilon => pilon.id === classification.pilonId)) {
    throw new Error('Reused classification is outside the current source-configured pilons.')
  }
  return classification
}
