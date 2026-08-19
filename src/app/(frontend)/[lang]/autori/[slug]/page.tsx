import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import AuthorProfile from '@/components/AuthorProfile'
import {
  buildPublicAuthorMetadata,
} from '@/lib/authors-page'
import {
  getPublicAuthor,
} from '@/lib/authors-reader'

type AuthorRouteProps = {
  params: Promise<{
    lang: string
    slug: string
  }>
}

export async function generateMetadata(
  props: AuthorRouteProps,
): Promise<Metadata> {
  const { lang, slug } = await props.params

  if (lang !== 'ro') {
    return {}
  }

  const author = await getPublicAuthor(
    slug,
    'ro',
  )

  if (!author) {
    return {}
  }

  return buildPublicAuthorMetadata(
    author,
    'ro',
  )
}

export default async function RomanianAuthorPage(
  props: AuthorRouteProps,
) {
  const { lang, slug } = await props.params

  if (lang !== 'ro') {
    notFound()
  }

  const author = await getPublicAuthor(
    slug,
    'ro',
  )

  if (!author) {
    notFound()
  }

  return (
    <AuthorProfile
      author={author}
      language="ro"
    />
  )
}
