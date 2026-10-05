import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_surse_discovery_method" AS ENUM('disabled', 'rss', 'html', 'research');
  ALTER TABLE "surse" ADD COLUMN "discovery_method" "enum_surse_discovery_method" DEFAULT 'disabled' NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "discovery_url" varchar;
  ALTER TABLE "surse" ADD COLUMN "scan_interval_minutes" numeric DEFAULT 360 NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "max_candidates_per_scan" numeric DEFAULT 10 NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "max_candidates_per_day" numeric DEFAULT 40 NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "discovery_notes" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "surse" DROP COLUMN "discovery_method";
  ALTER TABLE "surse" DROP COLUMN "discovery_url";
  ALTER TABLE "surse" DROP COLUMN "scan_interval_minutes";
  ALTER TABLE "surse" DROP COLUMN "max_candidates_per_scan";
  ALTER TABLE "surse" DROP COLUMN "max_candidates_per_day";
  ALTER TABLE "surse" DROP COLUMN "discovery_notes";
  DROP TYPE "public"."enum_surse_discovery_method";`)
}
