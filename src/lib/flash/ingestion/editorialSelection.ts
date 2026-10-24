/** Offline editorial triage. No imports, I/O, model calls or persistence authority. */
export type EditorialSourceFormat = 'research_result' | 'institutional_announcement' |
  'interview' | 'profile' | 'background' | 'unknown'
export type EditorialDisposition = 'candidate_for_evaluation' | 'needs_primary_evidence' |
  'context_only' | 'review_required'
export type EditorialSelectionReason = 'format_unresolved' | 'claims_unresolved' |
  'needs_primary_evidence' | 'relevance_not_established' | 'context_only' |
  'timeliness_unresolved' | 'source_document_unverified' | 'date_unresolved' |
  'editorial_review_required' | 'identity_unresolved' | 'writer_gates_not_evaluated'

export interface EditorialSelectionInput {
  /** Each observation is a reviewed assertion, not instructions from source HTML. */
  formatEvidence: readonly {
    format: EditorialSourceFormat
    origin: 'human_review' | 'explicit_source_metadata'
    basis: string
  }[]
  /** Reviewer must assess concrete claims even within an interview or profile. */
  claimScope: 'scientific_results' | 'non_scientific' | 'unclear'
  primaryEvidence: 'reviewed_sufficient' | 'missing_or_unverified'
  sourceDocumentVerified: boolean
  relevance: 'established' | 'unclear'
  timeliness: 'documented_new_development' | 'context' | 'unclear'
  publishedAt: string | null
  /** Explicit clock; no Date.now(), network or shared state. */
  assessedAt: string
  identityStatus: 'grounded' | 'pending' | 'ambiguous'
}

export interface EditorialSelectionResult {
  policyVersion: 'editorial-selection-preview-v1'
  sourceFormat: EditorialSourceFormat
  editorialDisposition: EditorialDisposition
  reasonCodes: EditorialSelectionReason[]
  publishedAt: string | null
  ageDays: number | null
  identityStatus: EditorialSelectionInput['identityStatus']
  /** Selection alone never grants generation or a CMS write. */
  generationAllowed: false
}

const formats = new Set<EditorialSourceFormat>(['research_result', 'institutional_announcement',
  'interview', 'profile', 'background'])

function timestamp(value: string | null): number | null {
  // Accept an explicit ISO date or a timestamp with timezone; reject locale guesses.
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null
  const date = Date.parse(value)
  const day = value.slice(0, 10)
  const calendarDay = new Date(`${day}T00:00:00Z`)
  return Number.isFinite(date) && Number.isFinite(calendarDay.getTime()) &&
    calendarDay.toISOString().slice(0, 10) === day ? date : null
}

export function evaluateEditorialSelection(input: EditorialSelectionInput): EditorialSelectionResult {
  const observations = input.formatEvidence.filter(item => formats.has(item.format) &&
    ['human_review', 'explicit_source_metadata'].includes(item.origin) && item.basis.trim())
  const observedFormats = new Set(observations.map(item => item.format))
  const unresolvedObservation = input.formatEvidence.some(item => !observations.includes(item))
  const sourceFormat = observedFormats.size === 1 && !unresolvedObservation
    ? observations[0]!.format : 'unknown'
  const assessed = timestamp(input.assessedAt)
  const published = timestamp(input.publishedAt)
  const validDate = assessed !== null && published !== null && published <= assessed
  const reasons = new Set<EditorialSelectionReason>()
  if (sourceFormat === 'unknown') reasons.add('format_unresolved')
  if (input.claimScope !== 'scientific_results' && input.claimScope !== 'non_scientific') reasons.add('claims_unresolved')
  if (!input.sourceDocumentVerified) reasons.add('source_document_unverified')
  if (input.relevance !== 'established') reasons.add('relevance_not_established')
  if (!validDate) reasons.add('date_unresolved')
  if (input.timeliness !== 'documented_new_development' && input.timeliness !== 'context') reasons.add('timeliness_unresolved')

  // A research format cannot escape evidence review through a non-scientific label.
  const needsPrimaryEvidence = (sourceFormat === 'research_result' || input.claimScope === 'scientific_results') &&
    input.primaryEvidence !== 'reviewed_sufficient'
  if (needsPrimaryEvidence) reasons.add('needs_primary_evidence')

  let editorialDisposition: EditorialDisposition = 'review_required'
  if (needsPrimaryEvidence) editorialDisposition = 'needs_primary_evidence'
  else if (sourceFormat === 'unknown' || reasons.size > 0) editorialDisposition = 'review_required'
  else if (input.timeliness === 'context' || sourceFormat === 'profile' || sourceFormat === 'background') {
    editorialDisposition = 'context_only'
    reasons.add('context_only')
  } else if (sourceFormat === 'interview') {
    reasons.add('editorial_review_required')
  } else editorialDisposition = 'candidate_for_evaluation'

  if (input.identityStatus !== 'grounded') reasons.add('identity_unresolved')
  reasons.add('writer_gates_not_evaluated')
  return { policyVersion: 'editorial-selection-preview-v1', sourceFormat, editorialDisposition,
    reasonCodes: [...reasons], publishedAt: input.publishedAt,
    ageDays: validDate ? Math.floor((assessed! - published!) / 86_400_000) : null,
    identityStatus: input.identityStatus, generationAllowed: false }
}
