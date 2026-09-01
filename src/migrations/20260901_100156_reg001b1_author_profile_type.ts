import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_autori_profile_type" AS ENUM('person', 'editorialSystem');
  ALTER TABLE "autori" ADD COLUMN "profile_type" "enum_autori_profile_type" DEFAULT 'person' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "autori" DROP COLUMN "profile_type";
  DROP TYPE "public"."enum_autori_profile_type";`)
}
