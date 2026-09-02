import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_surse_source_role" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_surse_editorial_trust" AS ENUM('high', 'standard', 'restricted');
  CREATE TYPE "public"."enum_surse_citation_mode" AS ENUM('paraphrase', 'shortQuote');
  ALTER TABLE "surse" ADD COLUMN "source_role" "enum_surse_source_role" DEFAULT 'secondary' NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "editorial_trust" "enum_surse_editorial_trust" DEFAULT 'restricted' NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "citation_mode" "enum_surse_citation_mode" DEFAULT 'paraphrase' NOT NULL;
  ALTER TABLE "surse" ADD COLUMN "allow_ingestion" boolean DEFAULT false;
  ALTER TABLE "surse" ADD COLUMN "allow_auto_publish" boolean DEFAULT false;
  CREATE INDEX "surse_source_role_idx" ON "surse" USING btree ("source_role");
  CREATE INDEX "surse_editorial_trust_idx" ON "surse" USING btree ("editorial_trust");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "surse_source_role_idx";
  DROP INDEX "surse_editorial_trust_idx";
  ALTER TABLE "surse" DROP COLUMN "source_role";
  ALTER TABLE "surse" DROP COLUMN "editorial_trust";
  ALTER TABLE "surse" DROP COLUMN "citation_mode";
  ALTER TABLE "surse" DROP COLUMN "allow_ingestion";
  ALTER TABLE "surse" DROP COLUMN "allow_auto_publish";
  DROP TYPE "public"."enum_surse_source_role";
  DROP TYPE "public"."enum_surse_editorial_trust";
  DROP TYPE "public"."enum_surse_citation_mode";`)
}
