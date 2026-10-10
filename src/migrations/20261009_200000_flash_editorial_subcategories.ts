import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds optional editorial subcategories to Flash AI and version snapshots.
 * No automatic classification or backfill of existing records.
 * Deploy only after explicit staging migration approval.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_flash_ai_subcategorie" AS ENUM(
      'diagnostic', 'medicamente', 'asistenta-clinica', 'reglementare', 'pacienti'
    );
    CREATE TYPE "public"."enum_flash_ai_subcategorie_educatie" AS ENUM(
      'invatare-ai', 'institutii', 'instrumente-edu', 'cercetare', 'cariere'
    );
    CREATE TYPE "public"."enum__flash_ai_v_version_subcategorie" AS ENUM(
      'diagnostic', 'medicamente', 'asistenta-clinica', 'reglementare', 'pacienti'
    );
    CREATE TYPE "public"."enum__flash_ai_v_version_subcategorie_educatie" AS ENUM(
      'invatare-ai', 'institutii', 'instrumente-edu', 'cercetare', 'cariere'
    );

    ALTER TABLE "flash_ai"
      ADD COLUMN "subcategorie" "enum_flash_ai_subcategorie",
      ADD COLUMN "subcategorie_educatie" "enum_flash_ai_subcategorie_educatie";

    ALTER TABLE "_flash_ai_v"
      ADD COLUMN "version_subcategorie" "enum__flash_ai_v_version_subcategorie",
      ADD COLUMN "version_subcategorie_educatie" "enum__flash_ai_v_version_subcategorie_educatie";

    CREATE INDEX "flash_ai_subcategorie_idx" ON "flash_ai" USING btree ("subcategorie");
    CREATE INDEX "flash_ai_subcategorie_educatie_idx" ON "flash_ai" USING btree ("subcategorie_educatie");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "flash_ai_subcategorie_idx";
    DROP INDEX IF EXISTS "flash_ai_subcategorie_educatie_idx";

    ALTER TABLE "_flash_ai_v"
      DROP COLUMN "version_subcategorie",
      DROP COLUMN "version_subcategorie_educatie";

    ALTER TABLE "flash_ai"
      DROP COLUMN "subcategorie",
      DROP COLUMN "subcategorie_educatie";

    DROP TYPE "public"."enum__flash_ai_v_version_subcategorie_educatie";
    DROP TYPE "public"."enum__flash_ai_v_version_subcategorie";
    DROP TYPE "public"."enum_flash_ai_subcategorie_educatie";
    DROP TYPE "public"."enum_flash_ai_subcategorie";
  `)
}
