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

  if (lang !== 'en') {
    return {}
  }

  const author = await getPublicAuthor(
    slug,
    'en',
  )

  if (!author) {
    return {}
  }

  return buildPublicAuthorMetadata(
    author,
    'en',
  )
}

export default async function EnglishAuthorPage(
  props: AuthorRouteProps,
) {
  const { lang, slug } = await props.params

  if (lang !== 'en') {
    notFound()
  }

  const author = await getPublicAuthor(
    slug,
    'en',
  )

  if (!author) {
    notFound()
  }

  return (
    <AuthorProfile
      author={author}
      language="en"
    />
  )
}
