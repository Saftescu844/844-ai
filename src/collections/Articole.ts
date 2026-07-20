import type { CollectionConfig } from 'payload'
import { lexicalEditor, UploadFeature, BlocksFeature } from '@payloadcms/richtext-lexical'
import { VideoBlock, CalloutBlock, TableBlock } from '@/lib/richtext-blocks'

// ============================================================
//  ARTICOLE — colecția centrală, susține toți cei 5 piloni
//  Bilingv prin DOCUMENTE SEPARATE per limbă (nu localized fields).
//  Fiecare articol RO are un câmp opțional spre echivalentul EN și invers.
// ============================================================

export const Articole: CollectionConfig = {
  slug: 'articole',
  labels: { singular: 'Articol', plural: 'Articole' },
  admin: {
    useAsTitle: 'titlu',
    defaultColumns: ['titlu', 'pilon', 'tip', 'limba', 'status', 'publishedAt'],
    group: 'Conținut',
  },
  access: {
    // public poate citi doar articolele publicate
    read: ({ req: { user } }) => {
      if (user) return true
      return { status: { equals: 'publicat' } }
    },
  },
  versions: { drafts: true }, // draft & publish nativ
  fields: [
    {
      name: 'titlu',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL-friendly. Se folosește în /ro/articol/{slug} sau /en/article/{slug}',
      },
    },
    {
      name: 'limba',
      type: 'select',
      required: true,
      defaultValue: 'ro',
      options: [
        { label: 'Română', value: 'ro' },
        { label: 'English', value: 'en' },
      ],
      index: true,
    },
    {
      // legătura spre versiunea în cealaltă limbă (document separat)
      name: 'versiuneAlternativa',
      type: 'relationship',
      relationTo: 'articole',
      hasMany: false,
      admin: {
        description:
          'Articolul echivalent în cealaltă limbă (pentru butonul RO/EN și hreflang SEO).',
      },
    },
    {
      name: 'continutHashTradus',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'necesitaRetraducere',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          '⚠️ Conținutul a fost modificat după ultima traducere. Retradu manual dacă e nevoie.',
        condition: (data) => !!data?.necesitaRetraducere,
      },
    },
    {
      name: 'pilon',
      type: 'relationship',
      relationTo: 'categorii',
      required: true,
      index: true,
      admin: { description: 'Pilonul de care aparține (cei 5 piloni de conținut).' },
    },
    {
      name: 'subcategorie',
      type: 'select',
      options: [
        { label: 'Diagnostic și imagistică', value: 'diagnostic' },
        { label: 'Descoperirea de medicamente', value: 'medicamente' },
        { label: 'Asistență clinică', value: 'asistenta-clinica' },
        { label: 'Reglementare și etică', value: 'reglementare' },
        { label: 'AI pentru pacienți', value: 'pacienti' },
      ],
      index: true,
      admin: { description: 'Subcategorie — relevant mai ales pentru pilonul Sănătate.' },
    },
    {
      name: 'subcategorieEducatie',
      type: 'select',
      options: [
        { label: 'Învățare AI', value: 'invatare-ai' },
        { label: 'AI în școli și universități', value: 'institutii' },
        { label: 'Instrumente educaționale AI', value: 'instrumente-edu' },
        { label: 'Cercetare și inovație', value: 'cercetare' },
        { label: 'Cariere în AI', value: 'cariere' },
      ],
      index: true,
      admin: { description: 'Subcategorie — relevant mai ales pentru pilonul Educație.' },
    },
    {
      name: 'tip',
      type: 'select',
      required: true,
      defaultValue: 'stire-auto',
      options: [
        { label: 'Știre auto-generată', value: 'stire-auto' },
        { label: 'Analiză de autoritate', value: 'analiza' },
        { label: 'Frontieră / idei îndrăznețe', value: 'frontiera' },
        { label: 'Ghid / tutorial', value: 'ghid' },
      ],
      index: true,
      admin: { description: 'Eticheta de tip — vizibilă cititorului (regula 5 din compliance).' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'Rezumat scurt pentru liste și meta description.' },
    },
    {
      name: 'continut',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          UploadFeature({
            collections: {
              media: {
                fields: [
                  { name: 'caption', type: 'text', label: 'Descriere (caption)' },
                  {
                    name: 'align',
                    type: 'select',
                    defaultValue: 'center',
                    options: [
                      { label: 'Stânga', value: 'left' },
                      { label: 'Centru', value: 'center' },
                      { label: 'Dreapta', value: 'right' },
                    ],
                  },
                ],
              },
            },
          }),
          BlocksFeature({
            blocks: [VideoBlock, CalloutBlock, TableBlock],
          }),
        ],
      }),
    },
    {
      name: 'imaginePrincipala',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'galerie',
      type: 'array',
      labels: { singular: 'Imagine', plural: 'Galerie imagini' },
      admin: {
        description: 'Imagini pentru corpul articolului. Fiecare cu descriere și credit/sursă.',
      },
      fields: [
        { name: 'imagine', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', admin: { description: 'Descriere afișată sub imagine.' } },
        {
          name: 'credit',
          type: 'text',
          admin: { description: 'Credit/sursă imagine (pentru drepturi de autor).' },
        },
      ],
    },
    {
      name: 'videoTitlu',
      type: 'text',
      admin: { description: 'Titlu opțional pentru video.' },
    },
    {
      name: 'videoUrl',
      type: 'text',
      admin: { description: 'Link YouTube sau Vimeo (ex: https://www.youtube.com/watch?v=...).' },
    },
    {
      name: 'surse',
      type: 'relationship',
      relationTo: 'surse',
      hasMany: true,
      admin: { description: 'Sursele citate. Minimum 2 pentru conformitate.' },
    },
    {
      name: 'sursaNume',
      type: 'text',
      admin: { description: 'Numele sursei originale (ex: Tech.eu, TechCrunch).' },
    },
    {
      name: 'sursaLink',
      type: 'text',
      admin: { description: 'Link-ul concret al articolului-sursă original.' },
    },
    {
      name: 'producator',
      type: 'text',
      admin: { description: 'Compania/laboratorul care dezvoltă tehnologia (ex: Aidoc).' },
    },
    {
      name: 'linkProducator',
      type: 'text',
      admin: { description: 'Link oficial al producătorului (ex: https://www.aidoc.com).' },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text' }],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'În revizuire', value: 'review' },
        { label: 'Publicat', value: 'published' },
        { label: 'Blocat (compliance)', value: 'blocked' },
      ],
      index: true,
    },
    {
      name: 'esteBreaking',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Știre excepțională / breaking news.' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    // === Metadate tehnice de la Auto-Publisher ===
    {
      type: 'collapsible',
      label: 'Metadate Auto-Publisher',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'clusterHash',
          type: 'text',
          index: true,
          admin: { description: 'Hash de deduplicare tematică.' },
        },
        {
          name: 'unghi',
          type: 'text',
          admin: { description: 'Unghiul editorial (general, cronologie, analiza...).' },
        },
        { name: 'generatAutomat', type: 'checkbox', defaultValue: false },
        { name: 'corectatCompliance', type: 'checkbox', defaultValue: false },
        {
          name: 'numarConfirmari',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Surse independente care confirmă.' },
        },
      ],
    },
    // === SEO ===
    {
      type: 'collapsible',
      label: 'SEO',
      admin: { initCollapsed: true },
      fields: [
        { name: 'metaTitle', type: 'text', maxLength: 60 },
        { name: 'metaDescription', type: 'textarea', maxLength: 160 },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        // slugificare automată: rulează DOAR dacă slug-ul lipsește sau e invalid.
        // Slug-urile valide existente (articole live) NU sunt atinse niciodată.
        if (!data) return data
        const formatValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
        const slugActual = data.slug ?? originalDoc?.slug
        if (slugActual && formatValid.test(slugActual)) return data

        const sursa = data.titlu || originalDoc?.titlu || ''
        if (!sursa) return data

        const slugificat = sursa
          .toLowerCase()
          .replace(/[ăâ]/g, 'a')
          .replace(/î/g, 'i')
          .replace(/[șş]/g, 's')
          .replace(/[țţ]/g, 't')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // orice alte diacritice (é, ü etc.)
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 70)
          .replace(/-+$/g, '')

        const sufix = Math.random().toString(36).slice(2, 10)
        data.slug = slugificat ? `${slugificat}-${sufix}` : sufix
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        // setează publishedAt automat la prima publicare
        if (data.status === 'publicat' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
      ({ data, originalDoc }) => {
        // detectează dacă textul RO s-a schimbat față de ultima traducere
        if (!data.continut) return data
        const textPlat = (node: any): string => {
          if (!node) return ''
          if (node.type === 'upload') return ''
          const text = (node.children || []).map((c: any) => c.text || textPlat(c)).join('')
          return text
        }
        const toateBlocurile = (data.continut?.root?.children || []).map(textPlat).join('|')
        let suma = 0
        for (let i = 0; i < toateBlocurile.length; i++)
          suma = (suma + toateBlocurile.charCodeAt(i) * (i + 1)) % 1000000007
        const hashNou = toateBlocurile.length + '-' + suma

        const hashDeComparat =
          typeof data.continutHashTradus !== 'undefined'
            ? data.continutHashTradus
            : originalDoc?.continutHashTradus
        if (hashDeComparat) {
          data.necesitaRetraducere = hashDeComparat !== hashNou
        }
        return data
      },
    ],
  },
}
