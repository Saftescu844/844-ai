import type { PublicAuthorProfile } from '@/lib/authors'
import type { AuthorLanguage } from '@/lib/authors'
import { getPublicAuthorByID } from '@/lib/authors-reader'

export type ArticleEditorialRelationships = {
  autorPrincipal?: unknown
  coautori?: unknown
  verificatorEditorial?: unknown
  verificatorMedical?: unknown
  contributoriExperti?: unknown
}

export type PublicArticleAttribution = {
  primaryAuthor?: PublicAuthorProfile
  coauthors: PublicAuthorProfile[]
  editorialReviewer?: PublicAuthorProfile
  medicalReviewer?: PublicAuthorProfile
  expertContributors: PublicAuthorProfile[]
}

function getRelationshipID(
  value: unknown,
): number | undefined {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value
  ) {
    const id = (value as { id?: unknown }).id

    if (
      typeof id === 'number' &&
      Number.isInteger(id) &&
      id > 0
    ) {
      return id
    }
  }

  return undefined
}

function getRelationshipIDs(
  value: unknown,
): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(getRelationshipID)
    .filter(
      (id): id is number =>
        id !== undefined,
    )
}

export async function resolvePublicArticleAttribution(
  article: ArticleEditorialRelationships,
  language: AuthorLanguage,
): Promise<PublicArticleAttribution> {
  const cache = new Map<
    number,
    Promise<PublicAuthorProfile | null>
  >()

  const resolveAuthor = (
    id: number,
  ): Promise<PublicAuthorProfile | null> => {
    const existing = cache.get(id)

    if (existing) {
      return existing
    }

    const pending =
      getPublicAuthorByID(id, language)

    cache.set(id, pending)

    return pending
  }

  const primaryAuthorID =
    getRelationshipID(
      article.autorPrincipal,
    )

  const editorialReviewerID =
    getRelationshipID(
      article.verificatorEditorial,
    )

  const medicalReviewerID =
    getRelationshipID(
      article.verificatorMedical,
    )

  const coauthorIDs =
    getRelationshipIDs(article.coautori)

  const expertContributorIDs =
    getRelationshipIDs(
      article.contributoriExperti,
    )

  const [
    primaryAuthor,
    coauthors,
    editorialReviewer,
    medicalReviewer,
    expertContributors,
  ] = await Promise.all([
    primaryAuthorID
      ? resolveAuthor(primaryAuthorID)
      : null,

    Promise.all(
      coauthorIDs.map(resolveAuthor),
    ),

    editorialReviewerID
      ? resolveAuthor(editorialReviewerID)
      : null,

    medicalReviewerID
      ? resolveAuthor(medicalReviewerID)
      : null,

    Promise.all(
      expertContributorIDs.map(
        resolveAuthor,
      ),
    ),
  ])

  return {
    ...(primaryAuthor
      ? { primaryAuthor }
      : {}),

    coauthors: coauthors.filter(
      (
        author,
      ): author is PublicAuthorProfile =>
        author !== null,
    ),

    ...(editorialReviewer
      ? { editorialReviewer }
      : {}),

    ...(medicalReviewer
      ? { medicalReviewer }
      : {}),

    expertContributors:
      expertContributors.filter(
        (
          author,
        ): author is PublicAuthorProfile =>
          author !== null,
      ),
  }
}
