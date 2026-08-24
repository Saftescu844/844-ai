import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articole" ADD COLUMN "autor_principal_id" integer;
  ALTER TABLE "articole" ADD COLUMN "verificator_editorial_id" integer;
  ALTER TABLE "articole" ADD COLUMN "verificator_medical_id" integer;
  ALTER TABLE "articole_rels" ADD COLUMN "autori_id" integer;
  ALTER TABLE "_articole_v" ADD COLUMN "version_autor_principal_id" integer;
  ALTER TABLE "_articole_v" ADD COLUMN "version_verificator_editorial_id" integer;
  ALTER TABLE "_articole_v" ADD COLUMN "version_verificator_medical_id" integer;
  ALTER TABLE "_articole_v_rels" ADD COLUMN "autori_id" integer;
  ALTER TABLE "articole" ADD CONSTRAINT "articole_autor_principal_id_autori_id_fk" FOREIGN KEY ("autor_principal_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole" ADD CONSTRAINT "articole_verificator_editorial_id_autori_id_fk" FOREIGN KEY ("verificator_editorial_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole" ADD CONSTRAINT "articole_verificator_medical_id_autori_id_fk" FOREIGN KEY ("verificator_medical_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole_rels" ADD CONSTRAINT "articole_rels_autori_fk" FOREIGN KEY ("autori_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_version_autor_principal_id_autori_id_fk" FOREIGN KEY ("version_autor_principal_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_version_verificator_editorial_id_autori_id_fk" FOREIGN KEY ("version_verificator_editorial_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_version_verificator_medical_id_autori_id_fk" FOREIGN KEY ("version_verificator_medical_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v_rels" ADD CONSTRAINT "_articole_v_rels_autori_fk" FOREIGN KEY ("autori_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articole_autor_principal_idx" ON "articole" USING btree ("autor_principal_id");
  CREATE INDEX "articole_verificator_editorial_idx" ON "articole" USING btree ("verificator_editorial_id");
  CREATE INDEX "articole_verificator_medical_idx" ON "articole" USING btree ("verificator_medical_id");
  CREATE INDEX "articole_rels_autori_id_idx" ON "articole_rels" USING btree ("autori_id");
  CREATE INDEX "_articole_v_version_version_autor_principal_idx" ON "_articole_v" USING btree ("version_autor_principal_id");
  CREATE INDEX "_articole_v_version_version_verificator_editorial_idx" ON "_articole_v" USING btree ("version_verificator_editorial_id");
  CREATE INDEX "_articole_v_version_version_verificator_medical_idx" ON "_articole_v" USING btree ("version_verificator_medical_id");
  CREATE INDEX "_articole_v_rels_autori_id_idx" ON "_articole_v_rels" USING btree ("autori_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articole" DROP CONSTRAINT "articole_autor_principal_id_autori_id_fk";

  ALTER TABLE "articole" DROP CONSTRAINT "articole_verificator_editorial_id_autori_id_fk";

  ALTER TABLE "articole" DROP CONSTRAINT "articole_verificator_medical_id_autori_id_fk";

  ALTER TABLE "articole_rels" DROP CONSTRAINT "articole_rels_autori_fk";

  ALTER TABLE "_articole_v" DROP CONSTRAINT "_articole_v_version_autor_principal_id_autori_id_fk";

  ALTER TABLE "_articole_v" DROP CONSTRAINT "_articole_v_version_verificator_editorial_id_autori_id_fk";

  ALTER TABLE "_articole_v" DROP CONSTRAINT "_articole_v_version_verificator_medical_id_autori_id_fk";

  ALTER TABLE "_articole_v_rels" DROP CONSTRAINT "_articole_v_rels_autori_fk";

  DROP INDEX "articole_autor_principal_idx";
  DROP INDEX "articole_verificator_editorial_idx";
  DROP INDEX "articole_verificator_medical_idx";
  DROP INDEX "articole_rels_autori_id_idx";
  DROP INDEX "_articole_v_version_version_autor_principal_idx";
  DROP INDEX "_articole_v_version_version_verificator_editorial_idx";
  DROP INDEX "_articole_v_version_version_verificator_medical_idx";
  DROP INDEX "_articole_v_rels_autori_id_idx";
  ALTER TABLE "articole" DROP COLUMN "autor_principal_id";
  ALTER TABLE "articole" DROP COLUMN "verificator_editorial_id";
  ALTER TABLE "articole" DROP COLUMN "verificator_medical_id";
  ALTER TABLE "articole_rels" DROP COLUMN "autori_id";
  ALTER TABLE "_articole_v" DROP COLUMN "version_autor_principal_id";
  ALTER TABLE "_articole_v" DROP COLUMN "version_verificator_editorial_id";
  ALTER TABLE "_articole_v" DROP COLUMN "version_verificator_medical_id";
  ALTER TABLE "_articole_v_rels" DROP COLUMN "autori_id";`)
}
