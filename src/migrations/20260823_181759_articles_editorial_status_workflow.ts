import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Enum-uri editoriale noi, complet separate de _status-ul nativ Payload.
    CREATE TYPE "public"."enum_articole_editorial_status"
      AS ENUM('draft', 'review', 'approved', 'blocked');

    CREATE TYPE "public"."enum__articole_v_version_editorial_status"
      AS ENUM('draft', 'review', 'approved', 'blocked');

    -- Eliminăm indexurile vechi înainte de schimbarea tipurilor.
    DROP INDEX "articole_status_idx";
    DROP INDEX "_articole_v_version_version_status_idx";
    DROP INDEX "search_publication_status_idx";

    -- Păstrăm datele prin rename, nu prin drop/create de coloane.
    ALTER TABLE "articole"
      RENAME COLUMN "status" TO "editorial_status";

    ALTER TABLE "_articole_v"
      RENAME COLUMN "version_status" TO "version_editorial_status";

    ALTER TABLE "search"
      RENAME COLUMN "publication_status" TO "editorial_status";

    -- Separăm statusul editorial al articolului de enum-ul nativ folosit de _status.
    ALTER TABLE "articole"
      ALTER COLUMN "editorial_status" DROP DEFAULT;

    ALTER TABLE "articole"
      ALTER COLUMN "editorial_status"
      SET DATA TYPE "public"."enum_articole_editorial_status"
      USING (
        CASE "editorial_status"::text
          WHEN 'published' THEN 'approved'
          ELSE "editorial_status"::text
        END
      )::"public"."enum_articole_editorial_status";

    ALTER TABLE "articole"
      ALTER COLUMN "editorial_status"
      SET DEFAULT 'draft'::"public"."enum_articole_editorial_status";

    -- Aceeași separare pentru istoricul Payload.
    -- version__status rămâne complet neatins.
    ALTER TABLE "_articole_v"
      ALTER COLUMN "version_editorial_status" DROP DEFAULT;

    ALTER TABLE "_articole_v"
      ALTER COLUMN "version_editorial_status"
      SET DATA TYPE "public"."enum__articole_v_version_editorial_status"
      USING (
        CASE "version_editorial_status"::text
          WHEN 'published' THEN 'approved'
          ELSE "version_editorial_status"::text
        END
      )::"public"."enum__articole_v_version_editorial_status";

    ALTER TABLE "_articole_v"
      ALTER COLUMN "version_editorial_status"
      SET DEFAULT 'draft'::"public"."enum__articole_v_version_editorial_status";

    -- Search are propriul enum: convertim explicit published -> approved.
    ALTER TABLE "search"
      ALTER COLUMN "editorial_status"
      SET DATA TYPE text
      USING "editorial_status"::text;

    UPDATE "search"
      SET "editorial_status" = 'approved'
      WHERE "editorial_status" = 'published';

    DROP TYPE "public"."enum_search_publication_status";

    CREATE TYPE "public"."enum_search_editorial_status"
      AS ENUM('draft', 'review', 'approved', 'blocked');

    ALTER TABLE "search"
      ALTER COLUMN "editorial_status"
      SET DATA TYPE "public"."enum_search_editorial_status"
      USING "editorial_status"::"public"."enum_search_editorial_status";

    -- Indexuri pe noile câmpuri editoriale.
    CREATE INDEX "articole_editorial_status_idx"
      ON "articole" USING btree ("editorial_status");

    CREATE INDEX "_articole_v_version_version_editorial_status_idx"
      ON "_articole_v" USING btree ("version_editorial_status");

    CREATE INDEX "search_editorial_status_idx"
      ON "search" USING btree ("editorial_status");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "articole_editorial_status_idx";
    DROP INDEX "_articole_v_version_version_editorial_status_idx";
    DROP INDEX "search_editorial_status_idx";

    -- Restaurăm Search la schema veche.
    ALTER TABLE "search"
      ALTER COLUMN "editorial_status"
      SET DATA TYPE text
      USING "editorial_status"::text;

    UPDATE "search"
      SET "editorial_status" = 'published'
      WHERE "editorial_status" = 'approved';

    DROP TYPE "public"."enum_search_editorial_status";

    CREATE TYPE "public"."enum_search_publication_status"
      AS ENUM('draft', 'review', 'published', 'blocked');

    ALTER TABLE "search"
      ALTER COLUMN "editorial_status"
      SET DATA TYPE "public"."enum_search_publication_status"
      USING "editorial_status"::"public"."enum_search_publication_status";

    -- Revenim la enum-ul comun istoric al articolelor.
    -- approved -> published; review/blocked -> draft deoarece enum-ul vechi
    -- enum_articole_status permite numai draft/published.
    ALTER TABLE "articole"
      ALTER COLUMN "editorial_status" DROP DEFAULT;

    ALTER TABLE "articole"
      ALTER COLUMN "editorial_status"
      SET DATA TYPE "public"."enum_articole_status"
      USING (
        CASE "editorial_status"::text
          WHEN 'approved' THEN 'published'
          WHEN 'review' THEN 'draft'
          WHEN 'blocked' THEN 'draft'
          ELSE "editorial_status"::text
        END
      )::"public"."enum_articole_status";

    ALTER TABLE "articole"
      ALTER COLUMN "editorial_status"
      SET DEFAULT 'draft'::"public"."enum_articole_status";

    -- Revenim identic pentru istoricul versiunilor.
    ALTER TABLE "_articole_v"
      ALTER COLUMN "version_editorial_status" DROP DEFAULT;

    ALTER TABLE "_articole_v"
      ALTER COLUMN "version_editorial_status"
      SET DATA TYPE "public"."enum__articole_v_version_status"
      USING (
        CASE "version_editorial_status"::text
          WHEN 'approved' THEN 'published'
          WHEN 'review' THEN 'draft'
          WHEN 'blocked' THEN 'draft'
          ELSE "version_editorial_status"::text
        END
      )::"public"."enum__articole_v_version_status";

    ALTER TABLE "_articole_v"
      ALTER COLUMN "version_editorial_status"
      SET DEFAULT 'draft'::"public"."enum__articole_v_version_status";

    ALTER TABLE "articole"
      RENAME COLUMN "editorial_status" TO "status";

    ALTER TABLE "_articole_v"
      RENAME COLUMN "version_editorial_status" TO "version_status";

    ALTER TABLE "search"
      RENAME COLUMN "editorial_status" TO "publication_status";

    CREATE INDEX "articole_status_idx"
      ON "articole" USING btree ("status");

    CREATE INDEX "_articole_v_version_version_status_idx"
      ON "_articole_v" USING btree ("version_status");

    CREATE INDEX "search_publication_status_idx"
      ON "search" USING btree ("publication_status");

    DROP TYPE "public"."enum_articole_editorial_status";
    DROP TYPE "public"."enum__articole_v_version_editorial_status";
  `)
}
