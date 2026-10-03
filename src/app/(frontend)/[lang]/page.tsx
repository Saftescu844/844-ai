import type { Metadata } from 'next'
import { getArticole, getFlashAi } from '@/lib/payload'

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

function etichetaArticol(tip: string, lang: string) {
  if (tip === 'analiza') return lang === 'ro' ? 'Analiză' : 'Analysis'
  if (tip === 'frontiera') return lang === 'ro' ? 'Frontieră' : 'Frontier'
  return lang === 'ro' ? 'Știre' : 'News'
}

function etichetaFlash(flashType: string, lang: string) {
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

  const label =
    labels[flashType]?.[lang === 'en' ? 'en' : 'ro'] ??
    (lang === 'ro' ? 'Flash' : 'Flash')

  return `Flash AI · ${label}`
}

function timestamp(value: unknown): number {
  if (typeof value !== 'string') return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function cardExcerpt(value: unknown, max = 150) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

const PILONI = [
  {
    slug: 'stiri',
    ro: { title: 'Știri AI', text: 'Ce se schimbă acum și de ce contează.' },
    en: { title: 'AI News', text: 'What is changing now and why it matters.' },
  },
  {
    slug: 'educatie',
    ro: { title: 'Educație', text: 'Învață AI practic, clar și responsabil.' },
    en: { title: 'Education', text: 'Learn AI in a practical, clear and responsible way.' },
  },
  {
    slug: 'tools',
    ro: { title: 'Tool Directory', text: 'Instrumente AI utile, explicate pe înțelesul tuturor.' },
    en: { title: 'Tool Directory', text: 'Useful AI tools, explained for everyone.' },
  },
  {
    slug: 'sanatate',
    ro: { title: 'Sănătate', text: 'AI în diagnostic, îngrijire și sănătate digitală.' },
    en: { title: 'Health', text: 'AI in diagnostics, care and digital health.' },
  },
  {
    slug: 'afaceri',
    ro: { title: 'Afaceri', text: 'Cum schimbă AI munca, companiile și economia.' },
    en: { title: 'Business', text: 'How AI changes work, companies and the economy.' },
  },
]

export default async function Homepage(props: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await props.params
  const ro = lang === 'ro'

  const [{ docs: articole }, { docs: flashuri }] = await Promise.all([
    getArticole(lang, { limit: 15 }),
    getFlashAi(lang, { limit: 15 }),
  ])

  const noutati = [
    ...articole.map((item: any) => ({
      kind: 'article' as const,
      item,
    })),
    ...flashuri.map((item: any) => ({
      kind: 'flash' as const,
      item,
    })),
  ]
    .sort(
      (a, b) =>
        timestamp(b.item.publishedAt) -
        timestamp(a.item.publishedAt),
    )
    .slice(0, 15)

  const principal = noutati[0]
  const restul = noutati.slice(1)

  const txt = ro
    ? {
        heroTitle: 'Înțelege AI. Folosește-l. Construiește viitorul.',
        heroText:
          'Nu vrem doar să explicăm viitorul AI. Vrem să te ajutăm pe tine să participi la el.',
        latest: 'Ultimele noutăți',
        latestIntro:
          'Știri, analize și Flash AI — selectate și explicate cu context.',
        pillars: 'Explorează 844-ai.ro',
        pillarsIntro:
          'Cinci direcții clare pentru a înțelege unde și cum schimbă AI lumea din jurul nostru.',
        empty: 'Încă nu este conținut publicat.',
        browse: 'Vezi noutățile',
        education: 'Începe cu Educație',
        readMore: 'Citește',
      }
    : {
        heroTitle: 'Understand AI. Use it. Build the future.',
        heroText:
          'We do not just want to explain the future of AI. We want to help you take part in it.',
        latest: 'Latest updates',
        latestIntro:
          'News, analysis and AI Flash — selected and explained with context.',
        pillars: 'Explore 844-ai.ro',
        pillarsIntro:
          'Five clear paths to understand where and how AI is changing the world around us.',
        empty: 'No published content yet.',
        browse: 'See latest updates',
        education: 'Start with Education',
        readMore: 'Read',
      }

  const renderLabel = (kind: 'article' | 'flash', item: any) =>
    kind === 'flash'
      ? etichetaFlash(item.flashType, lang)
      : etichetaArticol(item.tip, lang)

  const renderHref = (kind: 'article' | 'flash', item: any) =>
    kind === 'flash'
      ? `/${lang}/flash/${item.slug}`
      : `/${lang}/articol/${item.slug}`

  return (
    <div className="homepage">
      <section className="homepage-hero" aria-labelledby="homepage-hero-title">
        <div className="homepage-hero__eyebrow">844-ai.ro</div>
        <h1 id="homepage-hero-title" className="homepage-hero__title">
          {txt.heroTitle}
        </h1>
        <p className="homepage-hero__text">{txt.heroText}</p>
        <div className="homepage-hero__actions">
          <a href="#noutati" className="homepage-button homepage-button--primary">
            {txt.browse}
          </a>
          <a
            href={`/${lang}/pilon/educatie`}
            className="homepage-button homepage-button--secondary"
          >
            {txt.education}
          </a>
        </div>
      </section>

      <section className="homepage-section" aria-labelledby="homepage-pillars-title">
        <div className="homepage-section__heading">
          <div>
            <h2 id="homepage-pillars-title">{txt.pillars}</h2>
            <p>{txt.pillarsIntro}</p>
          </div>
        </div>

        <div className="homepage-pillars">
          {PILONI.map((pilon) => {
            const copy = ro ? pilon.ro : pilon.en
            return (
              <a
                key={pilon.slug}
                href={`/${lang}/pilon/${pilon.slug}`}
                className="homepage-pillar"
              >
                <span className="homepage-pillar__title">{copy.title}</span>
                <span className="homepage-pillar__text">{copy.text}</span>
              </a>
            )
          })}
        </div>
      </section>

      <section
        id="noutati"
        className="homepage-section homepage-section--updates"
        aria-labelledby="homepage-updates-title"
      >
        <div className="homepage-section__heading">
          <div>
            <h2 id="homepage-updates-title">{txt.latest}</h2>
            <p>{txt.latestIntro}</p>
          </div>
        </div>

        {noutati.length === 0 ? (
          <p className="homepage-empty">{txt.empty}</p>
        ) : (
          <div className="homepage-editorial">
            {principal && (
              <a
                href={renderHref(principal.kind, principal.item)}
                className={`homepage-lead ${
                  principal.kind === 'flash' ? 'homepage-card--flash' : ''
                }`}
              >
                <span className="homepage-card__label">
                  {renderLabel(principal.kind, principal.item)}
                </span>
                <h3>{principal.item.titlu}</h3>
                {principal.item.excerpt && (
                  <p>{cardExcerpt(principal.item.excerpt, 230)}</p>
                )}
                <span className="homepage-card__cta">{txt.readMore} →</span>
              </a>
            )}

            <div className="homepage-grid">
              {restul.map(({ kind, item }: any) => (
                <a
                  key={`${kind}-${item.id}`}
                  href={renderHref(kind, item)}
                  className={`homepage-card ${
                    kind === 'flash' ? 'homepage-card--flash' : ''
                  }`}
                >
                  <span className="homepage-card__label">
                    {renderLabel(kind, item)}
                  </span>
                  <h3>{item.titlu}</h3>
                  {item.excerpt && <p>{cardExcerpt(item.excerpt)}</p>}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
