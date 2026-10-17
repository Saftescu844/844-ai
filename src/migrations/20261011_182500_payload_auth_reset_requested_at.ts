import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Payload 3.90.x adds an internal auth rate-limit timestamp.
 * Add the nullable column without modifying existing users or sessions.
 * This is not executed on staging/production until separately approved.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "useri"
      ADD COLUMN IF NOT EXISTS "reset_password_requested_at"
      timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "useri"
      DROP COLUMN IF EXISTS "reset_password_requested_at";
  `)
}
