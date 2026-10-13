/**
 * Applies to explicit Flash AI publication requests only.
 * Do not mark the Payload excerpt field globally required: legacy
 * drafts must remain editable until a human reviews their excerpt.
 */
export function flashPublicationExcerptProblem({
  requestedStatus,
  proposedExcerpt,
  priorExcerpt,
}: {
  requestedStatus: unknown
  proposedExcerpt: unknown
  priorExcerpt: unknown
}): string | null {
  if (requestedStatus !== 'published') return null

  // An omitted field can reuse an existing reviewed excerpt.
  // An explicit null/blank replacement must never fall back silently.
  const excerpt = proposedExcerpt === undefined
    ? priorExcerpt
    : proposedExcerpt

  if (typeof excerpt !== 'string' || !excerpt.trim()) {
    return 'Flash AI publication requires a reviewed, non-empty excerpt.'
  }

  if (excerpt.length > 300) {
    return 'Flash AI publication excerpt must not exceed 300 characters.'
  }

  return null
}
