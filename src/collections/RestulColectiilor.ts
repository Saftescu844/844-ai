import type { CollectionConfig } from 'payload'
import { lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'

// ============================================================
//  CATEGORII — cei 5 piloni de conținut
// ============================================================
export const Categorii: CollectionConfig = {
  slug: 'categorii',
  labels: { singular: 'Categorie', plural: 'Categorii' },
  admin: { useAsTitle: 'nume', group: 'Conținut' },
  fields: [
    { name: 'nume', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'pilon',
      type: 'select',
      required: true,
      options: [
        { label: 'P1 — Știri AI', value: 'stiri' },
        { label: 'P2 — Sănătate și medicină', value: 'sanatate' },
        { label: 'P3 — Educație', value: 'educatie' },
        { label: 'P4 — Tool Directory', value: 'tools' },
        { label: 'P5 — Afaceri și productivitate', value: 'afaceri' },
      ],
    },
    { name: 'descriere', type: 'textarea' },
    {
      name: 'necesitaDisclaimer',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Bifat pentru Pilonul 2 — declanșează disclaimerul medical.' },
    },
  ],
}

// ============================================================
//  COMENTARII — de la useri înregistrați, cu moderare
// ============================================================
export const Comentarii: CollectionConfig = {
  slug: 'comentarii',
  labels: { singular: 'Comentariu', plural: 'Comentarii' },
  admin: {
    useAsTitle: 'continut',
    defaultColumns: ['continut', 'autor', 'articol', 'status'],
    group: 'Comunitate',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true
      return { status: { equals: 'aprobat' } } // public vede doar aprobate
    },
    create: ({ req: { user } }) => Boolean(user), // doar userii înregistrați
  },
  fields: [
    { name: 'continut', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'autor', type: 'relationship', relationTo: 'useri', required: true },
    { name: 'articol', type: 'relationship', relationTo: 'articole', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'asteptare',
      options: [
        { label: 'În așteptare', value: 'asteptare' },
        { label: 'Aprobat', value: 'aprobat' },
        { label: 'Respins', value: 'respins' },
      ],
      index: true,
      admin: { description: 'Moderare din ziua 1 — comentariile apar public doar după aprobare.' },
    },
    {
      name: 'raspunsLa',
      type: 'relationship',
      relationTo: 'comentarii',
      admin: { description: 'Pentru thread-uri (răspuns la alt comentariu).' },
    },
  ],
}

// ============================================================
//  TOOL-URI AI — Pilonul 4, cu scoruri și afiliere
// ============================================================
export const Tooluri: CollectionConfig = {
  slug: 'tooluri',
  labels: { singular: 'Tool AI', plural: 'Tool-uri AI' },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['nume', 'categorie', 'scor', 'verificatLa'],
    group: 'Conținut',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true
      return { activ: { equals: true } }
    },
  },
  fields: [
    { name: 'nume', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'descriere',
      type: 'textarea',
      localized: true,
      maxLength: 300,
      admin: { description: 'Descriere scurtă pentru card (1-2 fraze). Bilingv prin localizare.' },
    },
    { name: 'website', type: 'text', required: true },
    {
      name: 'linkAfiliat',
      type: 'text',
      admin: { description: 'Link de afiliere, dacă există. Se declară afilierea în pagină.' },
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'categorieTool',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Scriere / Text', value: 'text' },
        { label: 'Imagine', value: 'imagine' },
        { label: 'Video', value: 'video' },
        { label: 'Cod / Dev', value: 'cod' },
        { label: 'Audio / Voce', value: 'audio' },
        { label: 'Productivitate', value: 'productivitate' },
        { label: 'Cercetare', value: 'cercetare' },
      ],
    },
    {
      name: 'scor',
      type: 'number',
      min: 0,
      max: 10,
      admin: { description: 'Scor editorial 0-10.' },
    },
    {
      name: 'pret',
      type: 'select',
      options: [
        { label: 'Gratuit', value: 'gratuit' },
        { label: 'Freemium', value: 'freemium' },
        { label: 'Plătit', value: 'platit' },
      ],
    },
    { name: 'recenzie', type: 'richText', localized: true },
    {
      name: 'studiuDeCaz',
      type: 'richText',
      localized: true,
      admin: { description: 'Realizări remarcabile probate practic.' },
    },
    {
      name: 'verificatLa',
      type: 'date',
      admin: { description: 'Ultima verificare a statusului — directorul trebuie ținut la zi.' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
  ],
}

// ============================================================
//  ROADMAPS — Pilonul 3, trasee de învățare interactive
// ============================================================
export const Roadmaps: CollectionConfig = {
  slug: 'roadmaps',
  labels: { singular: 'Roadmap', plural: 'Roadmaps' },
  admin: { useAsTitle: 'titlu', group: 'Conținut' },
  access: { read: () => true },
  fields: [
    { name: 'titlu', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'descriere', type: 'textarea', localized: true },
    {
      name: 'nivel',
      type: 'select',
      options: [
        { label: 'Începător', value: 'incepator' },
        { label: 'Intermediar', value: 'intermediar' },
        { label: 'Avansat', value: 'avansat' },
      ],
    },
    {
      name: 'pasi',
      type: 'array',
      localized: true,
      labels: { singular: 'Pas', plural: 'Pași' },
      fields: [
        { name: 'titlu', type: 'text', required: true },
        { name: 'descriere', type: 'richText' },
        {
          name: 'resurse',
          type: 'array',
          fields: [
            { name: 'titlu', type: 'text' },
            { name: 'url', type: 'text' },
          ],
        },
      ],
    },
  ],
}

// ============================================================
//  CURSURI — Pilonul 3, conținut cu acces plătit
// ============================================================
export const Cursuri: CollectionConfig = {
  slug: 'cursuri',
  labels: { singular: 'Curs', plural: 'Cursuri' },
  admin: { useAsTitle: 'titlu', group: 'Conținut' },
  access: {
    // doar userii cu abonament 'complet' văd conținutul lecțiilor
    read: ({ req: { user } }) => {
      if (user?.rol === 'admin' || user?.rol === 'editor') return true
      if (user?.nivelAbonament === 'complet') return true
      return { gratuit: { equals: true } }
    },
  },
  fields: [
    { name: 'titlu', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'descriere', type: 'richText', localized: true },
    { name: 'imagine', type: 'upload', relationTo: 'media' },
    {
      name: 'gratuit',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Curs gratuit sau necesită abonament complet.' },
    },
    {
      name: 'pretStripe',
      type: 'text',
      admin: { description: 'Stripe Price ID, dacă e vândut individual.' },
    },
    {
      name: 'lectii',
      type: 'array',
      localized: true,
      fields: [
        { name: 'titlu', type: 'text', required: true },
        {
          name: 'continut',
          type: 'richText',
          editor: lexicalEditor({
            features: ({ defaultFeatures }) => [
              ...defaultFeatures,
              UploadFeature({
                collections: {
                  media: {
                    fields: [
                      { name: 'caption', type: 'text', label: 'Descriere (caption)' },
                      { name: 'align', type: 'select', defaultValue: 'center', options: [
                        { label: 'Stânga', value: 'left' },
                        { label: 'Centru', value: 'center' },
                        { label: 'Dreapta', value: 'right' },
                      ] },
                    ],
                  },
                },
              }),
            ],
          }),
        },
        { name: 'videoURL', type: 'text' },
        { name: 'durataMinute', type: 'number' },
      ],
    },
  ],
}

// ============================================================
//  CALL-URI UE — finanțare AI (valoare unică pe piața RO)
// ============================================================
export const CallouriUE: CollectionConfig = {
  slug: 'callouri-ue',
  labels: { singular: 'Call UE', plural: 'Call-uri UE' },
  admin: {
    useAsTitle: 'titlu',
    defaultColumns: ['titlu', 'program', 'deadline', 'eligibilRomania'],
    group: 'Comunitate',
  },
  access: { read: () => true },
  fields: [
    { name: 'titlu', type: 'text', required: true },
    {
      name: 'program',
      type: 'select',
      options: [
        { label: 'EIC Accelerator', value: 'eic-accelerator' },
        { label: 'EIC Pre-Accelerator', value: 'eic-pre' },
        { label: 'GenAI4EU', value: 'genai4eu' },
        { label: 'Horizon Europe', value: 'horizon' },
        { label: 'Digital Europe', value: 'digital-europe' },
        { label: 'Altele', value: 'altele' },
      ],
    },
    { name: 'descriere', type: 'richText' },
    {
      name: 'finantareMax',
      type: 'text',
      admin: { description: 'Ex: "2,5M€ grant + 15M€ equity".' },
    },
    { name: 'deadline', type: 'date', index: true },
    {
      name: 'eligibilRomania',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Evidențiat — multe programe au România în grupul widening.' },
    },
    { name: 'pilonRelevant', type: 'relationship', relationTo: 'categorii', hasMany: true },
    { name: 'linkOficial', type: 'text', required: true },
    { name: 'activ', type: 'checkbox', defaultValue: true },
  ],
}

// ============================================================
//  MEDIA — imagini cu hash MD5 pentru deduplicare
// ============================================================
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { group: 'Sistem' },
  access: { read: () => true },
  upload: {
    staticDir: 'media',
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1280, height: 720, position: 'centre' },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      admin: { description: 'Text alternativ — accesibilitate și SEO.' },
    },
    {
      name: 'hashMD5',
      type: 'text',
      index: true,
      admin: { description: 'Hash pentru deduplicare (blacklist imagini repetate).' },
    },
    {
      name: 'sursaImagine',
      type: 'select',
      options: [
        { label: 'Pexels', value: 'pexels' },
        { label: 'Pixabay', value: 'pixabay' },
        { label: 'Unsplash', value: 'unsplash' },
        { label: 'Proprie', value: 'proprie' },
      ],
    },
  ],
}

// ============================================================
//  NEWSLETTER — abonați, segmentat RO/EN
// ============================================================
export const Newsletter: CollectionConfig = {
  slug: 'newsletter',
  labels: { singular: 'Abonat', plural: 'Abonați newsletter' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'limba', 'segment', 'confirmat'],
    group: 'Comunitate',
  },
  access: { read: ({ req: { user } }) => Boolean(user), create: () => true },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'limba',
      type: 'select',
      defaultValue: 'ro',
      options: [
        { label: 'Română', value: 'ro' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'segment',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'General', value: 'general' },
        { label: 'Profesioniști', value: 'profesionisti' },
        { label: 'Studenți', value: 'studenti' },
        { label: 'Call-uri UE', value: 'callouri' },
      ],
    },
    {
      name: 'confirmat',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Double opt-in confirmat.' },
    },
    { name: 'userAsociat', type: 'relationship', relationTo: 'useri' },
  ],
}
