import {
  flashPublicationExcerptProblem,
} from './flashPublicationExcerptGuard'

/**
 * Payload can publish a localization selection without including _status in
 * the immediate operation data. Flash AI's excerpt is not localized and the
 * two editorial languages are independent documents; verify the selected
 * document's effective latest-draft excerpt before any such publication.
 *
 * This is a read-only gate. Standard publish (_status='published') and
 * scheduled publish execution remain covered by the beforeChange status gate.
 */
export async function flashAlternativeLocalePublicationExcerptProblem({
  operation,
  publishAllLocales,
  publishSpecificLocale,
  proposedExcerpt,
  documentId,
  readDraftExcerpt,
}: {
  operation: 'create' | 'update' | 'updateByID'
  publishAllLocales: unknown
  publishSpecificLocale: unknown
  proposedExcerpt: unknown
  documentId: unknown
  readDraftExcerpt: (id: string | number) => Promise<unknown>
}): Promise<string | null> {
  const attemptsAlternativePublication =
    publishAllLocales === true || Boolean(publishSpecificLocale)

  if (!attemptsAlternativePublication) return null

  let priorExcerpt: unknown

  if (operation !== 'create') {
    if (
      typeof documentId !== 'string' &&
      typeof documentId !== 'number'
    ) {
      // Cannot safely validate a potentially multi-document publication.
      return 'Flash AI alternative publication requires one document ID.'
    }

    // Deliberately read the latest draft, not only the published root;
    // a pending draft may have explicitly removed an older excerpt.
    priorExcerpt = await readDraftExcerpt(documentId)
  }

  return flashPublicationExcerptProblem({
    requestedStatus: 'published',
    proposedExcerpt,
    priorExcerpt,
  })
}
