import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Payload 3.90.x cloud storage adds a hidden _objectKey text field.
 * Keep existing Media / Supabase S3 objects in their legacy root location:
 * this migration does not rewrite paths or backfill object keys.
 *
 * Staging already received this exact schema change in controlled batch 27.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      DROP COLUMN IF EXISTS "_objectkey";
  `)
}
