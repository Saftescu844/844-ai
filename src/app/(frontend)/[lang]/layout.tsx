import React, { cache } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/payload'

const getCachedSiteSettings = cache(getSiteSettings)

const PILONI = [
  { slug: 'stiri', ro: 'Știri AI', en: 'AI News' },
  { slug: 'sanatate', ro: 'Sănătate', en: 'Health' },
  { slug: 'educatie', ro: 'Educație', en: 'Education' },
  { slug: 'tools', ro: 'Tool Directory', en: 'Tools' },
  { slug: 'afaceri', ro: 'Afaceri', en: 'Business' },
]

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await props.params
  const siteSettings = await getCachedSiteSettings(lang)

  const fallbackTitle =
    lang === 'en'
      ? '844-ai.ro — Everything that matters in AI, in one place'
      : '844-ai.ro — Tot ce contează în AI, într-un singur loc'

  const fallbackDescription =
    lang === 'en'
      ? 'Romanian AI platform covering AI news, healthcare, education, AI tools and business. Available in Romanian and English.'
      : 'Platformă românească de referință pentru inteligența artificială: știri AI, sănătate, educație, tool directory și afaceri. Bilingv RO/EN.'

  const title = siteSettings?.metadata.defaultMetaTitle?.trim() || fallbackTitle
  const description =
    siteSettings?.metadata.defaultMetaDescription?.trim() || fallbackDescription
  const siteName = siteSettings?.identity.siteName?.trim() || '844-ai.ro'
  const twitterCardType = siteSettings?.metadata.twitterCardType ?? 'summary_large_image'
  const robotsDefault = siteSettings?.metadata.robotsDefault ?? 'indexFollow'

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      siteName,
      type: 'website',
    },
    twitter: {
      card: twitterCardType,
      title,
      description,
    },
    robots:
      robotsDefault === 'noindexNofollow'
        ? { index: false, follow: false }
        : { index: true, follow: true },
  }
}

export default async function LangLayout(props: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await props.params
  const siteSettings = await getCachedSiteSettings(lang)

  const fallbackLegalLinks =
    lang === 'en'
      ? [
          { label: 'Privacy Policy', href: '/en/politica-confidentialitate' },
          { label: 'Cookie Policy', href: '/en/politica-cookie-uri' },
        ]
      : [
          { label: 'Politica de confidențialitate', href: '/ro/politica-confidentialitate' },
          { label: 'Politica de cookie-uri', href: '/ro/politica-cookie-uri' },
        ]

  const configuredLegalLinks =
    siteSettings?.legalLinks
      ?.filter((link) => link.enabled !== false)
      .sort((a, b) => a.order - b.order)
      .map((link) => ({ label: link.label, href: link.href })) ?? []

  const legalLinks = configuredLegalLinks.length > 0 ? configuredLegalLinks : fallbackLegalLinks

  const fallbackLanguages = [
    { code: 'ro', shortLabel: 'RO', order: 0 },
    { code: 'en', shortLabel: 'EN', order: 1 },
  ]

  const configuredLanguages =
    siteSettings?.languageSettings.availableLanguages
      .filter((language) => language.enabled !== false)
      .sort((a, b) => a.order - b.order)
      .map((language) => ({
        code: language.code,
        shortLabel: language.shortLabel,
        order: language.order,
      })) ?? []

  const availableLanguages =
    configuredLanguages.length > 0 ? configuredLanguages : fallbackLanguages

  const showLanguageSwitcher =
    siteSettings?.languageSettings.showLanguageSwitcher !== false

  const fallbackSiteName = '844-ai.ro'
  const fallbackTagline =
    lang === 'en'
      ? 'Everything that matters in AI, in one place.'
      : 'Tot ce contează în AI, într-un singur loc.'

  const siteName = siteSettings?.identity.siteName?.trim() || fallbackSiteName
  const tagline = siteSettings?.identity.tagline?.trim() || fallbackTagline

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingBottom: 10 }}>
          <a href={`/${lang}`} style={{ textDecoration: 'none', color: '#1a1a1a', lineHeight: 1.2 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>
              {siteName === '844-ai.ro' ? (
                <>
                  <span style={{ color: '#C41E3A' }}>844-ai</span>
                  <span style={{ color: '#1a1a1a' }}>.ro</span>
                </>
              ) : (
                siteName
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>{tagline}</div>
          </a>
          {showLanguageSwitcher && (
            <nav style={{ display: 'flex', gap: 4 }}>
              {availableLanguages.map((language) => (
                <Link
                  key={language.code}
                  href={`/${language.code}`}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    color: lang === language.code ? '#185FA5' : '#999',
                    fontWeight: lang === language.code ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  {language.shortLabel}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingBottom: 4 }}>
          {PILONI.map((p) => (
            <a key={p.slug} href={`/${lang}/pilon/${p.slug}`} className="menu-pilon"
               style={{ textDecoration: 'none', color: '#185FA5', fontSize: 14, fontWeight: 500 }}>
              {lang === 'ro' ? p.ro : p.en}
            </a>
          ))}
        </nav>
      </header>
      <main style={{ paddingTop: 10 }}>{props.children}</main>
      <footer style={{ borderTop: '1px solid #e5e5e5', padding: '2rem 0 1.5rem', marginTop: 40, fontSize: 13, color: '#666' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              {siteName === '844-ai.ro' ? (
                <>
                  <span style={{ color: '#C41E3A' }}>844-ai</span>
                  <span>.ro</span>
                </>
              ) : (
                siteName
              )}
            </div>
            <div style={{ color: '#999', maxWidth: 260 }}>{tagline}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#333' }}>{lang === 'ro' ? 'Companie' : 'Company'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={`/${lang}/despre`} style={{ color: '#666', textDecoration: 'none' }}>{lang === 'ro' ? 'Despre noi' : 'About us'}</a>
              <a href={`/${lang}/contact`} style={{ color: '#666', textDecoration: 'none' }}>Contact</a>
              <a href={`/${lang}/advertise`} style={{ color: '#666', textDecoration: 'none' }}>Advertise</a>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#333' }}>Legal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {legalLinks.map((link) =>
                link.href.startsWith('/') ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{ color: '#666', textDecoration: 'none' }}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{ color: '#666', textDecoration: 'none' }}
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: 14, textAlign: 'center', color: '#999' }}>
          © 2026 844-ai.ro — {lang === 'ro' ? 'Toate drepturile rezervate' : 'All rights reserved'}
        </div>
      </footer>
    </div>
  )
}
