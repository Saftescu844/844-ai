import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articole" ADD COLUMN "significant_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_articole_v" ADD COLUMN "version_significant_updated_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articole" DROP COLUMN "significant_updated_at";
  ALTER TABLE "_articole_v" DROP COLUMN "version_significant_updated_at";`)
}
