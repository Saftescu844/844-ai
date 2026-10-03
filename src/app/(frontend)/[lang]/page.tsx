import type { Metadata } from 'next'
import Link from 'next/link'

import NewsletterForm from '@/components/NewsletterForm'
import {
  getArticole,
  getCachedSiteSettings,
  getFlashAi,
} from '@/lib/payload'
import type {
  Articole,
  FlashAi,
} from '@/payload-types'

type PublicLang = 'ro' | 'en'

type HomeUpdate =
  | {
      kind: 'article'
      item: Articole
    }
  | {
      kind: 'flash'
      item: FlashAi
    }

const PILLARS = [
  {
    slug: 'stiri',
    ro: {
      label: 'Știri AI',
      description: 'Ce s-a întâmplat și de ce contează.',
    },
    en: {
      label: 'AI News',
      description: 'What happened and why it matters.',
    },
  },
  {
    slug: 'sanatate',
    ro: {
      label: 'Sănătate',
      description: 'AI în medicină, cu prudență și context.',
    },
    en: {
      label: 'Health',
      description: 'AI in medicine, with care and context.',
    },
  },
  {
    slug: 'educatie',
    ro: {
      label: 'Educație',
      description: 'Învață AI, de la bază la aplicare.',
    },
    en: {
      label: 'Education',
      description: 'Learn AI, from foundations to practice.',
    },
  },
  {
    slug: 'tools',
    ro: {
      label: 'Tool Directory',
      description: 'Instrumente AI utile, organizate clar.',
    },
    en: {
      label: 'Tool Directory',
      description: 'Useful AI tools, clearly organized.',
    },
  },
  {
    slug: 'afaceri',
    ro: {
      label: 'Afaceri',
      description: 'Companii, strategie, piață și impact economic.',
    },
    en: {
      label: 'Business',
      description: 'Companies, strategy, markets and economic impact.',
    },
  },
] as const

const COPY = {
  ro: {
    eyebrow: 'AI pentru oameni',
    title: 'Înțelege AI. Folosește-l. Construiește viitorul.',
    subtitle:
      'Nu vrem doar să explicăm viitorul AI. Vrem să te ajutăm pe tine să participi la el.',
    primaryCta: 'Vezi ultimele noutăți',
    secondaryCta: 'Explorează Educație',
    pillarsTitle: 'Cinci direcții. O singură hartă a AI.',
    pillarsIntro:
      'De la știri la sănătate, educație, instrumente și afaceri — organizăm informația ca să ajungi repede la ce îți este util.',
    leadLabel: 'De citit acum',
    railTitle: 'Acum în AI',
    latestTitle: 'Ultimele noutăți',
    latestIntro:
      'Știri, analize și Flash AI, în ordine cronologică.',
    readArticle: 'Citește articolul',
    viewAll: 'Vezi toate noutățile',
    empty: 'Încă nu este conținut publicat.',
    flashFallback: 'Flash AI',
  },
  en: {
    eyebrow: 'AI for people',
    title: 'Understand AI. Use it. Build the future.',
    subtitle:
      'We do not just want to explain the future of AI. We want to help you take part in it.',
    primaryCta: 'See latest updates',
    secondaryCta: 'Explore Education',
    pillarsTitle: 'Five directions. One map of AI.',
    pillarsIntro:
      'From news to health, education, tools and business — we organize information so you can quickly find what is useful to you.',
    leadLabel: 'Read now',
    railTitle: 'Now in AI',
    latestTitle: 'Latest updates',
    latestIntro:
      'News, analysis and Flash AI, in chronological order.',
    readArticle: 'Read article',
    viewAll: 'View all updates',
    empty: 'No published content yet.',
    flashFallback: 'Flash AI',
  },
} as const

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await props.params

  if (lang !== 'ro' && lang !== 'en') return {}

  return {
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ro: '/ro',
        en: '/en',
      },
    },
  }
}

function articleLabel(tip: Articole['tip'], lang: PublicLang) {
  if (tip === 'analiza') return lang === 'ro' ? 'Analiză' : 'Analysis'
  if (tip === 'frontiera') return lang === 'ro' ? 'Frontieră' : 'Frontier'
  if (tip === 'ghid') return lang === 'ro' ? 'Ghid' : 'Guide'
  return lang === 'ro' ? 'Știre' : 'News'
}

function flashLabel(flashType: FlashAi['flashType'], lang: PublicLang) {
  const labels: Record<FlashAi['flashType'], { ro: string; en: string }> = {
    announcement: { ro: 'Anunț', en: 'Announcement' },
    research: { ro: 'Cercetare', en: 'Research' },
    regulation: { ro: 'Reglementare', en: 'Regulation' },
    product: { ro: 'Produs / instrument', en: 'Product / tool' },
    business: { ro: 'Afaceri', en: 'Business' },
    incident: { ro: 'Incident', en: 'Incident' },
    update: { ro: 'Actualizare', en: 'Update' },
    other: { ro: 'Altele', en: 'Other' },
  }

  return `Flash AI · ${labels[flashType][lang]}`
}

function timestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: string | null | undefined, lang: PublicLang) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(
    lang === 'ro' ? 'ro-RO' : 'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date)
}

function updateHref(update: HomeUpdate, lang: PublicLang) {
  return update.kind === 'flash'
    ? `/${lang}/flash/${update.item.slug}`
    : `/${lang}/articol/${update.item.slug}`
}

function updateLabel(update: HomeUpdate, lang: PublicLang) {
  return update.kind === 'flash'
    ? flashLabel(update.item.flashType, lang)
    : articleLabel(update.item.tip, lang)
}

function updateKey(update: HomeUpdate) {
  return `${update.kind}-${update.item.id}`
}

export default async function Homepage(props: {
  params: Promise<{ lang: string }>
}) {
  const { lang: rawLang } = await props.params
  const lang: PublicLang = rawLang === 'en' ? 'en' : 'ro'
  const txt = COPY[lang]

  const [
    { docs: articleDocs },
    { docs: flashDocs },
    siteSettings,
  ] = await Promise.all([
    getArticole(lang, { limit: 16 }),
    getFlashAi(lang, { limit: 10 }),
    getCachedSiteSettings(lang),
  ])

  const articles = articleDocs as Articole[]
  const flashes = flashDocs as FlashAi[]

  const leadArticle = articles[0] ?? null
  const leadFlash = flashes[0] ?? null

  const mixedUpdates: HomeUpdate[] = [
    ...articles
      .filter((article) => article.id !== leadArticle?.id)
      .map((item) => ({
        kind: 'article' as const,
        item,
      })),
    ...flashes
      .filter((flash) => flash.id !== leadFlash?.id)
      .map((item) => ({
        kind: 'flash' as const,
        item,
      })),
  ].sort(
    (a, b) =>
      timestamp(b.item.publishedAt) -
      timestamp(a.item.publishedAt),
  )

  const railUpdates = mixedUpdates.slice(0, 3)
  const latestUpdates = mixedUpdates.slice(3, 12)

  return (
    <div className="homepage">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="home-eyebrow">{txt.eyebrow}</p>
          <h1 id="home-title">{txt.title}</h1>
          <p className="home-hero__subtitle">{txt.subtitle}</p>
          <div className="home-hero__actions">
            <a className="home-button home-button--primary" href="#noutati">
              {txt.primaryCta}
            </a>
            <Link
              className="home-button home-button--secondary"
              href={`/${lang}/pilon/educatie`}
            >
              {txt.secondaryCta}
            </Link>
          </div>
        </div>
        <div className="home-hero__signal" aria-hidden="true">
          <span>844</span>
          <strong>AI</strong>
          <small>RO · EN</small>
        </div>
      </section>

      <section className="home-pillars" aria-labelledby="pillars-title">
        <div className="home-section-heading">
          <div>
            <p className="home-kicker">844-ai.ro</p>
            <h2 id="pillars-title">{txt.pillarsTitle}</h2>
          </div>
          <p>{txt.pillarsIntro}</p>
        </div>

        <div className="home-pillars__grid">
          {PILLARS.map((pillar, index) => {
            const content = pillar[lang]
            return (
              <Link
                key={pillar.slug}
                className="home-pillar"
                href={`/${lang}/pilon/${pillar.slug}`}
              >
                <span className="home-pillar__number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <strong>{content.label}</strong>
                <span>{content.description}</span>
                <span className="home-pillar__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {(leadArticle || leadFlash || railUpdates.length > 0) && (
        <section className="home-editorial" aria-label={txt.railTitle}>
          {leadArticle ? (
            <article className="home-lead">
              <p className="home-kicker">{txt.leadLabel}</p>
              <span className="home-content-label">
                {articleLabel(leadArticle.tip, lang)}
              </span>
              <h2>
                <Link href={`/${lang}/articol/${leadArticle.slug}`}>
                  {leadArticle.titlu}
                </Link>
              </h2>
              {leadArticle.excerpt && (
                <p className="home-lead__excerpt">{leadArticle.excerpt}</p>
              )}
              <div className="home-lead__meta">
                {formatDate(leadArticle.publishedAt, lang) && (
                  <time dateTime={leadArticle.publishedAt ?? undefined}>
                    {formatDate(leadArticle.publishedAt, lang)}
                  </time>
                )}
                <Link href={`/${lang}/articol/${leadArticle.slug}`}>
                  {txt.readArticle} →
                </Link>
              </div>
            </article>
          ) : (
            <div className="home-lead home-lead--empty">
              <p>{txt.empty}</p>
            </div>
          )}

          <aside className="home-rail">
            <div className="home-rail__title">
              <span>{txt.railTitle}</span>
              <span className="home-live-dot" aria-hidden="true" />
            </div>

            {leadFlash && (
              <Link
                className="home-flash-card"
                href={`/${lang}/flash/${leadFlash.slug}`}
              >
                <span className="home-content-label home-content-label--flash">
                  {flashLabel(leadFlash.flashType, lang)}
                </span>
                <strong>{leadFlash.titlu}</strong>
                {leadFlash.excerpt && <span>{leadFlash.excerpt}</span>}
              </Link>
            )}

            <div className="home-rail__updates">
              {railUpdates.map((update) => (
                <Link
                  key={updateKey(update)}
                  href={updateHref(update, lang)}
                  className="home-rail-update"
                >
                  <span>{updateLabel(update, lang)}</span>
                  <strong>{update.item.titlu}</strong>
                </Link>
              ))}
            </div>
          </aside>
        </section>
      )}

      <section id="noutati" className="home-latest" aria-labelledby="latest-title">
        <div className="home-section-heading home-section-heading--compact">
          <div>
            <p className="home-kicker">
              {lang === 'ro' ? 'Flux editorial' : 'Editorial feed'}
            </p>
            <h2 id="latest-title">{txt.latestTitle}</h2>
          </div>
          <p>{txt.latestIntro}</p>
        </div>

        {latestUpdates.length === 0 ? (
          <p className="home-empty">{txt.empty}</p>
        ) : (
          <div className="home-latest__grid">
            {latestUpdates.map((update) => {
              const date = formatDate(update.item.publishedAt, lang)
              return (
                <article key={updateKey(update)} className="home-update-card">
                  <div className="home-update-card__meta">
                    <span
                      className={
                        update.kind === 'flash'
                          ? 'home-content-label home-content-label--flash'
                          : 'home-content-label'
                      }
                    >
                      {updateLabel(update, lang)}
                    </span>
                    {date && (
                      <time dateTime={update.item.publishedAt ?? undefined}>
                        {date}
                      </time>
                    )}
                  </div>
                  <h3>
                    <Link href={updateHref(update, lang)}>
                      {update.item.titlu}
                    </Link>
                  </h3>
                  {update.item.excerpt && (
                    <p>
                      {update.item.excerpt.length > 180
                        ? `${update.item.excerpt.slice(0, 180)}…`
                        : update.item.excerpt}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {siteSettings?.newsletter?.enabled !== false && (
        <section className="home-newsletter" aria-label="Newsletter">
          <div className="home-newsletter__intro">
            <p className="home-kicker">844-ai.ro</p>
            <h2>
              {lang === 'ro'
                ? 'AI important, fără zgomot inutil.'
                : 'Important AI, without unnecessary noise.'}
            </h2>
          </div>
          <div className="home-newsletter__form">
            <NewsletterForm
              lang={lang}
              settings={siteSettings?.newsletter}
            />
          </div>
        </section>
      )}
    </div>
  )
}
