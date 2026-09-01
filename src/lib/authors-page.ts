import type { Metadata } from 'next'

import type {
  AuthorLanguage,
  PublicAuthorProfile,
} from '@/lib/authors'

export function getAuthorProfileHref(
  language: AuthorLanguage,
  slug: string,
) {
  return language === 'ro'
    ? `/ro/autori/${slug}`
    : `/en/authors/${slug}`
}

export function getAuthorAlternateHrefs(
  slug: string,
) {
  return {
    ro: getAuthorProfileHref('ro', slug),
    en: getAuthorProfileHref('en', slug),
  }
}

function getAuthorRobotsMetadata(
  robots: PublicAuthorProfile['robots'],
): NonNullable<Metadata['robots']> {
  if (robots === 'noindexNofollow') {
    return {
      index: false,
      follow: false,
    }
  }

  if (robots === 'noindexFollow') {
    return {
      index: false,
      follow: true,
    }
  }

  return {
    index: true,
    follow: true,
  }
}

export function buildPublicAuthorMetadata(
  author: PublicAuthorProfile,
  language: AuthorLanguage,
): Metadata {
  const canonical = getAuthorProfileHref(
    language,
    author.slug,
  )

  const title =
    author.metaTitle ||
    (
      author.publicTitle
        ? `${author.fullName} — ${author.publicTitle}`
        : author.fullName
    )

  const description =
    author.metaDescription ||
    author.shortBio ||
    author.platformRoleDescription

  const alternateHrefs =
    getAuthorAlternateHrefs(author.slug)

  const socialImage =
    author.socialImage ??
    author.profileImage

  return {
    title,

    ...(description
      ? {
          description,
        }
      : {}),

    alternates: {
      canonical,
      languages: alternateHrefs,
    },

    robots: getAuthorRobotsMetadata(
      author.robots,
    ),

    openGraph: {
      title,

      ...(description
        ? {
            description,
          }
        : {}),

      type: 'profile',
      url: canonical,

      ...(socialImage
        ? {
            images: [
              {
                url: socialImage.url,
                alt:
                  socialImage.alt ??
                  author.fullName,
              },
            ],
          }
        : {}),

      locale:
        language === 'ro'
          ? 'ro_RO'
          : 'en_US',
    },
  }
}
