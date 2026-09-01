import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_media_sursa_imagine" ADD VALUE 'alta';
  ALTER TABLE "media" ADD COLUMN "drept_utilizare_confirmat" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "credit" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ALTER COLUMN "sursa_imagine" SET DATA TYPE text;
  DROP TYPE "public"."enum_media_sursa_imagine";
  CREATE TYPE "public"."enum_media_sursa_imagine" AS ENUM('pexels', 'pixabay', 'unsplash', 'proprie');
  ALTER TABLE "media" ALTER COLUMN "sursa_imagine" SET DATA TYPE "public"."enum_media_sursa_imagine" USING "sursa_imagine"::"public"."enum_media_sursa_imagine";
  ALTER TABLE "media" DROP COLUMN "drept_utilizare_confirmat";
  ALTER TABLE "media" DROP COLUMN "credit";`)
}
