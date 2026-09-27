import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * One-time production cutover bridge.
 *
 * This is intentionally NOT registered in src/migrations/index.ts.
 *
 * It exists only to preserve the legacy production publication authority
 * while moving from the historical custom `status` field to Payload's
 * native `_status` authority.
 *
 * Preconditions:
 * - the legacy article status migration has already renamed
 *   status -> editorial_status
 * - no modern post-cutover writes have occurred yet
 *
 * Legacy authority:
 *   editorial_status = approved  <=> legacy status was published
 *
 * Therefore the bridge aligns native Payload publication state exactly once:
 * - approved -> published
 * - everything else -> draft
 *
 * The same rule is applied to historical Payload versions.
 */
export async function applyLegacyPublicationAuthorityBridge(db: MigrateUpArgs['db']) {
  await db.execute(sql`
    UPDATE "articole"
    SET "_status" = CASE
      WHEN "editorial_status"::text = 'approved'
        THEN 'published'::"public"."enum_articole_status"
      ELSE 'draft'::"public"."enum_articole_status"
    END
    WHERE "_status" IS DISTINCT FROM CASE
      WHEN "editorial_status"::text = 'approved'
        THEN 'published'::"public"."enum_articole_status"
      ELSE 'draft'::"public"."enum_articole_status"
    END;

    UPDATE "_articole_v"
    SET "version__status" = CASE
      WHEN "version_editorial_status"::text = 'approved'
        THEN 'published'::"public"."enum__articole_v_version_status"
      ELSE 'draft'::"public"."enum__articole_v_version_status"
    END
    WHERE "version__status" IS DISTINCT FROM CASE
      WHEN "version_editorial_status"::text = 'approved'
        THEN 'published'::"public"."enum__articole_v_version_status"
      ELSE 'draft'::"public"."enum__articole_v_version_status"
    END;
  `)
}
