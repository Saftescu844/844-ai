import type { CollectionConfig } from 'payload'

// ============================================================
//  SURSE — cu nivel de încredere (Primar/Secundar/Speculativ)
//  Reflectă sistemul de scoring din documentul oficial de surse.
//  Auto-Publisher verifică nivelul înainte de a genera automat.
// ============================================================

export const Surse: CollectionConfig = {
  slug: 'surse',
  labels: { singular: 'Sursă', plural: 'Surse' },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['nume', 'nivelIncredere', 'pilon', 'permiteAutoGenerare'],
    group: 'Conținut',
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
    },
    {
      name: 'permiteAutoGenerare',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Dacă Auto-Publisher poate genera articole din această sursă. Speculativ = de obicei false.',
      },
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
