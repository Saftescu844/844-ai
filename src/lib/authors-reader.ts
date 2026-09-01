import type { SelectType } from 'payload'

import type { Autori } from '@/payload-types'
import {
  type AuthorLanguage,
  type PublicAuthorImage,
  type PublicAuthorProfile,
  type PublicAuthorSource,
  mergeAuthorLocaleFallback,
  normalizePublicAuthorProfile,
} from '@/lib/authors'
import { payloadClient } from '@/lib/payload'

const AUTHOR_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type SelectedAuthorSource =
  PublicAuthorSource &
  Pick<
    Autori,
    'id' | 'profileImage' | 'socialImage'
  >

type AuthorPayload =
  Awaited<ReturnType<typeof payloadClient>>

export const PUBLIC_AUTHOR_SELECT = {
  id: true,
  profileType: true,
  fullName: true,
  slug: true,

  publicTitle: true,
  primaryAffiliation: true,
  profileImage: true,
  shortBio: true,
  biography: true,
  platformRoleDescription: true,
  publicLocation: true,

  editorialRoles: true,

  expertiseAreas: {
    id: true,
    name: true,
    description: true,
    verified: true,
    order: true,
  },

  specialties: {
    label: true,
    description: true,
    order: true,
  },

  contributionTypes: true,

  isMedicalReviewer: true,
  medicalReviewScope: true,

  credentials: {
    id: true,
    credentialType: true,
    title: true,
    institution: true,
    country: true,
    yearObtained: true,
    yearExpires: true,
    publiclyVisible: true,
    verified: true,
    order: true,
  },

  professionalIdentifiers: {
    type: true,
    value: true,
    publiclyVisible: true,
    verified: true,
  },

  publicEmail: true,
  website: true,
  institutionalProfile: true,
  orcidUrl: true,

  socialLinks: {
    id: true,
    platform: true,
    label: true,
    url: true,
    enabled: true,
    order: true,
  },

  conflictOfInterestStatement: true,

  affiliationsAndSponsorships: {
    id: true,
    organization: true,
    relationshipType: true,
    description: true,
    startDate: true,
    endDate: true,
    currentlyActive: true,
    publiclyVisible: true,
    verified: true,
  },

  aiUseDisclosure: true,

  publicationConsent: true,
  publicContactConsent: true,
  consentWithdrawnAt: true,
  nextVerificationDue: true,

  status: true,
  publishedAt: true,
  lastReviewedAt: true,

  metaTitle: true,
  metaDescription: true,
  socialImage: true,
  robots: true,
} satisfies SelectType

function getMediaID(
  value:
    | Autori['profileImage']
    | Autori['socialImage'],
): number | undefined {
  if (typeof value === 'number') {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'number'
  ) {
    return value.id
  }

  return undefined
}

function cleanPublicText(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const cleaned = value.trim()

  return cleaned.length > 0
    ? cleaned
    : undefined
}

function cleanPublicImageURL(
  value: unknown,
): string | undefined {
  const cleaned = cleanPublicText(value)

  if (!cleaned) return undefined

  try {
    const parsed = new URL(cleaned)

    return parsed.protocol === 'https:'
      ? cleaned
      : undefined
  } catch {
    return undefined
  }
}

async function readPublicAuthorImage(
  payload: AuthorPayload,
  value:
    | Autori['profileImage']
    | Autori['socialImage'],
  language: AuthorLanguage,
): Promise<PublicAuthorImage | undefined> {
  const id = getMediaID(value)

  if (id === undefined) {
    return undefined
  }

  const media = await payload.findByID({
    collection: 'media',
    id,
    locale: language,
    fallbackLocale: false,
    overrideAccess: true,
    depth: 0,
    disableErrors: true,
    select: {
      url: true,
      alt: true,
      credit: true,
      sursaImagine: true,
      dreptUtilizareConfirmat: true,
    },
  })

  if (
    !media?.sursaImagine ||
    media.dreptUtilizareConfirmat !== true
  ) {
    return undefined
  }

  const credit = cleanPublicText(media.credit)

  if (
    media.sursaImagine === 'alta' &&
    !credit
  ) {
    return undefined
  }

  const url = cleanPublicImageURL(media.url)

  if (!url) {
    return undefined
  }

  const alt = cleanPublicText(media.alt)

  return {
    url,
    ...(alt ? { alt } : {}),
    ...(credit ? { credit } : {}),
  }
}

async function attachPublicAuthorImages(
  payload: AuthorPayload,
  source: SelectedAuthorSource,
  profile: PublicAuthorProfile | null,
  language: AuthorLanguage,
): Promise<PublicAuthorProfile | null> {
  if (!profile) {
    return null
  }

  const [profileImage, socialImage] =
    await Promise.all([
      readPublicAuthorImage(
        payload,
        source.profileImage,
        language,
      ),
      readPublicAuthorImage(
        payload,
        source.socialImage,
        language,
      ),
    ])

  return {
    ...profile,
    ...(profileImage
      ? { profileImage }
      : {}),
    ...(socialImage
      ? { socialImage }
      : {}),
  }
}

function normalizeSlug(
  value: string,
): string | null {
  const slug = value.trim()

  if (
    !slug ||
    !AUTHOR_SLUG_PATTERN.test(slug)
  ) {
    return null
  }

  return slug
}

async function findAuthorBySlug(
  payload: AuthorPayload,
  slug: string,
  language: AuthorLanguage,
): Promise<SelectedAuthorSource | null> {
  const result = await payload.find({
    collection: 'autori',
    locale: language,
    fallbackLocale: false,
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        {
          status: {
            equals: 'published',
          },
        },
      ],
    },
    select: PUBLIC_AUTHOR_SELECT,
  })

  return result.docs[0] ?? null
}

async function findAuthorByID(
  payload: AuthorPayload,
  id: Autori['id'],
  language: AuthorLanguage,
): Promise<SelectedAuthorSource | null> {
  const author = await payload.findByID({
    collection: 'autori',
    id,
    locale: language,
    fallbackLocale: false,
    overrideAccess: true,
    depth: 0,
    disableErrors: true,
    select: PUBLIC_AUTHOR_SELECT,
  })

  return author ?? null
}

export async function getPublicAuthorInLocale(
  slugValue: string,
  language: AuthorLanguage,
): Promise<PublicAuthorProfile | null> {
  const slug = normalizeSlug(slugValue)

  if (!slug) return null

  const payload = await payloadClient()

  const author = await findAuthorBySlug(
    payload,
    slug,
    language,
  )

  if (!author) return null

  const profile =
    normalizePublicAuthorProfile(
      author,
      {
        language,
      },
    )

  return attachPublicAuthorImages(
    payload,
    author,
    profile,
    language,
  )
}

export async function getPublicAuthorByID(
  id: Autori['id'],
  language: AuthorLanguage,
): Promise<PublicAuthorProfile | null> {
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null
  }

  const payload = await payloadClient()

  const primary = await findAuthorByID(
    payload,
    id,
    language,
  )

  if (!primary) return null

  if (language === 'ro') {
    const profile =
      normalizePublicAuthorProfile(
        primary,
        {
          language: 'ro',
        },
      )

    return attachPublicAuthorImages(
      payload,
      primary,
      profile,
      'ro',
    )
  }

  const fallback = await findAuthorByID(
    payload,
    id,
    'ro',
  )

  if (!fallback) {
    const profile =
      normalizePublicAuthorProfile(
        primary,
        {
          language: 'en',
        },
      )

    return attachPublicAuthorImages(
      payload,
      primary,
      profile,
      'en',
    )
  }

  const validFallback =
    normalizePublicAuthorProfile(
      fallback,
      {
        language: 'ro',
      },
    )

  if (!validFallback) return null

  const merged =
    mergeAuthorLocaleFallback(
      primary,
      fallback,
    )

  const profile =
    normalizePublicAuthorProfile(
      merged.source,
      {
        language: 'en',
        fallbackFrom: 'ro',
        fallbackFields:
          merged.fallbackFields,
      },
    )

  return attachPublicAuthorImages(
    payload,
    primary,
    profile,
    'en',
  )
}

export async function getPublicAuthor(
  slugValue: string,
  language: AuthorLanguage,
): Promise<PublicAuthorProfile | null> {
  const slug = normalizeSlug(slugValue)

  if (!slug) return null

  const payload = await payloadClient()

  const primary = await findAuthorBySlug(
    payload,
    slug,
    language,
  )

  if (!primary) return null

  if (language === 'ro') {
    const profile =
      normalizePublicAuthorProfile(
        primary,
        {
          language: 'ro',
        },
      )

    return attachPublicAuthorImages(
      payload,
      primary,
      profile,
      'ro',
    )
  }

  const fallback = await findAuthorByID(
    payload,
    primary.id,
    'ro',
  )

  if (!fallback) {
    const profile =
      normalizePublicAuthorProfile(
        primary,
        {
          language: 'en',
        },
      )

    return attachPublicAuthorImages(
      payload,
      primary,
      profile,
      'en',
    )
  }

  // Protecție defensivă pentru cazul rar în
  // care starea publică se modifică între cele
  // două citiri.
  const validFallback =
    normalizePublicAuthorProfile(
      fallback,
      {
        language: 'ro',
      },
    )

  if (!validFallback) return null

  const merged =
    mergeAuthorLocaleFallback(
      primary,
      fallback,
    )

  const profile =
    normalizePublicAuthorProfile(
      merged.source,
      {
        language: 'en',
        fallbackFrom: 'ro',
        fallbackFields:
          merged.fallbackFields,
      },
    )

  return attachPublicAuthorImages(
    payload,
    primary,
    profile,
    'en',
  )
}
