import type { CollectionConfig } from 'payload'

// ============================================================
//  SURSE — registrul editorial central pentru Flash Engine.
//  Câmpurile legacy sunt păstrate temporar pentru compatibilitate,
//  dar noul engine folosește exclusiv modelul sourceRole /
//  editorialTrust / citationMode / allowIngestion / allowAutoPublish.
// ============================================================

export const Surse: CollectionConfig = {
  slug: 'surse',
  labels: { singular: 'Sursă', plural: 'Surse' },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: [
      'nume',
      'sourceRole',
      'editorialTrust',
      'allowIngestion',
      'allowAutoPublish',
      'activa',
    ],
    group: 'Conținut',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => user?.rol === 'admin',
    update: ({ req: { user } }) => user?.rol === 'admin',
    delete: ({ req: { user } }) => user?.rol === 'admin',
  },
  fields: [
    { name: 'nume', type: 'text', required: true },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: { description: 'URL-ul de bază al sursei.' },
    },
    {
      name: 'sourceRole',
      label: 'Rolul sursei',
      type: 'select',
      required: true,
      defaultValue: 'secondary',
      options: [
        { label: 'Primară', value: 'primary' },
        { label: 'Secundară', value: 'secondary' },
      ],
      index: true,
      admin: {
        description:
          'Primary = instituția, organizația sau autorul care produce informația originală.',
      },
    },
    {
      name: 'editorialTrust',
      label: 'Încredere editorială',
      type: 'select',
      required: true,
      defaultValue: 'restricted',
      options: [
        { label: 'Ridicată', value: 'high' },
        { label: 'Standard', value: 'standard' },
        { label: 'Restricționată', value: 'restricted' },
      ],
      index: true,
      admin: {
        description:
          'Nivel intern de încredere. O sursă nouă pornește conservator ca restricted.',
      },
    },
    {
      name: 'citationMode',
      label: 'Mod de citare',
      type: 'select',
      required: true,
      defaultValue: 'paraphrase',
      options: [
        { label: 'Parafrazare + link', value: 'paraphrase' },
        { label: 'Citat scurt + link', value: 'shortQuote' },
      ],
    },
    {
      name: 'allowIngestion',
      label: 'Permite ingestia Flash',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Permite Flash Engine să preia materiale din această sursă. Implicit dezactivat.',
      },
    },
    {
      name: 'allowAutoPublish',
      label: 'Permite evaluarea pentru AUTO',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Nu garantează publicarea automată. Permite doar intrarea în evaluarea AUTO, dacă toate celelalte reguli sunt îndeplinite.',
      },
    },

    // Câmpuri legacy — păstrate temporar pentru compatibilitate.
    {
      name: 'nivelIncredere',
      type: 'select',
      required: true,
      defaultValue: 'secundar',
      options: [
        { label: 'Primar (sursă originală)', value: 'primar' },
        { label: 'Secundar (relatare)', value: 'secundar' },
        { label: 'Speculativ (frontieră)', value: 'speculativ' },
      ],
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'tipCitarePermis',
      type: 'select',
      required: true,
      defaultValue: 'parafrazare',
      options: [
        { label: 'Citat direct ≤15 cuvinte + link', value: 'citat-scurt' },
        { label: 'Doar parafrazare + link', value: 'parafrazare' },
        { label: 'Etichetă frontieră obligatorie', value: 'frontiera' },
      ],
      admin: { hidden: true },
    },
    {
      name: 'permiteAutoGenerare',
      type: 'checkbox',
      defaultValue: true,
      admin: { hidden: true },
    },
    {
      name: 'pilon',
      type: 'relationship',
      relationTo: 'categorii',
      hasMany: true,
      admin: { description: 'Pilonii pentru care e relevantă această sursă.' },
    },
    {
      name: 'feedRSS',
      type: 'text',
      admin: { description: 'URL feed RSS, dacă există (pentru Auto-Publisher).' },
    },
    {
      name: 'regiune',
      type: 'select',
      defaultValue: 'global',
      options: [
        { label: 'Global', value: 'global' },
        { label: 'European', value: 'europa' },
        { label: 'România', value: 'romania' },
      ],
    },
    { name: 'activa', type: 'checkbox', defaultValue: true },
  ],
}
