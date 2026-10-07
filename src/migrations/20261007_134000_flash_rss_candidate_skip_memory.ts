import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "surse"
    ADD COLUMN "rss_candidate_skip_memory" jsonb DEFAULT '[]'::jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "surse"
    DROP COLUMN "rss_candidate_skip_memory";
  `)
}
