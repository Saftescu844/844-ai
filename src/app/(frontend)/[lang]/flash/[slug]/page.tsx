import type { Metadata } from 'next'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'

import ArticleDates from '@/components/ArticleDates'
import CommentsSection from '@/components/CommentsSection'
import NewsletterForm from '@/components/NewsletterForm'
import { getCachedSiteSettings, getFlashAiBySlug } from '@/lib/payload'
import { jsxConvertersCuImagini } from '@/lib/richtext-converters'

function flashTypeLabel(value: string, lang: string): string {
  const labels: Record<string, { ro: string; en: string }> = {
    announcement: { ro: 'Anunț', en: 'Announcement' },
    research: { ro: 'Cercetare', en: 'Research' },
    regulation: { ro: 'Reglementare', en: 'Regulation' },
    product: { ro: 'Produs / instrument', en: 'Product / tool' },
    business: { ro: 'Afaceri', en: 'Business' },
    incident: { ro: 'Incident', en: 'Incident' },
    update: { ro: 'Actualizare', en: 'Update' },
    other: { ro: 'Altele', en: 'Other' },
  }

  return labels[value]?.[lang === 'en' ? 'en' : 'ro']
    ?? (lang === 'ro' ? 'Flash' : 'Flash')
}

function informationStatusLabel(value: string, lang: string): string {
  const labels: Record<string, { ro: string; en: string }> = {
    official: { ro: 'Oficial', en: 'Official' },
    confirmed: { ro: 'Confirmat', en: 'Confirmed' },
    emerging: { ro: 'Emergent', en: 'Emerging' },
    preliminary: { ro: 'Preliminar', en: 'Preliminary' },
    disputed: { ro: 'Contestat', en: 'Disputed' },
    unverified: { ro: 'Neverificat', en: 'Unverified' },
  }

  return labels[value]?.[lang === 'en' ? 'en' : 'ro'] ?? value
}

export async function generateMetadata(props: {
  params: Promise<{ lang: string; slug: string }>
}): Promise<Metadata> {
  const { lang, slug } = await props.params
  const flash = await getFlashAiBySlug(slug, lang)

  if (!flash) return {}

  const url = `/${lang}/flash/${slug}`
  const alt =
    flash.versiuneAlternativa &&
    typeof flash.versiuneAlternativa === 'object'
      ? flash.versiuneAlternativa
      : null

  const image =
    flash.imaginePrincipala &&
    typeof flash.imaginePrincipala === 'object' &&
    flash.imaginePrincipala.url
      ? flash.imaginePrincipala.url
      : null

  return {
    title: flash.titlu,
    description: flash.excerpt || undefined,
    alternates: {
      canonical: url,
      ...(alt?._status === 'published' && alt.slug
        ? {
            languages: {
              [lang === 'ro' ? 'en' : 'ro']:
                `/${alt.limba}/flash/${alt.slug}`,
            },
          }
        : {}),
    },
    openGraph: {
      title: flash.titlu,
      description: flash.excerpt || undefined,
      type: 'article',
      url,
      locale: lang === 'ro' ? 'ro_RO' : 'en_US',
      ...(image ? { images: [{ url: image }] } : {}),
      ...(flash.publishedAt
        ? { publishedTime: flash.publishedAt }
        : {}),
      ...(flash.significantUpdatedAt
        ? { modifiedTime: flash.significantUpdatedAt }
        : {}),
    },
  }
}

export default async function PaginaFlash(props: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { lang, slug } = await props.params

  const [flash, siteSettings] = await Promise.all([
    getFlashAiBySlug(slug, lang),
    getCachedSiteSettings(lang),
  ])

  if (!flash) {
    notFound()
  }

  const alt =
    flash.versiuneAlternativa &&
    typeof flash.versiuneAlternativa === 'object'
      ? flash.versiuneAlternativa
      : null

  const altLink =
    alt?._status === 'published' && alt.slug
      ? `/${alt.limba}/flash/${alt.slug}`
      : null

  const source =
    flash.surseFlash?.find((item) => item.primary === true)
    ?? flash.surseFlash?.[0]
    ?? null

  const sourceName =
    source?.sursa &&
    typeof source.sursa === 'object'
      ? source.sursa.nume
      : null

  const healthDisclaimer =
    lang === 'ro'
      ? 'Conținut informativ despre cercetare și sănătate. Nu constituie sfat medical și nu descrie un tratament disponibil pentru pacienți.'
      : 'Informational research and health content. This is not medical advice and does not describe a treatment currently available to patients.'

  return (
    <article
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '2.5rem 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#7A4E00',
          }}
        >
          Flash AI · {flashTypeLabel(flash.flashType, lang)}
        </span>

        {altLink && (
          <a
            href={altLink}
            style={{
              fontSize: 13,
              color: '#185FA5',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {lang === 'ro'
              ? 'Read in English →'
              : '← Citește în română'}
          </a>
        )}
      </div>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1.2,
          margin: '10px 0 12px',
        }}
      >
        {flash.titlu}
      </h1>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 12,
            background: '#f6f6f4',
            borderRadius: 999,
            padding: '4px 9px',
            color: '#555',
          }}
        >
          {informationStatusLabel(flash.informationStatus, lang)}
        </span>

        {flash.isHealthRelated && (
          <span
            style={{
              fontSize: 12,
              background: '#FCF3E8',
              borderRadius: 999,
              padding: '4px 9px',
              color: '#7A5A1E',
            }}
          >
            {lang === 'ro' ? 'Sănătate' : 'Health'}
          </span>
        )}
      </div>

      <ArticleDates
        publishedAt={flash.publishedAt}
        significantUpdatedAt={flash.significantUpdatedAt}
        lang={lang}
      />

      {flash.isHealthRelated && (
        <div
          style={{
            marginBottom: 24,
            padding: '14px 18px',
            background: '#FCF3E8',
            border: '1px solid #E8C99B',
            borderRadius: 10,
            fontSize: 14,
            color: '#7A5A1E',
            lineHeight: 1.5,
          }}
        >
          ⚕️ {healthDisclaimer}
        </div>
      )}

      <div
        style={{
          fontSize: 17,
          lineHeight: 1.7,
          color: '#222',
        }}
      >
        <RichText
          data={flash.continut as any}
          converters={jsxConvertersCuImagini}
        />
      </div>

      {source?.url && (
        <div
          style={{
            marginTop: 36,
            padding: '18px 20px',
            background: '#f6f6f4',
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            {lang === 'ro' ? 'Sursă primară' : 'Primary source'}
          </p>

          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#185FA5',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {sourceName || source.url} →
          </a>

          {source.sourcePublishedAt && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12,
                color: '#888',
              }}
            >
              {lang === 'ro' ? 'Publicată de sursă' : 'Source publication date'}:{' '}
              {new Intl.DateTimeFormat(
                lang === 'ro' ? 'ro-RO' : 'en-GB',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                },
              ).format(new Date(source.sourcePublishedAt))}
            </p>
          )}
        </div>
      )}

      <CommentsSection
        targetType="flash"
        targetId={flash.id}
        lang={lang}
      />

      {siteSettings?.newsletter?.enabled !== false && (
        <div style={{ marginTop: 32 }}>
          <NewsletterForm
            lang={lang}
            settings={siteSettings?.newsletter}
          />
        </div>
      )}
    </article>
  )
}
