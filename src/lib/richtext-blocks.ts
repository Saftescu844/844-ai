import type { Block } from 'payload'

export const VideoBlock: Block = {
  slug: 'video',
  labels: { singular: 'Video', plural: 'Video-uri' },
  fields: [
    { name: 'url', type: 'text', required: true, label: 'Link YouTube sau Vimeo' },
    { name: 'titlu', type: 'text', label: 'Titlu (opțional)' },
  ],
}

export const CalloutBlock: Block = {
  slug: 'callout',
  labels: { singular: 'Callout', plural: 'Callout-uri' },
  fields: [
    {
      name: 'tip',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: 'Informație', value: 'info' },
        { label: 'Sursă', value: 'sursa' },
        { label: 'Producător', value: 'producator' },
        { label: 'Atenționare', value: 'atentionare' },
      ],
    },
    { name: 'text', type: 'textarea', required: true },
    { name: 'linkText', type: 'text', label: 'Text link (opțional)' },
    { name: 'linkUrl', type: 'text', label: 'URL link (opțional)' },
  ],
}

export const TableBlock: Block = {
  slug: 'tableBlock',
  labels: { singular: 'Tabel', plural: 'Tabele' },
  fields: [
    {
      name: 'headere',
      type: 'array',
      labels: { singular: 'Coloană', plural: 'Coloane' },
      fields: [{ name: 'text', type: 'text' }],
    },
    {
      name: 'randuri',
      type: 'array',
      labels: { singular: 'Rând', plural: 'Rânduri' },
      fields: [
        {
          name: 'celule',
          type: 'array',
          labels: { singular: 'Celulă', plural: 'Celule' },
          fields: [{ name: 'text', type: 'text' }],
        },
      ],
    },
  ],
}
