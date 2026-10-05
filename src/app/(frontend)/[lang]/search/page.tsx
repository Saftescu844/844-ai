import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
  SEARCH_RESULTS_LIMIT,
  searchArticles,
} from '@/lib/search'

type SearchPageProps = {
  params: Promise<{
    lang: string
  }>
  searchParams: Promise<{
    q?: string | string[]
  }>
}

function getQueryParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

function getSearchResultHref(
  url: string | null | undefined,
  lang: string,
) {
  if (typeof url !== 'string') {
    return null
  }

  const prefixes = [
    `/${lang}/articol/`,
    `/${lang}/flash/`,
  ]

  return prefixes.some(
    prefix =>
      url.startsWith(prefix) &&
      url.length > prefix.length,
  )
    ? url
    : null
}

function formatPublishedDate(
  value: string | null | undefined,
  lang: string,
) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(
    lang === 'ro' ? 'ro-RO' : 'en-GB',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(date)
}

function articleTypeLabel(
  type: string | null | undefined,
  lang: string,
) {
  if (type === 'analiza') {
    return lang === 'ro' ? 'Analiză' : 'Analysis'
  }

  if (type === 'frontiera') {
    return lang === 'ro' ? 'Frontieră' : 'Frontier'
  }

  if (type === 'ghid') {
    return lang === 'ro' ? 'Ghid' : 'Guide'
  }

  return lang === 'ro' ? 'Știre' : 'News'
}

function flashTypeLabel(
  type: string | null | undefined,
  lang: string,
) {
  const labels: Record<
    string,
    { ro: string; en: string }
  > = {
    announcement: {
      ro: 'Anunț',
      en: 'Announcement',
    },
    research: {
      ro: 'Cercetare',
      en: 'Research',
    },
    regulation: {
      ro: 'Reglementare',
      en: 'Regulation',
    },
    product: {
      ro: 'Produs / instrument',
      en: 'Product / tool',
    },
    business: {
      ro: 'Afaceri',
      en: 'Business',
    },
    incident: {
      ro: 'Incident',
      en: 'Incident',
    },
    update: {
      ro: 'Actualizare',
      en: 'Update',
    },
    other: {
      ro: 'Altele',
      en: 'Other',
    },
  }

  const label =
    labels[type ?? '']?.[
      lang === 'en' ? 'en' : 'ro'
    ] ??
    (lang === 'ro'
      ? 'Flash'
      : 'Flash')

  return `Flash AI · ${label}`
}

export async function generateMetadata(
  props: Pick<SearchPageProps, 'params'>,
): Promise<Metadata> {
  const { lang } = await props.params

  if (lang !== 'ro' && lang !== 'en') {
    return {}
  }

  const title = lang === 'ro' ? 'Căutare' : 'Search'
  const description =
    lang === 'ro'
      ? 'Caută în conținutul publicat pe 844-ai.ro.'
      : 'Search published content on 844-ai.ro.'

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/search`,
      languages: {
        ro: '/ro/search',
        en: '/en/search',
      },
    },
    robots: {
      index: false,
      follow: true,
    },
  }
}

export default async function SearchPage(
  props: SearchPageProps,
) {
  const { lang } = await props.params

  if (lang !== 'ro' && lang !== 'en') {
    notFound()
  }

  const params = await props.searchParams
  const rawQuery = getQueryParam(params.q)
  const result = await searchArticles(lang, rawQuery)

  const text =
    lang === 'ro'
      ? {
          title: 'Căutare',
          label: 'Caută în site',
          placeholder: 'Exemplu: inteligență artificială',
          button: 'Caută',
          empty:
            'Introdu un termen pentru a căuta în conținutul publicat.',
          tooShort: `Introdu cel puțin ${SEARCH_QUERY_MIN_LENGTH} caractere.`,
          tooLong: `Căutarea poate avea maximum ${SEARCH_QUERY_MAX_LENGTH} de caractere.`,
          noResults: 'Nu am găsit rezultate pentru această căutare.',
          oneResult: '1 rezultat',
          manyResults: (count: number) => `${count} rezultate`,
          resultsFor: (query: string) =>
            `Rezultate pentru „${query}”`,
          showingFirst: (count: number) =>
            `Afișăm primele ${count}.`,
        }
      : {
          title: 'Search',
          label: 'Search the site',
          placeholder: 'Example: artificial intelligence',
          button: 'Search',
          empty:
            'Enter a term to search published content.',
          tooShort: `Enter at least ${SEARCH_QUERY_MIN_LENGTH} characters.`,
          tooLong: `Search queries can contain at most ${SEARCH_QUERY_MAX_LENGTH} characters.`,
          noResults: 'No results were found for this search.',
          oneResult: '1 result',
          manyResults: (count: number) => `${count} results`,
          resultsFor: (query: string) =>
            `Results for “${query}”`,
          showingFirst: (count: number) =>
            `Showing the first ${count}.`,
        }

  const resultCountLabel =
    result.totalDocs === 1
      ? text.oneResult
      : text.manyResults(result.totalDocs)

  const resultCountSummary =
    result.totalDocs > SEARCH_RESULTS_LIMIT
      ? `${resultCountLabel}. ${text.showingFirst(result.docs.length)}`
      : resultCountLabel

  const statusMessage =
    result.state === 'empty'
      ? text.empty
      : result.state === 'too-short'
        ? text.tooShort
        : result.state === 'too-long'
          ? text.tooLong
          : result.state === 'ready' &&
              result.totalDocs === 0
            ? text.noResults
            : null

  return (
    <section
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '2rem 0',
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 0,
          marginBottom: 20,
        }}
      >
        {text.title}
      </h1>

      <form
        action={`/${lang}/search`}
        method="get"
        role="search"
        style={{ marginBottom: 28 }}
      >
        <label
          htmlFor="site-search-query"
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {text.label}
        </label>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'stretch',
          }}
        >
          <input
            id="site-search-query"
            name="q"
            type="search"
            defaultValue={result.query}
            placeholder={text.placeholder}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            style={{
              flex: 1,
              minWidth: 0,
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 15,
            }}
          />

          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 8,
              padding: '10px 16px',
              background: '#185FA5',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {text.button}
          </button>
        </div>
      </form>

      {statusMessage && (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            color: '#666',
            lineHeight: 1.5,
          }}
        >
          {statusMessage}
        </p>
      )}

      {result.state === 'ready' &&
        result.totalDocs > 0 && (
          <>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  color: '#444',
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {text.resultsFor(result.query)}
              </p>

              <p
                style={{
                  color: '#666',
                  fontSize: 13,
                  margin: '4px 0 0',
                }}
              >
                {resultCountSummary}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 18,
              }}
            >
              {result.docs.map((doc) => {
                const href = getSearchResultHref(doc.url, lang)
                const publishedDate = formatPublishedDate(
                  doc.publishedAt,
                  lang,
                )

                if (!href) {
                  return null
                }

                return (
                  <a
                    key={doc.id}
                    href={href}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      padding: 14,
                      display: 'block',
                    }}
                  >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: doc.kind === 'flash' ? '#7A4E00' : '#185FA5',
                    }}
                  >
                    {doc.kind === 'flash'
                      ? flashTypeLabel(
                          doc.flashType,
                          lang,
                        )
                      : articleTypeLabel(
                          doc.articleType,
                          lang,
                        )}
                  </span>

                  {publishedDate && (
                    <p
                      style={{
                        color: '#777',
                        fontSize: 11,
                        margin: '4px 0 0',
                      }}
                    >
                      {publishedDate}
                    </p>
                  )}

                  <h2
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      margin: '6px 0',
                    }}
                  >
                    {doc.title}
                  </h2>

                  {doc.excerpt && (
                    <p
                      style={{
                        fontSize: 13,
                        color: '#666',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {doc.excerpt.length > 140
                        ? `${doc.excerpt.slice(0, 140)}…`
                        : doc.excerpt}
                    </p>
                  )}
                  </a>
                )
              })}
            </div>
          </>
        )}
    </section>
  )
}
