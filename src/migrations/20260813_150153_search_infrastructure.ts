import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_search_language" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_search_publication_status" AS ENUM('draft', 'review', 'published', 'blocked');
  CREATE TYPE "public"."enum_search_article_type" AS ENUM('stire-auto', 'analiza', 'frontiera', 'ghid');
  CREATE TABLE "search" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "priority" numeric,
    "excerpt" varchar,
    "keywords" varchar,
    "url" varchar,
    "language" "enum_search_language",
    "publication_status" "enum_search_publication_status",
    "article_type" "enum_search_article_type",
    "published_at" timestamp(3) with time zone,
    "is_public" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "search_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "articole_id" integer
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "search_id" integer;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_articole_fk" FOREIGN KEY ("articole_id") REFERENCES "public"."articole"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "search_language_idx" ON "search" USING btree ("language");
  CREATE INDEX "search_publication_status_idx" ON "search" USING btree ("publication_status");
  CREATE INDEX "search_article_type_idx" ON "search" USING btree ("article_type");
  CREATE INDEX "search_published_at_idx" ON "search" USING btree ("published_at");
  CREATE INDEX "search_is_public_idx" ON "search" USING btree ("is_public");
  CREATE INDEX "search_updated_at_idx" ON "search" USING btree ("updated_at");
  CREATE INDEX "search_created_at_idx" ON "search" USING btree ("created_at");
  CREATE INDEX "search_rels_order_idx" ON "search_rels" USING btree ("order");
  CREATE INDEX "search_rels_parent_idx" ON "search_rels" USING btree ("parent_id");
  CREATE INDEX "search_rels_path_idx" ON "search_rels" USING btree ("path");
  CREATE INDEX "search_rels_articole_id_idx" ON "search_rels" USING btree ("articole_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_search_id_idx" ON "payload_locked_documents_rels" USING btree ("search_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "search" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "search_rels" DISABLE ROW LEVEL SECURITY;

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_search_fk";
  DROP INDEX "payload_locked_documents_rels_search_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "search_id";

  DROP TABLE "search_rels" CASCADE;
  DROP TABLE "search" CASCADE;

  DROP TYPE "public"."enum_search_language";
  DROP TYPE "public"."enum_search_publication_status";
  DROP TYPE "public"."enum_search_article_type";`)
}
