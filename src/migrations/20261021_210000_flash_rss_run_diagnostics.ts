import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Prepared locally only. Apply before deploying the RSS diagnostic writer.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "flash_engine_runs"
      ADD COLUMN "run_kind" varchar NOT NULL DEFAULT 'evaluation',
      ALTER COLUMN "flash_id_snapshot" DROP NOT NULL;
    ALTER TABLE "flash_engine_runs" ADD CONSTRAINT "flash_engine_runs_kind_snapshot_check"
      CHECK (
        (run_kind = 'evaluation' AND flash_id_snapshot IS NOT NULL
          AND flash_id_snapshot >= 1 AND flash_id_snapshot = trunc(flash_id_snapshot))
        OR (run_kind = 'rss-ingestion' AND (flash_id_snapshot IS NULL
          OR (flash_id_snapshot >= 1 AND flash_id_snapshot = trunc(flash_id_snapshot))))
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Refuse rollback if RSS records cannot be represented by the old contract.
  // No deletion or invented article ID is used to make rollback pass.
  await db.execute(sql`
    ALTER TABLE "flash_engine_runs" ALTER COLUMN "flash_id_snapshot" SET NOT NULL;
    ALTER TABLE "flash_engine_runs" DROP CONSTRAINT "flash_engine_runs_kind_snapshot_check";
    ALTER TABLE "flash_engine_runs" DROP COLUMN "run_kind";
  `)
}
