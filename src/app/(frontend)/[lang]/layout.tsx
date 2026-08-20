import React, { cache } from 'react'
import Link from 'next/link'
import '../styles.css'
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
  const defaultShareImage = siteSettings?.metadata.defaultShareImage
  const shareImageMetadata =
    defaultShareImage &&
    typeof defaultShareImage === 'object' &&
    defaultShareImage.url
      ? {
          url: defaultShareImage.url,
          width: defaultShareImage.width ?? undefined,
          height: defaultShareImage.height ?? undefined,
          alt: defaultShareImage.alt ?? undefined,
          type: defaultShareImage.mimeType ?? undefined,
        }
      : undefined

  return {
    title: {
      default: title,
      template: '%s | 844-ai.ro',
    },
    description,
    metadataBase: new URL('https://844-ai.ro'),
    openGraph: {
      title,
      description,
      siteName,
      type: 'website',
      images: shareImageMetadata ? [shareImageMetadata] : undefined,
    },
    twitter: {
      card: twitterCardType,
      title,
      description,
      images: shareImageMetadata ? [shareImageMetadata] : undefined,
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

  const fallbackPrimaryNavigation = PILONI.map((p) => ({
    key: `fallback-${p.slug}`,
    label: lang === 'ro' ? p.ro : p.en,
    href: `/${lang}/pilon/${p.slug}`,
    openInNewTab: false,
    showInDesktop: true,
    showInMobile: true,
  }))

  const configuredPrimaryNavigation =
    siteSettings?.navigation?.primaryNavigation ?? []

  const hasConfiguredPrimaryNavigation =
    configuredPrimaryNavigation.length > 0

  const enabledPrimaryNavigation = configuredPrimaryNavigation.filter(
    (item) =>
      item.enabled !== false &&
      (item.showInDesktop !== false || item.showInMobile !== false),
  )

  const hasInvalidLocalizedPrimaryNavigation = enabledPrimaryNavigation.some(
    (item) => !item.label?.trim() || !item.href?.trim(),
  )

  const primaryNavigation =
    hasConfiguredPrimaryNavigation && !hasInvalidLocalizedPrimaryNavigation
      ? enabledPrimaryNavigation.map((item) => ({
          key: item.id ?? `${item.href}-${item.label}`,
          label: item.label.trim(),
          href: item.href.trim(),
          openInNewTab: item.openInNewTab === true,
          showInDesktop: item.showInDesktop !== false,
          showInMobile: item.showInMobile !== false,
        }))
      : fallbackPrimaryNavigation

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

  const searchAction =
    siteSettings?.navigation?.headerActions?.find(
      (action) =>
        action.enabled !== false &&
        action.actionType === 'search' &&
        Boolean(action.label?.trim()),
    ) ?? null

  const fallbackSiteName = '844-ai.ro'
  const fallbackTagline =
    lang === 'en'
      ? 'Everything that matters in AI, in one place.'
      : 'Tot ce contează în AI, într-un singur loc.'

  const siteName = siteSettings?.identity.siteName?.trim() || fallbackSiteName
  const tagline = siteSettings?.identity.tagline?.trim() || fallbackTagline

  const footerEnabled = siteSettings?.footer?.footerEnabled !== false
  const footerIntro = siteSettings?.footer?.footerIntro?.trim() || tagline

  const fallbackFooterSections = [
    {
      key: 'fallback-company',
      title: lang === 'ro' ? 'Companie' : 'Company',
      links: [
        {
          key: 'fallback-about',
          label: lang === 'ro' ? 'Despre noi' : 'About us',
          href: `/${lang}/despre`,
          linkType: 'internal' as const,
          openInNewTab: false,
        },
        {
          key: 'fallback-contact',
          label: 'Contact',
          href: `/${lang}/contact`,
          linkType: 'internal' as const,
          openInNewTab: false,
        },
        {
          key: 'fallback-advertise',
          label: 'Advertise',
          href: `/${lang}/advertise`,
          linkType: 'internal' as const,
          openInNewTab: false,
        },
      ],
    },
  ]

  const configuredFooterSections = [...(siteSettings?.footer?.footerSections ?? [])]
    .filter(
      (section) =>
        section.enabled !== false &&
        Boolean(section.title?.trim()),
    )
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      key: section.id ?? `${section.order}-${section.title}`,
      title: section.title.trim(),
      links: [...(section.links ?? [])]
        .filter(
          (link) =>
            link.enabled !== false &&
            Boolean(link.label?.trim()) &&
            Boolean(link.href?.trim()),
        )
        .sort((a, b) => a.order - b.order)
        .map((link) => ({
          key: link.id ?? `${link.order}-${link.href}-${link.label}`,
          label: link.label.trim(),
          href: link.href.trim(),
          linkType: link.linkType,
          openInNewTab: link.openInNewTab === true,
        })),
    }))
    .filter((section) => section.links.length > 0)

  const footerSections =
    configuredFooterSections.length > 0
      ? configuredFooterSections
      : fallbackFooterSections

  const footerCopyright =
    siteSettings?.footer?.copyrightText?.trim() ||
    `© 2026 844-ai.ro — ${
      lang === 'ro' ? 'Toate drepturile rezervate' : 'All rights reserved'
    }`

  return (
    <html lang={lang}>
      <body>
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
          {(searchAction || showLanguageSwitcher) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {searchAction && (
                <Link
                  href={`/${lang}/search`}
                  style={{
                    padding:
                      searchAction.style === 'link'
                        ? '3px 0'
                        : '5px 10px',
                    border:
                      searchAction.style === 'secondary'
                        ? '1px solid #185FA5'
                        : '1px solid transparent',
                    borderRadius: 6,
                    background:
                      searchAction.style === 'primary'
                        ? '#185FA5'
                        : 'transparent',
                    color:
                      searchAction.style === 'primary'
                        ? '#fff'
                        : '#185FA5',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight:
                      searchAction.style === 'primary'
                        ? 600
                        : 500,
                  }}
                >
                  {searchAction.label.trim()}
                </Link>
              )}

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
          )}
        </div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingBottom: 4 }}>
          {primaryNavigation.map((item) => {
            const visibilityClass =
              item.showInDesktop && item.showInMobile
                ? 'menu-pilon'
                : item.showInDesktop
                  ? 'menu-pilon menu-pilon--desktop-only'
                  : 'menu-pilon menu-pilon--mobile-only'

            return (
              <a
                key={item.key}
                href={item.href}
                className={visibilityClass}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                style={{
                  textDecoration: 'none',
                  color: '#185FA5',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {item.label}
              </a>
            )
          })}
        </nav>
      </header>
      <main style={{ paddingTop: 10 }}>{props.children}</main>
      {footerEnabled && (
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
              <div style={{ color: '#999', maxWidth: 260 }}>{footerIntro}</div>
            </div>

            {footerSections.map((section) => (
              <div key={section.key}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#333' }}>
                  {section.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {section.links.map((link) =>
                    link.linkType === 'internal' ? (
                      <Link
                        key={link.key}
                        href={link.href}
                        target={link.openInNewTab ? '_blank' : undefined}
                        rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                        style={{ color: '#666', textDecoration: 'none' }}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.key}
                        href={link.href}
                        target={link.openInNewTab ? '_blank' : undefined}
                        rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                        style={{ color: '#666', textDecoration: 'none' }}
                      >
                        {link.label}
                      </a>
                    ),
                  )}
                </div>
              </div>
            ))}

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
            {footerCopyright}
          </div>
        </footer>
      )}
        </div>
      </body>
    </html>
  )
}
