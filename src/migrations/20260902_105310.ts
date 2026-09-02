import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_flash_ai_disclaimer_types" AS ENUM('medicalInformational', 'emergingEvidence', 'notClinicallyValidated', 'regulatoryStatusLimitedOrUnclear', 'specialistDecision');
  CREATE TYPE "public"."enum_flash_ai_limba" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_flash_ai_flash_type" AS ENUM('announcement', 'research', 'regulation', 'product', 'business', 'incident', 'update', 'other');
  CREATE TYPE "public"."enum_flash_ai_information_status" AS ENUM('official', 'confirmed', 'emerging', 'preliminary', 'disputed', 'unverified');
  CREATE TYPE "public"."enum_flash_ai_risk_level" AS ENUM('low', 'medium', 'high');
  CREATE TYPE "public"."enum_flash_ai_medical_evidence_type" AS ENUM('notApplicable', 'preclinical', 'clinicalStudy', 'systematicReview', 'guidelineOrConsensus', 'regulatoryDecision', 'realWorldEvidence', 'productOrCompanyClaim', 'other');
  CREATE TYPE "public"."enum_flash_ai_clinical_validation_status" AS ENUM('notApplicable', 'notValidated', 'underEvaluation', 'limitedEvidence', 'validatedForSpecificUse', 'authorizedOrApproved', 'unclear');
  CREATE TYPE "public"."enum_flash_ai_editorial_status" AS ENUM('draft', 'review', 'approved', 'blocked');
  CREATE TYPE "public"."enum_flash_ai_automation_decision" AS ENUM('autoPublish', 'review', 'blocked');
  CREATE TYPE "public"."enum_flash_ai_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__flash_ai_v_version_disclaimer_types" AS ENUM('medicalInformational', 'emergingEvidence', 'notClinicallyValidated', 'regulatoryStatusLimitedOrUnclear', 'specialistDecision');
  CREATE TYPE "public"."enum__flash_ai_v_version_limba" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum__flash_ai_v_version_flash_type" AS ENUM('announcement', 'research', 'regulation', 'product', 'business', 'incident', 'update', 'other');
  CREATE TYPE "public"."enum__flash_ai_v_version_information_status" AS ENUM('official', 'confirmed', 'emerging', 'preliminary', 'disputed', 'unverified');
  CREATE TYPE "public"."enum__flash_ai_v_version_risk_level" AS ENUM('low', 'medium', 'high');
  CREATE TYPE "public"."enum__flash_ai_v_version_medical_evidence_type" AS ENUM('notApplicable', 'preclinical', 'clinicalStudy', 'systematicReview', 'guidelineOrConsensus', 'regulatoryDecision', 'realWorldEvidence', 'productOrCompanyClaim', 'other');
  CREATE TYPE "public"."enum__flash_ai_v_version_clinical_validation_status" AS ENUM('notApplicable', 'notValidated', 'underEvaluation', 'limitedEvidence', 'validatedForSpecificUse', 'authorizedOrApproved', 'unclear');
  CREATE TYPE "public"."enum__flash_ai_v_version_editorial_status" AS ENUM('draft', 'review', 'approved', 'blocked');
  CREATE TYPE "public"."enum__flash_ai_v_version_automation_decision" AS ENUM('autoPublish', 'review', 'blocked');
  CREATE TYPE "public"."enum__flash_ai_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__flash_ai_v_published_locale" AS ENUM('ro', 'en');
  CREATE TABLE "flash_ai_surse_flash" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "sursa_id" integer,
    "url" varchar,
    "source_published_at" timestamp(3) with time zone,
    "primary" boolean DEFAULT false
  );

  CREATE TABLE "flash_ai_disclaimer_types" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_flash_ai_disclaimer_types",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "flash_ai_specialist_questions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "question" varchar
  );

  CREATE TABLE "flash_ai" (
    "id" serial PRIMARY KEY NOT NULL,
    "titlu" varchar,
    "slug" varchar,
    "limba" "enum_flash_ai_limba" DEFAULT 'ro',
    "versiune_alternativa_id" integer,
    "pilon_id" integer,
    "flash_type" "enum_flash_ai_flash_type",
    "excerpt" varchar,
    "continut" jsonb,
    "imagine_principala_id" integer,
    "information_status" "enum_flash_ai_information_status" DEFAULT 'unverified',
    "risk_level" "enum_flash_ai_risk_level" DEFAULT 'medium',
    "is_health_related" boolean DEFAULT false,
    "medical_evidence_type" "enum_flash_ai_medical_evidence_type" DEFAULT 'notApplicable',
    "clinical_validation_status" "enum_flash_ai_clinical_validation_status" DEFAULT 'notApplicable',
    "autor_principal_id" integer,
    "verificator_editorial_id" integer,
    "verificator_medical_id" integer,
    "related_article_id" integer,
    "related_flash_id" integer,
    "editorial_status" "enum_flash_ai_editorial_status" DEFAULT 'draft',
    "automation_decision" "enum_flash_ai_automation_decision" DEFAULT 'review',
    "decision_reason" varchar,
    "event_fingerprint" varchar,
    "source_fingerprint" varchar,
    "generat_automat" boolean DEFAULT false,
    "published_at" timestamp(3) with time zone,
    "significant_updated_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_flash_ai_status" DEFAULT 'draft'
  );

  CREATE TABLE "_flash_ai_v_version_surse_flash" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "sursa_id" integer,
    "url" varchar,
    "source_published_at" timestamp(3) with time zone,
    "primary" boolean DEFAULT false,
    "_uuid" varchar
  );

  CREATE TABLE "_flash_ai_v_version_disclaimer_types" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum__flash_ai_v_version_disclaimer_types",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "_flash_ai_v_version_specialist_questions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "question" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_flash_ai_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_titlu" varchar,
    "version_slug" varchar,
    "version_limba" "enum__flash_ai_v_version_limba" DEFAULT 'ro',
    "version_versiune_alternativa_id" integer,
    "version_pilon_id" integer,
    "version_flash_type" "enum__flash_ai_v_version_flash_type",
    "version_excerpt" varchar,
    "version_continut" jsonb,
    "version_imagine_principala_id" integer,
    "version_information_status" "enum__flash_ai_v_version_information_status" DEFAULT 'unverified',
    "version_risk_level" "enum__flash_ai_v_version_risk_level" DEFAULT 'medium',
    "version_is_health_related" boolean DEFAULT false,
    "version_medical_evidence_type" "enum__flash_ai_v_version_medical_evidence_type" DEFAULT 'notApplicable',
    "version_clinical_validation_status" "enum__flash_ai_v_version_clinical_validation_status" DEFAULT 'notApplicable',
    "version_autor_principal_id" integer,
    "version_verificator_editorial_id" integer,
    "version_verificator_medical_id" integer,
    "version_related_article_id" integer,
    "version_related_flash_id" integer,
    "version_editorial_status" "enum__flash_ai_v_version_editorial_status" DEFAULT 'draft',
    "version_automation_decision" "enum__flash_ai_v_version_automation_decision" DEFAULT 'review',
    "version_decision_reason" varchar,
    "version_event_fingerprint" varchar,
    "version_source_fingerprint" varchar,
    "version_generat_automat" boolean DEFAULT false,
    "version_published_at" timestamp(3) with time zone,
    "version_significant_updated_at" timestamp(3) with time zone,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__flash_ai_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "snapshot" boolean,
    "published_locale" "enum__flash_ai_v_published_locale",
    "latest" boolean
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "flash_ai_id" integer;
  ALTER TABLE "flash_ai_surse_flash" ADD CONSTRAINT "flash_ai_surse_flash_sursa_id_surse_id_fk" FOREIGN KEY ("sursa_id") REFERENCES "public"."surse"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai_surse_flash" ADD CONSTRAINT "flash_ai_surse_flash_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."flash_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "flash_ai_disclaimer_types" ADD CONSTRAINT "flash_ai_disclaimer_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."flash_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "flash_ai_specialist_questions" ADD CONSTRAINT "flash_ai_specialist_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."flash_ai"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_versiune_alternativa_id_flash_ai_id_fk" FOREIGN KEY ("versiune_alternativa_id") REFERENCES "public"."flash_ai"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_pilon_id_categorii_id_fk" FOREIGN KEY ("pilon_id") REFERENCES "public"."categorii"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_imagine_principala_id_media_id_fk" FOREIGN KEY ("imagine_principala_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_autor_principal_id_autori_id_fk" FOREIGN KEY ("autor_principal_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_verificator_editorial_id_autori_id_fk" FOREIGN KEY ("verificator_editorial_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_verificator_medical_id_autori_id_fk" FOREIGN KEY ("verificator_medical_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_related_article_id_articole_id_fk" FOREIGN KEY ("related_article_id") REFERENCES "public"."articole"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "flash_ai" ADD CONSTRAINT "flash_ai_related_flash_id_flash_ai_id_fk" FOREIGN KEY ("related_flash_id") REFERENCES "public"."flash_ai"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v_version_surse_flash" ADD CONSTRAINT "_flash_ai_v_version_surse_flash_sursa_id_surse_id_fk" FOREIGN KEY ("sursa_id") REFERENCES "public"."surse"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v_version_surse_flash" ADD CONSTRAINT "_flash_ai_v_version_surse_flash_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_flash_ai_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_flash_ai_v_version_disclaimer_types" ADD CONSTRAINT "_flash_ai_v_version_disclaimer_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_flash_ai_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_flash_ai_v_version_specialist_questions" ADD CONSTRAINT "_flash_ai_v_version_specialist_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_flash_ai_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_parent_id_flash_ai_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."flash_ai"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_versiune_alternativa_id_flash_ai_id_fk" FOREIGN KEY ("version_versiune_alternativa_id") REFERENCES "public"."flash_ai"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_pilon_id_categorii_id_fk" FOREIGN KEY ("version_pilon_id") REFERENCES "public"."categorii"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_imagine_principala_id_media_id_fk" FOREIGN KEY ("version_imagine_principala_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_autor_principal_id_autori_id_fk" FOREIGN KEY ("version_autor_principal_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_verificator_editorial_id_autori_id_fk" FOREIGN KEY ("version_verificator_editorial_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_verificator_medical_id_autori_id_fk" FOREIGN KEY ("version_verificator_medical_id") REFERENCES "public"."autori"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_related_article_id_articole_id_fk" FOREIGN KEY ("version_related_article_id") REFERENCES "public"."articole"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_flash_ai_v" ADD CONSTRAINT "_flash_ai_v_version_related_flash_id_flash_ai_id_fk" FOREIGN KEY ("version_related_flash_id") REFERENCES "public"."flash_ai"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "flash_ai_surse_flash_order_idx" ON "flash_ai_surse_flash" USING btree ("_order");
  CREATE INDEX "flash_ai_surse_flash_parent_id_idx" ON "flash_ai_surse_flash" USING btree ("_parent_id");
  CREATE INDEX "flash_ai_surse_flash_sursa_idx" ON "flash_ai_surse_flash" USING btree ("sursa_id");
  CREATE INDEX "flash_ai_disclaimer_types_order_idx" ON "flash_ai_disclaimer_types" USING btree ("order");
  CREATE INDEX "flash_ai_disclaimer_types_parent_idx" ON "flash_ai_disclaimer_types" USING btree ("parent_id");
  CREATE INDEX "flash_ai_specialist_questions_order_idx" ON "flash_ai_specialist_questions" USING btree ("_order");
  CREATE INDEX "flash_ai_specialist_questions_parent_id_idx" ON "flash_ai_specialist_questions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "flash_ai_slug_idx" ON "flash_ai" USING btree ("slug");
  CREATE INDEX "flash_ai_limba_idx" ON "flash_ai" USING btree ("limba");
  CREATE INDEX "flash_ai_versiune_alternativa_idx" ON "flash_ai" USING btree ("versiune_alternativa_id");
  CREATE INDEX "flash_ai_pilon_idx" ON "flash_ai" USING btree ("pilon_id");
  CREATE INDEX "flash_ai_flash_type_idx" ON "flash_ai" USING btree ("flash_type");
  CREATE INDEX "flash_ai_imagine_principala_idx" ON "flash_ai" USING btree ("imagine_principala_id");
  CREATE INDEX "flash_ai_information_status_idx" ON "flash_ai" USING btree ("information_status");
  CREATE INDEX "flash_ai_risk_level_idx" ON "flash_ai" USING btree ("risk_level");
  CREATE INDEX "flash_ai_is_health_related_idx" ON "flash_ai" USING btree ("is_health_related");
  CREATE INDEX "flash_ai_autor_principal_idx" ON "flash_ai" USING btree ("autor_principal_id");
  CREATE INDEX "flash_ai_verificator_editorial_idx" ON "flash_ai" USING btree ("verificator_editorial_id");
  CREATE INDEX "flash_ai_verificator_medical_idx" ON "flash_ai" USING btree ("verificator_medical_id");
  CREATE INDEX "flash_ai_related_article_idx" ON "flash_ai" USING btree ("related_article_id");
  CREATE INDEX "flash_ai_related_flash_idx" ON "flash_ai" USING btree ("related_flash_id");
  CREATE INDEX "flash_ai_editorial_status_idx" ON "flash_ai" USING btree ("editorial_status");
  CREATE INDEX "flash_ai_automation_decision_idx" ON "flash_ai" USING btree ("automation_decision");
  CREATE INDEX "flash_ai_event_fingerprint_idx" ON "flash_ai" USING btree ("event_fingerprint");
  CREATE INDEX "flash_ai_source_fingerprint_idx" ON "flash_ai" USING btree ("source_fingerprint");
  CREATE INDEX "flash_ai_updated_at_idx" ON "flash_ai" USING btree ("updated_at");
  CREATE INDEX "flash_ai_created_at_idx" ON "flash_ai" USING btree ("created_at");
  CREATE INDEX "flash_ai__status_idx" ON "flash_ai" USING btree ("_status");
  CREATE INDEX "_flash_ai_v_version_surse_flash_order_idx" ON "_flash_ai_v_version_surse_flash" USING btree ("_order");
  CREATE INDEX "_flash_ai_v_version_surse_flash_parent_id_idx" ON "_flash_ai_v_version_surse_flash" USING btree ("_parent_id");
  CREATE INDEX "_flash_ai_v_version_surse_flash_sursa_idx" ON "_flash_ai_v_version_surse_flash" USING btree ("sursa_id");
  CREATE INDEX "_flash_ai_v_version_disclaimer_types_order_idx" ON "_flash_ai_v_version_disclaimer_types" USING btree ("order");
  CREATE INDEX "_flash_ai_v_version_disclaimer_types_parent_idx" ON "_flash_ai_v_version_disclaimer_types" USING btree ("parent_id");
  CREATE INDEX "_flash_ai_v_version_specialist_questions_order_idx" ON "_flash_ai_v_version_specialist_questions" USING btree ("_order");
  CREATE INDEX "_flash_ai_v_version_specialist_questions_parent_id_idx" ON "_flash_ai_v_version_specialist_questions" USING btree ("_parent_id");
  CREATE INDEX "_flash_ai_v_parent_idx" ON "_flash_ai_v" USING btree ("parent_id");
  CREATE INDEX "_flash_ai_v_version_version_slug_idx" ON "_flash_ai_v" USING btree ("version_slug");
  CREATE INDEX "_flash_ai_v_version_version_limba_idx" ON "_flash_ai_v" USING btree ("version_limba");
  CREATE INDEX "_flash_ai_v_version_version_versiune_alternativa_idx" ON "_flash_ai_v" USING btree ("version_versiune_alternativa_id");
  CREATE INDEX "_flash_ai_v_version_version_pilon_idx" ON "_flash_ai_v" USING btree ("version_pilon_id");
  CREATE INDEX "_flash_ai_v_version_version_flash_type_idx" ON "_flash_ai_v" USING btree ("version_flash_type");
  CREATE INDEX "_flash_ai_v_version_version_imagine_principala_idx" ON "_flash_ai_v" USING btree ("version_imagine_principala_id");
  CREATE INDEX "_flash_ai_v_version_version_information_status_idx" ON "_flash_ai_v" USING btree ("version_information_status");
  CREATE INDEX "_flash_ai_v_version_version_risk_level_idx" ON "_flash_ai_v" USING btree ("version_risk_level");
  CREATE INDEX "_flash_ai_v_version_version_is_health_related_idx" ON "_flash_ai_v" USING btree ("version_is_health_related");
  CREATE INDEX "_flash_ai_v_version_version_autor_principal_idx" ON "_flash_ai_v" USING btree ("version_autor_principal_id");
  CREATE INDEX "_flash_ai_v_version_version_verificator_editorial_idx" ON "_flash_ai_v" USING btree ("version_verificator_editorial_id");
  CREATE INDEX "_flash_ai_v_version_version_verificator_medical_idx" ON "_flash_ai_v" USING btree ("version_verificator_medical_id");
  CREATE INDEX "_flash_ai_v_version_version_related_article_idx" ON "_flash_ai_v" USING btree ("version_related_article_id");
  CREATE INDEX "_flash_ai_v_version_version_related_flash_idx" ON "_flash_ai_v" USING btree ("version_related_flash_id");
  CREATE INDEX "_flash_ai_v_version_version_editorial_status_idx" ON "_flash_ai_v" USING btree ("version_editorial_status");
  CREATE INDEX "_flash_ai_v_version_version_automation_decision_idx" ON "_flash_ai_v" USING btree ("version_automation_decision");
  CREATE INDEX "_flash_ai_v_version_version_event_fingerprint_idx" ON "_flash_ai_v" USING btree ("version_event_fingerprint");
  CREATE INDEX "_flash_ai_v_version_version_source_fingerprint_idx" ON "_flash_ai_v" USING btree ("version_source_fingerprint");
  CREATE INDEX "_flash_ai_v_version_version_updated_at_idx" ON "_flash_ai_v" USING btree ("version_updated_at");
  CREATE INDEX "_flash_ai_v_version_version_created_at_idx" ON "_flash_ai_v" USING btree ("version_created_at");
  CREATE INDEX "_flash_ai_v_version_version__status_idx" ON "_flash_ai_v" USING btree ("version__status");
  CREATE INDEX "_flash_ai_v_created_at_idx" ON "_flash_ai_v" USING btree ("created_at");
  CREATE INDEX "_flash_ai_v_updated_at_idx" ON "_flash_ai_v" USING btree ("updated_at");
  CREATE INDEX "_flash_ai_v_snapshot_idx" ON "_flash_ai_v" USING btree ("snapshot");
  CREATE INDEX "_flash_ai_v_published_locale_idx" ON "_flash_ai_v" USING btree ("published_locale");
  CREATE INDEX "_flash_ai_v_latest_idx" ON "_flash_ai_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_flash_ai_fk" FOREIGN KEY ("flash_ai_id") REFERENCES "public"."flash_ai"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_flash_ai_id_idx" ON "payload_locked_documents_rels" USING btree ("flash_ai_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "flash_ai_surse_flash" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flash_ai_disclaimer_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flash_ai_specialist_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "flash_ai" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_flash_ai_v_version_surse_flash" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_flash_ai_v_version_disclaimer_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_flash_ai_v_version_specialist_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_flash_ai_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "flash_ai_surse_flash" CASCADE;
  DROP TABLE "flash_ai_disclaimer_types" CASCADE;
  DROP TABLE "flash_ai_specialist_questions" CASCADE;
  DROP TABLE "flash_ai" CASCADE;
  DROP TABLE "_flash_ai_v_version_surse_flash" CASCADE;
  DROP TABLE "_flash_ai_v_version_disclaimer_types" CASCADE;
  DROP TABLE "_flash_ai_v_version_specialist_questions" CASCADE;
  DROP TABLE "_flash_ai_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_flash_ai_fk";

  DROP INDEX "payload_locked_documents_rels_flash_ai_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "flash_ai_id";
  DROP TYPE "public"."enum_flash_ai_disclaimer_types";
  DROP TYPE "public"."enum_flash_ai_limba";
  DROP TYPE "public"."enum_flash_ai_flash_type";
  DROP TYPE "public"."enum_flash_ai_information_status";
  DROP TYPE "public"."enum_flash_ai_risk_level";
  DROP TYPE "public"."enum_flash_ai_medical_evidence_type";
  DROP TYPE "public"."enum_flash_ai_clinical_validation_status";
  DROP TYPE "public"."enum_flash_ai_editorial_status";
  DROP TYPE "public"."enum_flash_ai_automation_decision";
  DROP TYPE "public"."enum_flash_ai_status";
  DROP TYPE "public"."enum__flash_ai_v_version_disclaimer_types";
  DROP TYPE "public"."enum__flash_ai_v_version_limba";
  DROP TYPE "public"."enum__flash_ai_v_version_flash_type";
  DROP TYPE "public"."enum__flash_ai_v_version_information_status";
  DROP TYPE "public"."enum__flash_ai_v_version_risk_level";
  DROP TYPE "public"."enum__flash_ai_v_version_medical_evidence_type";
  DROP TYPE "public"."enum__flash_ai_v_version_clinical_validation_status";
  DROP TYPE "public"."enum__flash_ai_v_version_editorial_status";
  DROP TYPE "public"."enum__flash_ai_v_version_automation_decision";
  DROP TYPE "public"."enum__flash_ai_v_version_status";
  DROP TYPE "public"."enum__flash_ai_v_published_locale";`)
}
