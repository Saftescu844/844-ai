import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

// === Colecții ===
import { Articole } from './collections/Articole'
import { Surse } from './collections/Surse'
import { Useri } from './collections/Useri'
import sharp from 'sharp'
import {
  Categorii,
  Comentarii,
  Tooluri,
  Roadmaps,
  Cursuri,
  CallouriUE,
  Media,
  Newsletter,
} from './collections/RestulColectiilor'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // === Autentificare: colecția Useri ===
  admin: {
    user: 'useri',
    meta: { titleSuffix: '— 844-ai.ro' },
  },

  // === Editor de conținut ===
  editor: lexicalEditor(),

  // === Toate colecțiile platformei ===
  collections: [
    Articole,
    Surse,
    Categorii,
    Useri,
    Comentarii,
    Tooluri,
    Roadmaps,
    Cursuri,
    CallouriUE,
    Newsletter,
    Media,
  ],

  // === Bază de date: PostgreSQL pe Supabase ===
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),

  // === Localizare la nivel de câmp (pentru Tool-uri, Roadmaps, Cursuri) ===
  // NOTĂ: Articolele NU folosesc asta — sunt documente separate per limbă,
  // conform deciziei de SEO. Localizarea de câmp e doar pentru conținut
  // structurat scurt (descrieri tool-uri, pași roadmap) unde nu contează SEO per-URL.
  localization: {
    locales: [
      { label: 'Română', code: 'ro' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'ro',
    fallback: true,
  },
  sharp,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
