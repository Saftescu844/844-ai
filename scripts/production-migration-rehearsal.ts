import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as m00 from '../src/migrations/20260730_185012_baseline_current_schema'
import * as m01 from '../src/migrations/20260809_162701_sitesettings_initial_schema'
import * as m02 from '../src/migrations/20260813_150153_search_infrastructure'
import * as m03 from '../src/migrations/20260817_182526_autori_collection_schema'
import * as m04 from '../src/migrations/20260819_102350_articole_autori_relations'
import * as m05 from '../src/migrations/20260823_181759_articles_editorial_status_workflow'
import * as m06 from '../src/migrations/20260825_060427_article_scheduling'
import * as m07 from '../src/migrations/20260829_122921_audit007_newsletter_confirmation_cooldown'
import * as m08 from '../src/migrations/20260901_100156_reg001b1_author_profile_type'
import * as m09 from '../src/migrations/20260901_111927_reg001b2_author_media'
import * as m10 from '../src/migrations/20260901_141009_reg001c4_significant_update_date'
import * as m11 from '../src/migrations/20260902_105310'
import * as m12 from '../src/migrations/20260902_120037'
import * as m13 from '../src/migrations/20260909_074122_reg001d_flash_engine_runs'
import * as m14 from '../src/migrations/20260910_090156_reg001d_flash_engine_job_slug'
import * as m15 from '../src/migrations/20260919_111358_u14_7h_flash_ai_comments'
import * as m16 from '../src/migrations/20260925_120000_sec001_data_api_acl_hardening'
import { applyLegacyPublicationAuthorityBridge } from './cutover/legacy-publication-authority-bridge'

const connectionString = process.env.MIGRATION_REHEARSAL_DATABASE_URL

if (!connectionString) {
  throw new Error('MIGRATION_REHEARSAL_DATABASE_URL is required')
}

const parsed = new URL(connectionString)
const databaseName = parsed.pathname.replace(/^\//, '')

if (
  !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
  databaseName !== 'migration_rehearsal' ||
  parsed.username !== 'postgres'
) {
  throw new Error(
    `Refusing migration rehearsal outside isolated local CI database: host=${parsed.hostname} database=${databaseName} user=${parsed.username}`,
  )
}

const pool = new pg.Pool({ connectionString })
const db = drizzle(pool)

const ctx = {
  db,
  payload: {} as never,
  req: {} as never,
}

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message)
}

async function rows<T extends Record<string, unknown>>(query: string): Promise<T[]> {
  const result = await pool.query<T>(query)
  return result.rows
}

async function apply(name: string, migration: { up: (args: typeof ctx) => Promise<void> }) {
  process.stdout.write(`[rehearsal] applying ${name}... `)
  await migration.up(ctx)
  process.stdout.write('ok\n')
}

try {
  // Baseline + prerequisites up to the editorial workflow migration.
  await apply('baseline', m00)
  await apply('sitesettings', m01)
  await apply('search', m02)
  await apply('autori', m03)
  await apply('articole-autori', m04)

  // Four combinations observed in the real legacy production database:
  //   draft/draft
  //   draft/published
  //   published/draft
  //   published/published
  await pool.query(`
    INSERT INTO articole (titlu, slug, status, _status, published_at)
    VALUES
      ('legacy draft draft', 'legacy-draft-draft', 'draft', 'draft', NULL),
      ('legacy draft published', 'legacy-draft-published', 'draft', 'published', '2026-01-01T00:00:00Z'),
      ('legacy published draft', 'legacy-published-draft', 'published', 'draft', '2026-01-02T00:00:00Z'),
      ('legacy published published', 'legacy-published-published', 'published', 'published', '2026-01-03T00:00:00Z');
  `)

  await pool.query(`
    INSERT INTO _articole_v (
      parent_id,
      version_titlu,
      version_slug,
      version_status,
      version__status,
      version_published_at
    )
    SELECT id, titlu, slug, status::text::enum__articole_v_version_status,
           _status::text::enum__articole_v_version_status, published_at
    FROM articole
    WHERE slug LIKE 'legacy-%'
    ORDER BY id;
  `)

  await pool.query(`
    INSERT INTO search (title, publication_status, is_public)
    VALUES
      ('search draft', 'draft', false),
      ('search review', 'review', false),
      ('search published', 'published', true),
      ('search blocked', 'blocked', false);
  `)

  // Existing migration: custom legacy publication status becomes editorial status.
  await apply('editorial-status-workflow', m05)

  const preBridgeArticles = await rows<{
    slug: string
    editorial_status: string
    payload_status: string
  }>(`
    SELECT slug,
           editorial_status::text AS editorial_status,
           _status::text AS payload_status
    FROM articole
    WHERE slug LIKE 'legacy-%'
    ORDER BY slug;
  `)

  const preBridgeBySlug = new Map(preBridgeArticles.map((row) => [row.slug, row]))

  assert(
    preBridgeBySlug.get('legacy-published-draft')?.editorial_status === 'approved' &&
      preBridgeBySlug.get('legacy-published-draft')?.payload_status === 'draft',
    'Expected legacy published/draft mismatch to still exist before bridge',
  )

  assert(
    preBridgeBySlug.get('legacy-draft-published')?.editorial_status === 'draft' &&
      preBridgeBySlug.get('legacy-draft-published')?.payload_status === 'published',
    'Expected legacy draft/published mismatch to still exist before bridge',
  )

  // One-time cutover bridge: legacy custom publication authority -> Payload native authority.
  await applyLegacyPublicationAuthorityBridge(db)

  const postBridgeArticles = await rows<{
    slug: string
    editorial_status: string
    payload_status: string
    published_at: string | null
  }>(`
    SELECT slug,
           editorial_status::text AS editorial_status,
           _status::text AS payload_status,
           published_at::text
    FROM articole
    WHERE slug LIKE 'legacy-%'
    ORDER BY slug;
  `)

  const postBridgeBySlug = new Map(postBridgeArticles.map((row) => [row.slug, row]))

  for (const slug of ['legacy-published-draft', 'legacy-published-published']) {
    const row = postBridgeBySlug.get(slug)
    assert(row?.editorial_status === 'approved', `${slug}: expected approved editorial state`)
    assert(row?.payload_status === 'published', `${slug}: expected native published state`)
  }

  for (const slug of ['legacy-draft-draft', 'legacy-draft-published']) {
    const row = postBridgeBySlug.get(slug)
    assert(row?.editorial_status === 'draft', `${slug}: expected draft editorial state`)
    assert(row?.payload_status === 'draft', `${slug}: expected native draft state`)
  }

  const postBridgeVersions = await rows<{
    version_slug: string
    editorial_status: string
    payload_status: string
  }>(`
    SELECT version_slug,
           version_editorial_status::text AS editorial_status,
           version__status::text AS payload_status
    FROM _articole_v
    WHERE version_slug LIKE 'legacy-%'
    ORDER BY version_slug;
  `)

  const versionBySlug = new Map(postBridgeVersions.map((row) => [row.version_slug, row]))

  for (const slug of ['legacy-published-draft', 'legacy-published-published']) {
    assert(
      versionBySlug.get(slug)?.payload_status === 'published',
      `${slug}: expected historical published version to remain published`,
    )
  }

  for (const slug of ['legacy-draft-draft', 'legacy-draft-published']) {
    assert(
      versionBySlug.get(slug)?.payload_status === 'draft',
      `${slug}: expected historical draft version to remain draft`,
    )
  }

  const searchStatuses = await rows<{ editorial_status: string; is_public: boolean }>(`
    SELECT editorial_status::text AS editorial_status, is_public
    FROM search
    ORDER BY title;
  `)

  assert(
    searchStatuses.some((row) => row.editorial_status === 'approved' && row.is_public === true),
    'Expected published Search row to migrate to approved while retaining is_public',
  )

  // Complete the real migration chain after the bridge.
  await apply('article-scheduling', m06)
  await apply('newsletter-cooldown', m07)
  await apply('author-profile-type', m08)
  await apply('author-media', m09)
  await apply('significant-update-date', m10)
  await apply('flash-ai-schema', m11)
  await apply('flash-ai-source-fields', m12)
  await apply('flash-engine-runs', m13)
  await apply('flash-engine-job-slug', m14)
  await apply('flash-ai-comments', m15)
  await apply('sec001-acl-hardening', m16)

  const topology = await rows<{
    tables: number
    sequences: number
  }>(`
    SELECT
      (SELECT count(*)::int
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r') AS tables,
      (SELECT count(*)::int
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'S') AS sequences;
  `)

  assert(topology[0]?.tables === 83, `Expected 83 public tables, got ${topology[0]?.tables}`)
  assert(
    topology[0]?.sequences === 58,
    `Expected 58 public sequences, got ${topology[0]?.sequences}`,
  )

  const acl = await rows<{
    anon_tables: number
    auth_tables: number
  }>(`
    SELECT
      count(*) FILTER (
        WHERE has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'SELECT')
      )::int AS anon_tables,
      count(*) FILTER (
        WHERE has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'SELECT')
      )::int AS auth_tables
    FROM pg_tables
    WHERE schemaname = 'public';
  `)

  assert(acl[0]?.anon_tables === 0, `Expected anon SELECT on 0 tables, got ${acl[0]?.anon_tables}`)
  assert(acl[0]?.auth_tables === 0, `Expected authenticated SELECT on 0 tables, got ${acl[0]?.auth_tables}`)

  console.log('[rehearsal] PASS — legacy publication authority preserved through full migration chain')
} finally {
  await pool.end()
}
