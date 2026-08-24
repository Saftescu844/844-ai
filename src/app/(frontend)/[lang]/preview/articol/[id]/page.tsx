import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import ArticleView from '@/components/ArticleView'
import {
  getCachedSiteSettings,
  payloadClient,
} from '@/lib/payload'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = 'force-dynamic'

export default async function ArticlePreviewPage(props: {
  params: Promise<{
    lang: string
    id: string
  }>
}) {
  const { lang, id } = await props.params

  if (lang !== 'ro' && lang !== 'en') {
    notFound()
  }

  const payload = await payloadClient()
  const requestHeaders = await headers()

  const { user } = await payload.auth({
    headers: requestHeaders,
  })

  if (!user) {
    notFound()
  }

  let articol

  try {
    articol = await payload.findByID({
      collection: 'articole',
      id,
      draft: true,
      depth: 2,
      overrideAccess: false,
      user,
    })
  } catch {
    notFound()
  }

  if (articol.limba !== lang) {
    notFound()
  }

  const siteSettings = await getCachedSiteSettings(lang)

  return (
    <>
      <div
        role="status"
        style={{
          maxWidth: 720,
          margin: '24px auto 0',
          padding: '10px 14px',
          border: '1px solid #D7A600',
          borderRadius: 8,
          background: '#FFF8D8',
          color: '#5E4A00',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        PREVIEW — această versiune nu este pagina publică.
      </div>

      <ArticleView
        articol={articol}
        lang={lang}
        newsletterSettings={siteSettings?.newsletter}
      />
    </>
  )
}
