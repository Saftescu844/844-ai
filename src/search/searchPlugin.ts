import { searchPlugin } from '@payloadcms/plugin-search'

import { normalizeSearchText } from '@/search/normalizeSearchText'

const ARTICLE_EDITORIAL_STATUSES = new Set([
  'draft',
  'review',
  'approved',
  'blocked',
])

const ARTICLE_TYPES = new Set([
  'stire-auto',
  'analiza',
  'frontiera',
  'ghid',
])

export const searchInfrastructurePlugin = searchPlugin({
  collections: ['articole'],

  // Articolele RO și EN sunt documente distincte.
  // Limba rezultatului este stocată explicit în câmpul `language`.
  localize: false,

  // Păstrăm explicit comportamentul dorit pentru drafts.
  syncDrafts: false,
  deleteDrafts: true,

  beforeSync: ({ originalDoc, searchDoc }) => {
    const title =
      typeof originalDoc.titlu === 'string'
        ? originalDoc.titlu.trim()
        : ''

    const slug =
      typeof originalDoc.slug === 'string'
        ? originalDoc.slug.trim()
        : ''

    const language =
      originalDoc.limba === 'ro' || originalDoc.limba === 'en'
        ? originalDoc.limba
        : undefined

    const editorialStatus =
      typeof originalDoc.editorialStatus === 'string' &&
      ARTICLE_EDITORIAL_STATUSES.has(originalDoc.editorialStatus)
        ? originalDoc.editorialStatus
        : undefined

    const articleType =
      typeof originalDoc.tip === 'string' &&
      ARTICLE_TYPES.has(originalDoc.tip)
        ? originalDoc.tip
        : undefined

    const excerpt =
      typeof originalDoc.excerpt === 'string'
        ? originalDoc.excerpt.trim()
        : ''

    const tagKeywords = Array.isArray(originalDoc.tags)
      ? [
          ...new Set(
            originalDoc.tags
              .map((item: unknown) => {
                if (
                  typeof item === 'object' &&
                  item !== null &&
                  'tag' in item &&
                  typeof item.tag === 'string'
                ) {
                  return item.tag.trim()
                }

                return ''
              })
              .filter(Boolean),
          ),
        ].join(' ')
      : ''

    const keywords = normalizeSearchText(
      [title, excerpt, tagKeywords].filter(Boolean).join(' '),
    )

    const isPublic =
      originalDoc._status === 'published' &&
      Boolean(language && title && slug)

    return {
      ...searchDoc,
      title,
      excerpt,
      keywords,
      url: language && slug ? `/${language}/articol/${slug}` : '',
      language,
      editorialStatus,
      articleType,
      publishedAt:
        typeof originalDoc.publishedAt === 'string'
          ? originalDoc.publishedAt
          : null,
      isPublic,
    }
  },

  searchOverrides: {
    labels: {
      singular: 'Rezultat căutare',
      plural: 'Rezultate căutare',
    },

    access: {
      read: ({ req: { user } }) => {
        if (user?.rol === 'admin') return true

        return {
          isPublic: {
            equals: true,
          },
        }
      },

      update: ({ req: { user } }) => user?.rol === 'admin',
      delete: ({ req: { user } }) => user?.rol === 'admin',

      // Nu suprascriem `create`.
      // Pluginul îl setează implicit la false, iar endpoint-ul
      // de reindex tratează explicit această situație.
    },

    fields: ({ defaultFields }) => [
      ...defaultFields,
      {
        name: 'excerpt',
        type: 'textarea',
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'keywords',
        type: 'textarea',
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'url',
        type: 'text',
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'language',
        type: 'select',
        index: true,
        options: [
          { label: 'Română', value: 'ro' },
          { label: 'English', value: 'en' },
        ],
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'editorialStatus',
        type: 'select',
        index: true,
        options: [
          { label: 'Draft editorial', value: 'draft' },
          { label: 'În revizuire', value: 'review' },
          { label: 'Aprobat', value: 'approved' },
          { label: 'Blocat', value: 'blocked' },
        ],
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'articleType',
        type: 'select',
        index: true,
        options: [
          { label: 'Știre auto-generată', value: 'stire-auto' },
          { label: 'Analiză', value: 'analiza' },
          { label: 'Frontieră', value: 'frontiera' },
          { label: 'Ghid', value: 'ghid' },
        ],
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'publishedAt',
        type: 'date',
        index: true,
        admin: {
          readOnly: true,
        },
      },
      {
        name: 'isPublic',
        type: 'checkbox',
        defaultValue: false,
        index: true,
        admin: {
          readOnly: true,
        },
      },
    ],
  },
})
