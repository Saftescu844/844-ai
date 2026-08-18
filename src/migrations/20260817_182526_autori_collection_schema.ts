import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_autori_editorial_roles" AS ENUM('author', 'coauthor', 'editorialReviewer', 'medicalReviewer', 'technicalReviewer', 'toolEvaluator', 'courseAuthor', 'instructor', 'contentCurator', 'externalExpert');
  CREATE TYPE "public"."enum_autori_contribution_types" AS ENUM('articles', 'flashAI', 'courses', 'roadmaps', 'toolReviews', 'euCalls', 'medicalContent', 'editorialReview');
  CREATE TYPE "public"."enum_autori_credentials_credential_type" AS ENUM('academicDegree', 'professionalTitle', 'medicalLicense', 'certification', 'training', 'membership', 'other');
  CREATE TYPE "public"."enum_autori_professional_identifiers_type" AS ENUM('orcid', 'researcherId', 'professionalRegistry', 'medicalRegistry', 'institutionalProfile', 'other');
  CREATE TYPE "public"."enum_autori_social_links_platform" AS ENUM('linkedin', 'github', 'youtube', 'x', 'facebook', 'instagram', 'researchGate', 'googleScholar', 'other');
  CREATE TYPE "public"."enum_autori_affiliations_and_sponsorships_relationship_type" AS ENUM('employment', 'consulting', 'researchFunding', 'sponsorship', 'partnership', 'advisoryRole', 'ownership', 'speakerFee', 'other');
  CREATE TYPE "public"."enum_autori_verification_status" AS ENUM('pending', 'partiallyVerified', 'verified', 'expired', 'rejected');
  CREATE TYPE "public"."enum_autori_status" AS ENUM('draft', 'pendingVerification', 'verified', 'published', 'inactive', 'archived');
  CREATE TYPE "public"."enum_autori_robots" AS ENUM('indexFollow', 'noindexFollow', 'noindexNofollow');
  CREATE TABLE "autori_editorial_roles" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_autori_editorial_roles",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "autori_expertise_areas" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "verified" boolean DEFAULT false,
    "order" numeric
  );

  CREATE TABLE "autori_expertise_areas_locales" (
    "name" varchar NOT NULL,
    "description" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" varchar NOT NULL
  );

  CREATE TABLE "autori_specialties" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar NOT NULL,
    "description" varchar,
    "order" numeric
  );

  CREATE TABLE "autori_contribution_types" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_autori_contribution_types",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "autori_credentials" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "credential_type" "enum_autori_credentials_credential_type" NOT NULL,
    "institution" varchar,
    "country" varchar,
    "year_obtained" numeric,
    "year_expires" numeric,
    "identifier" varchar,
    "verification_url" varchar,
    "publicly_visible" boolean DEFAULT false,
    "verified" boolean DEFAULT false,
    "verified_at" timestamp(3) with time zone,
    "order" numeric
  );

  CREATE TABLE "autori_credentials_locales" (
    "title" varchar NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" varchar NOT NULL
  );

  CREATE TABLE "autori_professional_identifiers" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "type" "enum_autori_professional_identifiers_type",
    "value" varchar NOT NULL,
    "publicly_visible" boolean DEFAULT false,
    "verification_url" varchar,
    "verified" boolean DEFAULT false
  );

  CREATE TABLE "autori_social_links" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "platform" "enum_autori_social_links_platform" NOT NULL,
    "url" varchar NOT NULL,
    "enabled" boolean DEFAULT true,
    "order" numeric
  );

  CREATE TABLE "autori_social_links_locales" (
    "label" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" varchar NOT NULL
  );

  CREATE TABLE "autori_affiliations_and_sponsorships" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "organization" varchar NOT NULL,
    "relationship_type" "enum_autori_affiliations_and_sponsorships_relationship_type" NOT NULL,
    "start_date" timestamp(3) with time zone,
    "end_date" timestamp(3) with time zone,
    "currently_active" boolean DEFAULT false,
    "publicly_visible" boolean DEFAULT true,
    "verified" boolean DEFAULT false
  );

  CREATE TABLE "autori_affiliations_and_sponsorships_locales" (
    "description" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" varchar NOT NULL
  );

  CREATE TABLE "autori" (
    "id" serial PRIMARY KEY NOT NULL,
    "full_name" varchar NOT NULL,
    "slug" varchar NOT NULL,
    "profile_image_id" integer,
    "display_order" numeric DEFAULT 100,
    "is_medical_reviewer" boolean DEFAULT false,
    "verification_status" "enum_autori_verification_status" DEFAULT 'pending' NOT NULL,
    "verified_at" timestamp(3) with time zone,
    "verified_by_id" integer,
    "verification_source" varchar,
    "next_verification_due" timestamp(3) with time zone,
    "verification_notes" varchar,
    "documents_reviewed" boolean DEFAULT false,
    "public_email" varchar,
    "website" varchar,
    "institutional_profile" varchar,
    "orcid_url" varchar,
    "publication_consent" boolean DEFAULT false,
    "consent_confirmed_at" timestamp(3) with time zone,
    "consent_confirmed_by_id" integer,
    "consent_scope" varchar,
    "profile_image_consent" boolean DEFAULT false,
    "public_contact_consent" boolean DEFAULT false,
    "consent_withdrawn_at" timestamp(3) with time zone,
    "consent_notes" varchar,
    "status" "enum_autori_status" DEFAULT 'draft' NOT NULL,
    "published_at" timestamp(3) with time zone,
    "last_reviewed_at" timestamp(3) with time zone,
    "next_review_due" timestamp(3) with time zone,
    "inactive_at" timestamp(3) with time zone,
    "archived_at" timestamp(3) with time zone,
    "reviewed_by_id" integer,
    "archival_reason" varchar,
    "linked_user_id" integer,
    "social_image_id" integer,
    "robots" "enum_autori_robots" DEFAULT 'indexFollow' NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "autori_locales" (
    "public_title" varchar,
    "primary_affiliation" varchar,
    "short_bio" varchar,
    "biography" jsonb,
    "platform_role_description" varchar,
    "public_location" varchar,
    "medical_review_scope" varchar,
    "conflict_of_interest_statement" varchar,
    "ai_use_disclosure" varchar,
    "meta_title" varchar,
    "meta_description" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" integer NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "autori_id" integer;
  ALTER TABLE "autori_editorial_roles" ADD CONSTRAINT "autori_editorial_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_expertise_areas" ADD CONSTRAINT "autori_expertise_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_expertise_areas_locales" ADD CONSTRAINT "autori_expertise_areas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori_expertise_areas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_specialties" ADD CONSTRAINT "autori_specialties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_contribution_types" ADD CONSTRAINT "autori_contribution_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_credentials" ADD CONSTRAINT "autori_credentials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_credentials_locales" ADD CONSTRAINT "autori_credentials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori_credentials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_professional_identifiers" ADD CONSTRAINT "autori_professional_identifiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_social_links" ADD CONSTRAINT "autori_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_social_links_locales" ADD CONSTRAINT "autori_social_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori_social_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_affiliations_and_sponsorships" ADD CONSTRAINT "autori_affiliations_and_sponsorships_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori_affiliations_and_sponsorships_locales" ADD CONSTRAINT "autori_affiliations_and_sponsorships_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori_affiliations_and_sponsorships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autori" ADD CONSTRAINT "autori_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autori" ADD CONSTRAINT "autori_verified_by_id_useri_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."useri"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autori" ADD CONSTRAINT "autori_consent_confirmed_by_id_useri_id_fk" FOREIGN KEY ("consent_confirmed_by_id") REFERENCES "public"."useri"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autori" ADD CONSTRAINT "autori_reviewed_by_id_useri_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."useri"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autori" ADD CONSTRAINT "autori_linked_user_id_useri_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."useri"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autori" ADD CONSTRAINT "autori_social_image_id_media_id_fk" FOREIGN KEY ("social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autori_locales" ADD CONSTRAINT "autori_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "autori_editorial_roles_order_idx" ON "autori_editorial_roles" USING btree ("order");
  CREATE INDEX "autori_editorial_roles_parent_idx" ON "autori_editorial_roles" USING btree ("parent_id");
  CREATE INDEX "autori_expertise_areas_order_idx" ON "autori_expertise_areas" USING btree ("_order");
  CREATE INDEX "autori_expertise_areas_parent_id_idx" ON "autori_expertise_areas" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "autori_expertise_areas_locales_locale_parent_id_unique" ON "autori_expertise_areas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "autori_specialties_order_idx" ON "autori_specialties" USING btree ("_order");
  CREATE INDEX "autori_specialties_parent_id_idx" ON "autori_specialties" USING btree ("_parent_id");
  CREATE INDEX "autori_specialties_locale_idx" ON "autori_specialties" USING btree ("_locale");
  CREATE INDEX "autori_contribution_types_order_idx" ON "autori_contribution_types" USING btree ("order");
  CREATE INDEX "autori_contribution_types_parent_idx" ON "autori_contribution_types" USING btree ("parent_id");
  CREATE INDEX "autori_credentials_order_idx" ON "autori_credentials" USING btree ("_order");
  CREATE INDEX "autori_credentials_parent_id_idx" ON "autori_credentials" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "autori_credentials_locales_locale_parent_id_unique" ON "autori_credentials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "autori_professional_identifiers_order_idx" ON "autori_professional_identifiers" USING btree ("_order");
  CREATE INDEX "autori_professional_identifiers_parent_id_idx" ON "autori_professional_identifiers" USING btree ("_parent_id");
  CREATE INDEX "autori_social_links_order_idx" ON "autori_social_links" USING btree ("_order");
  CREATE INDEX "autori_social_links_parent_id_idx" ON "autori_social_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "autori_social_links_locales_locale_parent_id_unique" ON "autori_social_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "autori_affiliations_and_sponsorships_order_idx" ON "autori_affiliations_and_sponsorships" USING btree ("_order");
  CREATE INDEX "autori_affiliations_and_sponsorships_parent_id_idx" ON "autori_affiliations_and_sponsorships" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "autori_affiliations_and_sponsorships_locales_locale_parent_i" ON "autori_affiliations_and_sponsorships_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "autori_full_name_idx" ON "autori" USING btree ("full_name");
  CREATE UNIQUE INDEX "autori_slug_idx" ON "autori" USING btree ("slug");
  CREATE INDEX "autori_profile_image_idx" ON "autori" USING btree ("profile_image_id");
  CREATE INDEX "autori_verified_by_idx" ON "autori" USING btree ("verified_by_id");
  CREATE INDEX "autori_consent_confirmed_by_idx" ON "autori" USING btree ("consent_confirmed_by_id");
  CREATE INDEX "autori_status_idx" ON "autori" USING btree ("status");
  CREATE INDEX "autori_reviewed_by_idx" ON "autori" USING btree ("reviewed_by_id");
  CREATE INDEX "autori_linked_user_idx" ON "autori" USING btree ("linked_user_id");
  CREATE INDEX "autori_social_image_idx" ON "autori" USING btree ("social_image_id");
  CREATE INDEX "autori_updated_at_idx" ON "autori" USING btree ("updated_at");
  CREATE INDEX "autori_created_at_idx" ON "autori" USING btree ("created_at");
  CREATE UNIQUE INDEX "autori_locales_locale_parent_id_unique" ON "autori_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_autori_fk" FOREIGN KEY ("autori_id") REFERENCES "public"."autori"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_autori_id_idx" ON "payload_locked_documents_rels" USING btree ("autori_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "autori_editorial_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_expertise_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_expertise_areas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_specialties" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_contribution_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_credentials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_credentials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_professional_identifiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_social_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_social_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_affiliations_and_sponsorships" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_affiliations_and_sponsorships_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autori_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_autori_fk";
  DROP INDEX "payload_locked_documents_rels_autori_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "autori_id";

  DROP TABLE "autori_editorial_roles" CASCADE;
  DROP TABLE "autori_expertise_areas" CASCADE;
  DROP TABLE "autori_expertise_areas_locales" CASCADE;
  DROP TABLE "autori_specialties" CASCADE;
  DROP TABLE "autori_contribution_types" CASCADE;
  DROP TABLE "autori_credentials" CASCADE;
  DROP TABLE "autori_credentials_locales" CASCADE;
  DROP TABLE "autori_professional_identifiers" CASCADE;
  DROP TABLE "autori_social_links" CASCADE;
  DROP TABLE "autori_social_links_locales" CASCADE;
  DROP TABLE "autori_affiliations_and_sponsorships" CASCADE;
  DROP TABLE "autori_affiliations_and_sponsorships_locales" CASCADE;
  DROP TABLE "autori" CASCADE;
  DROP TABLE "autori_locales" CASCADE;
  DROP TYPE "public"."enum_autori_editorial_roles";
  DROP TYPE "public"."enum_autori_contribution_types";
  DROP TYPE "public"."enum_autori_credentials_credential_type";
  DROP TYPE "public"."enum_autori_professional_identifiers_type";
  DROP TYPE "public"."enum_autori_social_links_platform";
  DROP TYPE "public"."enum_autori_affiliations_and_sponsorships_relationship_type";
  DROP TYPE "public"."enum_autori_verification_status";
  DROP TYPE "public"."enum_autori_status";
  DROP TYPE "public"."enum_autori_robots";`)
}
