import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "comentarii"
      ALTER COLUMN "articol_id" DROP NOT NULL;

    ALTER TABLE "comentarii"
      ADD COLUMN "flash_id" integer;

    ALTER TABLE "comentarii"
      ADD CONSTRAINT "comentarii_flash_id_flash_ai_id_fk"
      FOREIGN KEY ("flash_id")
      REFERENCES "public"."flash_ai"("id")
      ON DELETE set null
      ON UPDATE no action;

    CREATE INDEX "comentarii_flash_idx"
      ON "comentarii"
      USING btree ("flash_id");

    ALTER TABLE "comentarii"
      ADD CONSTRAINT "comentarii_exact_one_target_chk"
      CHECK (
        ("articol_id" IS NOT NULL) <> ("flash_id" IS NOT NULL)
      );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM "comentarii"
        WHERE "flash_id" IS NOT NULL
      ) THEN
        RAISE EXCEPTION
          'Cannot roll back U14.7H while FlashAI comments exist.';
      END IF;
    END
    $$;

    ALTER TABLE "comentarii"
      DROP CONSTRAINT "comentarii_exact_one_target_chk";

    ALTER TABLE "comentarii"
      DROP CONSTRAINT "comentarii_flash_id_flash_ai_id_fk";

    DROP INDEX "comentarii_flash_idx";

    ALTER TABLE "comentarii"
      DROP COLUMN "flash_id";

    ALTER TABLE "comentarii"
      ALTER COLUMN "articol_id" SET NOT NULL;
  `)
}
