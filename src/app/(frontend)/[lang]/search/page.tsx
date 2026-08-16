import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
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
  const prefix = `/${lang}/articol/`

  if (
    typeof url !== 'string' ||
    !url.startsWith(prefix) ||
    url.length <= prefix.length
  ) {
    return null
  }

  return url
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
      ? 'Caută articole publicate pe 844-ai.ro.'
      : 'Search published articles on 844-ai.ro.'

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
          label: 'Caută în articole',
          placeholder: 'Exemplu: inteligență artificială',
          button: 'Caută',
          empty:
            'Introdu un termen pentru a căuta în articolele publicate.',
          tooShort: `Introdu cel puțin ${SEARCH_QUERY_MIN_LENGTH} caractere.`,
          tooLong: `Căutarea poate avea maximum ${SEARCH_QUERY_MAX_LENGTH} de caractere.`,
          noResults: 'Nu am găsit rezultate pentru această căutare.',
          oneResult: '1 rezultat',
          manyResults: (count: number) => `${count} rezultate`,
        }
      : {
          title: 'Search',
          label: 'Search articles',
          placeholder: 'Example: artificial intelligence',
          button: 'Search',
          empty:
            'Enter a term to search published articles.',
          tooShort: `Enter at least ${SEARCH_QUERY_MIN_LENGTH} characters.`,
          tooLong: `Search queries can contain at most ${SEARCH_QUERY_MAX_LENGTH} characters.`,
          noResults: 'No results were found for this search.',
          oneResult: '1 result',
          manyResults: (count: number) => `${count} results`,
        }

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
            <p
              style={{
                color: '#666',
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {result.totalDocs === 1
                ? text.oneResult
                : text.manyResults(result.totalDocs)}
            </p>

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
                      color: '#185FA5',
                    }}
                  >
                    {articleTypeLabel(
                      doc.articleType,
                      lang,
                    )}
                  </span>

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
