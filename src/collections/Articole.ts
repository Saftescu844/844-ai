import type { CollectionConfig } from 'payload'

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
    },
    {
      name: 'imaginePrincipala',
      type: 'upload',
      relationTo: 'media',
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
    beforeChange: [
      ({ data }) => {
        // setează publishedAt automat la prima publicare
        if (data.status === 'publicat' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
