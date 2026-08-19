import type { Autori } from '@/payload-types'

export type AuthorLanguage = 'ro' | 'en'

export type PublicAuthorSource = Pick<
  Autori,
  | 'fullName'
  | 'slug'
  | 'publicTitle'
  | 'primaryAffiliation'
  | 'shortBio'
  | 'biography'
  | 'platformRoleDescription'
  | 'publicLocation'
  | 'editorialRoles'
  | 'expertiseAreas'
  | 'specialties'
  | 'contributionTypes'
  | 'isMedicalReviewer'
  | 'medicalReviewScope'
  | 'credentials'
  | 'professionalIdentifiers'
  | 'publicEmail'
  | 'website'
  | 'institutionalProfile'
  | 'orcidUrl'
  | 'socialLinks'
  | 'conflictOfInterestStatement'
  | 'affiliationsAndSponsorships'
  | 'aiUseDisclosure'
  | 'publicationConsent'
  | 'publicContactConsent'
  | 'consentWithdrawnAt'
  | 'status'
  | 'publishedAt'
  | 'lastReviewedAt'
  | 'metaTitle'
  | 'metaDescription'
  | 'robots'
>

type AuthorCredential =
  NonNullable<Autori['credentials']>[number]

type AuthorProfessionalIdentifier =
  NonNullable<Autori['professionalIdentifiers']>[number]

type AuthorSocialLink =
  NonNullable<Autori['socialLinks']>[number]

type AuthorAffiliation =
  NonNullable<Autori['affiliationsAndSponsorships']>[number]

export type PublicAuthorEditorialRole =
  NonNullable<Autori['editorialRoles']>[number]

export type PublicAuthorContributionType =
  NonNullable<Autori['contributionTypes']>[number]

export type PublicAuthorCredential = {
  credentialType: AuthorCredential['credentialType']
  title: string
  institution?: string
  country?: string
  yearObtained?: number
  yearExpires?: number
}

export type PublicAuthorProfessionalIdentifier = {
  type: Exclude<
    AuthorProfessionalIdentifier['type'],
    null | undefined
  >
  value: string
}

export type PublicAuthorExpertiseArea = {
  name: string
  description?: string
}

export type PublicAuthorSpecialty = {
  label: string
  description?: string
}

export type PublicAuthorSocialLink = {
  platform: AuthorSocialLink['platform']
  label?: string
  url: string
}

export type PublicAuthorAffiliation = {
  organization: string
  relationshipType: AuthorAffiliation['relationshipType']
  description?: string
  startDate?: string
  endDate?: string
  currentlyActive?: boolean
}

export type PublicAuthorLocalization = {
  language: AuthorLanguage
  fallbackFrom?: AuthorLanguage
  fallbackFields: string[]
}

export type PublicAuthorProfile = {
  fullName: string
  slug: string

  publicTitle?: string
  primaryAffiliation?: string
  shortBio?: string
  biography?: NonNullable<Autori['biography']>
  platformRoleDescription?: string
  publicLocation?: string

  editorialRoles: PublicAuthorEditorialRole[]
  expertiseAreas?: PublicAuthorExpertiseArea[]
  specialties?: PublicAuthorSpecialty[]
  contributionTypes?: PublicAuthorContributionType[]
  medicalReviewScope?: string

  credentials?: PublicAuthorCredential[]
  professionalIdentifiers?: PublicAuthorProfessionalIdentifier[]

  publicEmail?: string
  website?: string
  institutionalProfile?: string
  orcidUrl?: string
  socialLinks?: PublicAuthorSocialLink[]

  conflictOfInterestStatement?: string
  affiliationsAndSponsorships?: PublicAuthorAffiliation[]
  aiUseDisclosure?: string

  publishedAt?: string
  lastReviewedAt?: string

  metaTitle?: string
  metaDescription?: string
  robots: Autori['robots']

  localization: PublicAuthorLocalization
}

export type NormalizePublicAuthorOptions = {
  language: AuthorLanguage
  fallbackFrom?: AuthorLanguage
  fallbackFields?: readonly string[]
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const cleaned = value.trim()

  return cleaned.length > 0 ? cleaned : undefined
}

function cleanHttpsUrl(value: unknown): string | undefined {
  const cleaned = cleanText(value)

  if (!cleaned) return undefined

  try {
    const parsed = new URL(cleaned)

    return parsed.protocol === 'https:' ? cleaned : undefined
  } catch {
    return undefined
  }
}

function cleanNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
}

function orderValue(value: unknown) {
  return cleanNumber(value) ?? 100
}

function normalizeFallbackFields(
  values: readonly string[] | undefined,
) {
  return [
    ...new Set(
      (values ?? [])
        .map(cleanText)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
}

export type MergeAuthorLocaleFallbackResult = {
  source: PublicAuthorSource
  fallbackFields: string[]
}

function hasRichTextContent(
  value: PublicAuthorSource['biography'],
) {
  if (!value || typeof value !== 'object') {
    return false
  }

  return (
    Array.isArray(value.root?.children) &&
    value.root.children.length > 0
  )
}

function fallbackLocalizedText(
  primaryValue: string | null | undefined,
  fallbackValue: string | null | undefined,
  field: string,
  fallbackFields: Set<string>,
) {
  if (cleanText(primaryValue)) {
    return primaryValue
  }

  if (cleanText(fallbackValue)) {
    fallbackFields.add(field)
    return fallbackValue
  }

  return primaryValue
}

function indexItemsByID<
  T extends {
    id?: string | null
  },
>(
  items: T[] | null | undefined,
) {
  const indexed = new Map<string, T>()

  for (const item of items ?? []) {
    if (
      typeof item.id === 'string' &&
      item.id.length > 0
    ) {
      indexed.set(item.id, item)
    }
  }

  return indexed
}

export function mergeAuthorLocaleFallback(
  primary: PublicAuthorSource,
  fallback: PublicAuthorSource,
): MergeAuthorLocaleFallbackResult {
  const fallbackFields = new Set<string>()

  const source: PublicAuthorSource = {
    ...primary,
    expertiseAreas: primary.expertiseAreas?.map(
      (item) => ({ ...item }),
    ),
    specialties: primary.specialties?.map(
      (item) => ({ ...item }),
    ),
    credentials: primary.credentials?.map(
      (item) => ({ ...item }),
    ),
    socialLinks: primary.socialLinks?.map(
      (item) => ({ ...item }),
    ),
    affiliationsAndSponsorships:
      primary.affiliationsAndSponsorships?.map(
        (item) => ({ ...item }),
      ),
  }

  source.publicTitle = fallbackLocalizedText(
    primary.publicTitle,
    fallback.publicTitle,
    'publicTitle',
    fallbackFields,
  )

  source.primaryAffiliation =
    fallbackLocalizedText(
      primary.primaryAffiliation,
      fallback.primaryAffiliation,
      'primaryAffiliation',
      fallbackFields,
    )

  source.shortBio = fallbackLocalizedText(
    primary.shortBio,
    fallback.shortBio,
    'shortBio',
    fallbackFields,
  )

  if (
    !hasRichTextContent(primary.biography) &&
    hasRichTextContent(fallback.biography)
  ) {
    source.biography = fallback.biography
    fallbackFields.add('biography')
  }

  source.platformRoleDescription =
    fallbackLocalizedText(
      primary.platformRoleDescription,
      fallback.platformRoleDescription,
      'platformRoleDescription',
      fallbackFields,
    )

  source.publicLocation = fallbackLocalizedText(
    primary.publicLocation,
    fallback.publicLocation,
    'publicLocation',
    fallbackFields,
  )

  source.medicalReviewScope =
    fallbackLocalizedText(
      primary.medicalReviewScope,
      fallback.medicalReviewScope,
      'medicalReviewScope',
      fallbackFields,
    )

  source.conflictOfInterestStatement =
    fallbackLocalizedText(
      primary.conflictOfInterestStatement,
      fallback.conflictOfInterestStatement,
      'conflictOfInterestStatement',
      fallbackFields,
    )

  source.aiUseDisclosure =
    fallbackLocalizedText(
      primary.aiUseDisclosure,
      fallback.aiUseDisclosure,
      'aiUseDisclosure',
      fallbackFields,
    )

  source.metaTitle = fallbackLocalizedText(
    primary.metaTitle,
    fallback.metaTitle,
    'metaTitle',
    fallbackFields,
  )

  source.metaDescription =
    fallbackLocalizedText(
      primary.metaDescription,
      fallback.metaDescription,
      'metaDescription',
      fallbackFields,
    )

  if (
    (primary.specialties?.length ?? 0) === 0 &&
    (fallback.specialties?.length ?? 0) > 0
  ) {
    source.specialties =
      fallback.specialties?.map(
        (item) => ({ ...item }),
      )

    fallbackFields.add('specialties')
  }

  const fallbackExpertiseByID =
    indexItemsByID(fallback.expertiseAreas)

  source.expertiseAreas =
    source.expertiseAreas?.map((item) => {
      if (!item.id) return item

      const fallbackItem =
        fallbackExpertiseByID.get(item.id)

      if (!fallbackItem) return item

      const name = fallbackLocalizedText(
        item.name,
        fallbackItem.name,
        'expertiseAreas.name',
        fallbackFields,
      )

      const description = fallbackLocalizedText(
        item.description,
        fallbackItem.description,
        'expertiseAreas.description',
        fallbackFields,
      )

      return {
        ...item,
        name: name ?? item.name,
        description,
      }
    })

  const fallbackCredentialsByID =
    indexItemsByID(fallback.credentials)

  source.credentials =
    source.credentials?.map((item) => {
      if (!item.id) return item

      const fallbackItem =
        fallbackCredentialsByID.get(item.id)

      if (!fallbackItem) return item

      const title = fallbackLocalizedText(
        item.title,
        fallbackItem.title,
        'credentials.title',
        fallbackFields,
      )

      return {
        ...item,
        title: title ?? item.title,
      }
    })

  const fallbackSocialLinksByID =
    indexItemsByID(fallback.socialLinks)

  source.socialLinks =
    source.socialLinks?.map((item) => {
      if (!item.id) return item

      const fallbackItem =
        fallbackSocialLinksByID.get(item.id)

      if (!fallbackItem) return item

      return {
        ...item,
        label: fallbackLocalizedText(
          item.label,
          fallbackItem.label,
          'socialLinks.label',
          fallbackFields,
        ),
      }
    })

  const fallbackAffiliationsByID =
    indexItemsByID(
      fallback.affiliationsAndSponsorships,
    )

  source.affiliationsAndSponsorships =
    source.affiliationsAndSponsorships?.map(
      (item) => {
        if (!item.id) return item

        const fallbackItem =
          fallbackAffiliationsByID.get(item.id)

        if (!fallbackItem) return item

        return {
          ...item,
          description: fallbackLocalizedText(
            item.description,
            fallbackItem.description,
            'affiliationsAndSponsorships.description',
            fallbackFields,
          ),
        }
      },
    )

  return {
    source,
    fallbackFields: [...fallbackFields],
  }
}

export function normalizePublicAuthorProfile(
  author: PublicAuthorSource,
  options: NormalizePublicAuthorOptions,
): PublicAuthorProfile | null {
  if (
    author.status !== 'published' ||
    author.publicationConsent !== true ||
    Boolean(author.consentWithdrawnAt)
  ) {
    return null
  }

  const fullName = cleanText(author.fullName)
  const slug = cleanText(author.slug)

  if (!fullName || !slug) return null

  const publicTitle = cleanText(author.publicTitle)
  const primaryAffiliation =
    cleanText(author.primaryAffiliation)
  const shortBio = cleanText(author.shortBio)
  const platformRoleDescription =
    cleanText(author.platformRoleDescription)
  const publicLocation = cleanText(author.publicLocation)

  const editorialRoles = [
    ...(author.editorialRoles ?? []),
  ]

  const expertiseAreas = [
    ...(author.expertiseAreas ?? []),
  ]
    .filter((item) => item.verified === true)
    .sort(
      (a, b) =>
        orderValue(a.order) - orderValue(b.order),
    )
    .flatMap((item): PublicAuthorExpertiseArea[] => {
      const name = cleanText(item.name)

      if (!name) return []

      const description = cleanText(item.description)

      return [
        {
          name,
          ...(description ? { description } : {}),
        },
      ]
    })

  const specialties = [
    ...(author.specialties ?? []),
  ]
    .sort(
      (a, b) =>
        orderValue(a.order) - orderValue(b.order),
    )
    .flatMap((item): PublicAuthorSpecialty[] => {
      const label = cleanText(item.label)

      if (!label) return []

      const description = cleanText(item.description)

      return [
        {
          label,
          ...(description ? { description } : {}),
        },
      ]
    })

  const contributionTypes = [
    ...(author.contributionTypes ?? []),
  ]

  const medicalReviewScope =
    author.isMedicalReviewer === true
      ? cleanText(author.medicalReviewScope)
      : undefined

  const credentials = [
    ...(author.credentials ?? []),
  ]
    .filter(
      (item) =>
        item.publiclyVisible === true &&
        item.verified === true,
    )
    .sort(
      (a, b) =>
        orderValue(a.order) - orderValue(b.order),
    )
    .flatMap((item): PublicAuthorCredential[] => {
      const title = cleanText(item.title)

      if (!title) return []

      const institution = cleanText(item.institution)
      const country = cleanText(item.country)
      const yearObtained = cleanNumber(item.yearObtained)
      const yearExpires = cleanNumber(item.yearExpires)

      return [
        {
          credentialType: item.credentialType,
          title,
          ...(institution ? { institution } : {}),
          ...(country ? { country } : {}),
          ...(yearObtained !== undefined
            ? { yearObtained }
            : {}),
          ...(yearExpires !== undefined
            ? { yearExpires }
            : {}),
        },
      ]
    })

  const professionalIdentifiers = [
    ...(author.professionalIdentifiers ?? []),
  ].flatMap(
    (
      item,
    ): PublicAuthorProfessionalIdentifier[] => {
      if (
        item.publiclyVisible !== true ||
        item.verified !== true ||
        !item.type
      ) {
        return []
      }

      const value = cleanText(item.value)

      if (!value) return []

      return [
        {
          type: item.type,
          value,
        },
      ]
    },
  )

  const publicContactAllowed =
    author.publicContactConsent === true

  const publicEmail = publicContactAllowed
    ? cleanText(author.publicEmail)
    : undefined

  const website = publicContactAllowed
    ? cleanHttpsUrl(author.website)
    : undefined

  const institutionalProfile = publicContactAllowed
    ? cleanHttpsUrl(author.institutionalProfile)
    : undefined

  const orcidUrl = publicContactAllowed
    ? cleanHttpsUrl(author.orcidUrl)
    : undefined

  const socialLinks = publicContactAllowed
    ? [...(author.socialLinks ?? [])]
        .filter((item) => item.enabled !== false)
        .sort(
          (a, b) =>
            orderValue(a.order) - orderValue(b.order),
        )
        .flatMap(
          (item): PublicAuthorSocialLink[] => {
            const url = cleanHttpsUrl(item.url)

            if (!url) return []

            const label = cleanText(item.label)

            return [
              {
                platform: item.platform,
                url,
                ...(label ? { label } : {}),
              },
            ]
          },
        )
    : []

  const conflictOfInterestStatement =
    cleanText(author.conflictOfInterestStatement)

  const affiliationsAndSponsorships = [
    ...(author.affiliationsAndSponsorships ?? []),
  ].flatMap((item): PublicAuthorAffiliation[] => {
    if (
      item.publiclyVisible !== true ||
      item.verified !== true
    ) {
      return []
    }

    const organization = cleanText(item.organization)

    if (!organization) return []

    const description = cleanText(item.description)
    const startDate = cleanText(item.startDate)
    const endDate = cleanText(item.endDate)

    return [
      {
        organization,
        relationshipType: item.relationshipType,
        ...(description ? { description } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(typeof item.currentlyActive === 'boolean'
          ? { currentlyActive: item.currentlyActive }
          : {}),
      },
    ]
  })

  const aiUseDisclosure =
    cleanText(author.aiUseDisclosure)

  const publishedAt = cleanText(author.publishedAt)
  const lastReviewedAt =
    cleanText(author.lastReviewedAt)

  const metaTitle = cleanText(author.metaTitle)
  const metaDescription =
    cleanText(author.metaDescription)

  const fallbackFields =
    normalizeFallbackFields(options.fallbackFields)

  const fallbackFrom =
    options.fallbackFrom &&
    options.fallbackFrom !== options.language &&
    fallbackFields.length > 0
      ? options.fallbackFrom
      : undefined

  return {
    fullName,
    slug,

    ...(publicTitle ? { publicTitle } : {}),
    ...(primaryAffiliation
      ? { primaryAffiliation }
      : {}),
    ...(shortBio ? { shortBio } : {}),
    ...(author.biography
      ? { biography: author.biography }
      : {}),
    ...(platformRoleDescription
      ? { platformRoleDescription }
      : {}),
    ...(publicLocation ? { publicLocation } : {}),

    editorialRoles,
    ...(expertiseAreas.length > 0
      ? { expertiseAreas }
      : {}),
    ...(specialties.length > 0
      ? { specialties }
      : {}),
    ...(contributionTypes.length > 0
      ? { contributionTypes }
      : {}),
    ...(medicalReviewScope
      ? { medicalReviewScope }
      : {}),

    ...(credentials.length > 0
      ? { credentials }
      : {}),
    ...(professionalIdentifiers.length > 0
      ? { professionalIdentifiers }
      : {}),

    ...(publicEmail ? { publicEmail } : {}),
    ...(website ? { website } : {}),
    ...(institutionalProfile
      ? { institutionalProfile }
      : {}),
    ...(orcidUrl ? { orcidUrl } : {}),
    ...(socialLinks.length > 0
      ? { socialLinks }
      : {}),

    ...(conflictOfInterestStatement
      ? { conflictOfInterestStatement }
      : {}),
    ...(affiliationsAndSponsorships.length > 0
      ? { affiliationsAndSponsorships }
      : {}),
    ...(aiUseDisclosure
      ? { aiUseDisclosure }
      : {}),

    ...(publishedAt ? { publishedAt } : {}),
    ...(lastReviewedAt ? { lastReviewedAt } : {}),

    ...(metaTitle ? { metaTitle } : {}),
    ...(metaDescription ? { metaDescription } : {}),
    robots: author.robots,

    localization: {
      language: options.language,
      ...(fallbackFrom ? { fallbackFrom } : {}),
      fallbackFields,
    },
  }
}
