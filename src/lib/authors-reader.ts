import type { SelectType } from 'payload'

import type { Autori } from '@/payload-types'
import {
  type AuthorLanguage,
  type PublicAuthorProfile,
  type PublicAuthorSource,
  mergeAuthorLocaleFallback,
  normalizePublicAuthorProfile,
} from '@/lib/authors'
import { payloadClient } from '@/lib/payload'

const AUTHOR_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type SelectedAuthorSource =
  PublicAuthorSource & Pick<Autori, 'id'>

type AuthorPayload =
  Awaited<ReturnType<typeof payloadClient>>

export const PUBLIC_AUTHOR_SELECT = {
  id: true,
  fullName: true,
  slug: true,

  publicTitle: true,
  primaryAffiliation: true,
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

  status: true,
  publishedAt: true,
  lastReviewedAt: true,

  metaTitle: true,
  metaDescription: true,
  robots: true,
} satisfies SelectType

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

  return normalizePublicAuthorProfile(
    author,
    {
      language,
    },
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
    return normalizePublicAuthorProfile(
      primary,
      {
        language: 'ro',
      },
    )
  }

  const fallback = await findAuthorByID(
    payload,
    primary.id,
    'ro',
  )

  if (!fallback) {
    return normalizePublicAuthorProfile(
      primary,
      {
        language: 'en',
      },
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

  return normalizePublicAuthorProfile(
    merged.source,
    {
      language: 'en',
      fallbackFrom: 'ro',
      fallbackFields:
        merged.fallbackFields,
    },
  )
}
