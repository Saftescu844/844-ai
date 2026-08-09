import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_navigation_primary_navigation_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum_site_settings_navigation_header_actions_action_type" AS ENUM('link', 'search', 'languageSwitcher', 'login');
  CREATE TYPE "public"."enum_site_settings_navigation_header_actions_style" AS ENUM('link', 'secondary', 'primary');
  CREATE TYPE "public"."enum_site_settings_language_settings_available_languages_code" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_site_settings_trust_bar_items_icon" AS ENUM('verified', 'sources', 'updated', 'transparent', 'independent', 'medicalReview');
  CREATE TYPE "public"."enum_site_settings_footer_footer_sections_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum_site_settings_social_links_platform" AS ENUM('facebook', 'linkedin', 'youtube', 'instagram', 'x', 'tiktok', 'github');
  CREATE TYPE "public"."enum_site_settings_language_settings_default_language" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_site_settings_metadata_twitter_card_type" AS ENUM('summary', 'summary_large_image');
  CREATE TYPE "public"."enum_site_settings_metadata_robots_default" AS ENUM('indexFollow', 'noindexNofollow');
  CREATE TABLE "site_settings_navigation_primary_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_site_settings_navigation_primary_navigation_link_type" DEFAULT 'internal' NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false,
  	"show_in_desktop" boolean DEFAULT true,
  	"show_in_mobile" boolean DEFAULT true,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "site_settings_navigation_primary_navigation_locales" (
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_navigation_header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"action_type" "enum_site_settings_navigation_header_actions_action_type" DEFAULT 'link' NOT NULL,
  	"style" "enum_site_settings_navigation_header_actions_style" DEFAULT 'link' NOT NULL,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "site_settings_navigation_header_actions_locales" (
  	"label" varchar NOT NULL,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_language_settings_available_languages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" "enum_site_settings_language_settings_available_languages_code" NOT NULL,
  	"label" varchar NOT NULL,
  	"short_label" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_trust_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_site_settings_trust_bar_items_icon",
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_trust_bar_items_locales" (
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_methodology_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_methodology_principles_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_footer_sections_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_site_settings_footer_footer_sections_links_link_type" DEFAULT 'internal' NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_footer_sections_links_locales" (
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_footer_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_footer_sections_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "site_settings_legal_links_locales" (
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"identity_logo_primary_id" integer,
  	"identity_logo_alternative_id" integer,
  	"identity_favicon_id" integer,
  	"language_settings_default_language" "enum_site_settings_language_settings_default_language" DEFAULT 'ro' NOT NULL,
  	"language_settings_show_language_switcher" boolean DEFAULT true,
  	"trust_bar_enabled" boolean DEFAULT true,
  	"methodology_enabled" boolean DEFAULT true,
  	"newsletter_enabled" boolean DEFAULT true,
  	"footer_footer_enabled" boolean DEFAULT true,
  	"contact_enabled" boolean DEFAULT true,
  	"contact_public_email" varchar,
  	"contact_phone" varchar,
  	"metadata_default_share_image_id" integer,
  	"metadata_site_author" varchar,
  	"metadata_publisher_name" varchar,
  	"metadata_twitter_card_type" "enum_site_settings_metadata_twitter_card_type" DEFAULT 'summary_large_image' NOT NULL,
  	"metadata_robots_default" "enum_site_settings_metadata_robots_default" DEFAULT 'indexFollow' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"identity_site_name" varchar NOT NULL,
  	"identity_short_name" varchar NOT NULL,
  	"identity_tagline" varchar,
  	"trust_bar_methodology_label" varchar,
  	"trust_bar_methodology_href" varchar,
  	"methodology_title" varchar,
  	"methodology_summary" varchar,
  	"methodology_page_label" varchar,
  	"methodology_page_href" varchar,
  	"newsletter_title" varchar,
  	"newsletter_description" varchar,
  	"newsletter_email_label" varchar,
  	"newsletter_email_placeholder" varchar,
  	"newsletter_submit_label" varchar,
  	"newsletter_consent_text" varchar,
  	"newsletter_success_message" varchar,
  	"newsletter_already_subscribed_message" varchar,
  	"newsletter_invalid_email_message" varchar,
  	"newsletter_generic_error_message" varchar,
  	"newsletter_privacy_label" varchar,
  	"newsletter_privacy_href" varchar,
  	"footer_footer_intro" varchar,
  	"footer_copyright_text" varchar,
  	"contact_contact_title" varchar,
  	"contact_address" varchar,
  	"contact_contact_page_label" varchar,
  	"contact_contact_page_href" varchar,
  	"editorial_defaults_read_more_label" varchar,
  	"editorial_defaults_latest_articles_label" varchar,
  	"editorial_defaults_view_all_label" varchar,
  	"editorial_defaults_updated_label" varchar,
  	"editorial_defaults_verified_label" varchar,
  	"editorial_defaults_reading_time_label" varchar,
  	"editorial_defaults_source_label" varchar,
  	"editorial_defaults_corrections_label" varchar,
  	"editorial_defaults_sponsored_label" varchar,
  	"editorial_defaults_ai_disclosure_label" varchar,
  	"accessibility_skip_to_content_label" varchar,
  	"accessibility_open_menu_label" varchar,
  	"accessibility_close_menu_label" varchar,
  	"accessibility_search_label" varchar,
  	"accessibility_language_switcher_label" varchar,
  	"accessibility_external_link_label" varchar,
  	"accessibility_previous_page_label" varchar,
  	"accessibility_next_page_label" varchar,
  	"accessibility_loading_label" varchar,
  	"accessibility_error_label" varchar,
  	"metadata_default_meta_title" varchar,
  	"metadata_default_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "site_settings_navigation_primary_navigation" ADD CONSTRAINT "site_settings_navigation_primary_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_navigation_primary_navigation_locales" ADD CONSTRAINT "site_settings_navigation_primary_navigation_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_navigation_primary_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_navigation_header_actions" ADD CONSTRAINT "site_settings_navigation_header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_navigation_header_actions_locales" ADD CONSTRAINT "site_settings_navigation_header_actions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_navigation_header_actions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_language_settings_available_languages" ADD CONSTRAINT "site_settings_language_settings_available_languages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_trust_bar_items" ADD CONSTRAINT "site_settings_trust_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_trust_bar_items_locales" ADD CONSTRAINT "site_settings_trust_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_trust_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_methodology_principles" ADD CONSTRAINT "site_settings_methodology_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_methodology_principles_locales" ADD CONSTRAINT "site_settings_methodology_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_methodology_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_footer_sections_links" ADD CONSTRAINT "site_settings_footer_footer_sections_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_footer_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_footer_sections_links_locales" ADD CONSTRAINT "site_settings_footer_footer_sections_links_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_footer_sections_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_footer_sections" ADD CONSTRAINT "site_settings_footer_footer_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_footer_sections_locales" ADD CONSTRAINT "site_settings_footer_footer_sections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_footer_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links_locales" ADD CONSTRAINT "site_settings_social_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_social_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_legal_links" ADD CONSTRAINT "site_settings_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_legal_links_locales" ADD CONSTRAINT "site_settings_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_identity_logo_primary_id_media_id_fk" FOREIGN KEY ("identity_logo_primary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_identity_logo_alternative_id_media_id_fk" FOREIGN KEY ("identity_logo_alternative_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_identity_favicon_id_media_id_fk" FOREIGN KEY ("identity_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_metadata_default_share_image_id_media_id_fk" FOREIGN KEY ("metadata_default_share_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_navigation_primary_navigation_order_idx" ON "site_settings_navigation_primary_navigation" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_primary_navigation_parent_id_idx" ON "site_settings_navigation_primary_navigation" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_navigation_primary_navigation_locales_locale_p" ON "site_settings_navigation_primary_navigation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_navigation_header_actions_order_idx" ON "site_settings_navigation_header_actions" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_header_actions_parent_id_idx" ON "site_settings_navigation_header_actions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_navigation_header_actions_locales_locale_paren" ON "site_settings_navigation_header_actions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_language_settings_available_languages_order_idx" ON "site_settings_language_settings_available_languages" USING btree ("_order");
  CREATE INDEX "site_settings_language_settings_available_languages_parent_id_idx" ON "site_settings_language_settings_available_languages" USING btree ("_parent_id");
  CREATE INDEX "site_settings_trust_bar_items_order_idx" ON "site_settings_trust_bar_items" USING btree ("_order");
  CREATE INDEX "site_settings_trust_bar_items_parent_id_idx" ON "site_settings_trust_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_trust_bar_items_locales_locale_parent_id_uniqu" ON "site_settings_trust_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_methodology_principles_order_idx" ON "site_settings_methodology_principles" USING btree ("_order");
  CREATE INDEX "site_settings_methodology_principles_parent_id_idx" ON "site_settings_methodology_principles" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_methodology_principles_locales_locale_parent_i" ON "site_settings_methodology_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_footer_sections_links_order_idx" ON "site_settings_footer_footer_sections_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_footer_sections_links_parent_id_idx" ON "site_settings_footer_footer_sections_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_footer_footer_sections_links_locales_locale_pa" ON "site_settings_footer_footer_sections_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_footer_sections_order_idx" ON "site_settings_footer_footer_sections" USING btree ("_order");
  CREATE INDEX "site_settings_footer_footer_sections_parent_id_idx" ON "site_settings_footer_footer_sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_footer_footer_sections_locales_locale_parent_i" ON "site_settings_footer_footer_sections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_social_links_locales_locale_parent_id_unique" ON "site_settings_social_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_legal_links_order_idx" ON "site_settings_legal_links" USING btree ("_order");
  CREATE INDEX "site_settings_legal_links_parent_id_idx" ON "site_settings_legal_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_legal_links_locales_locale_parent_id_unique" ON "site_settings_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_identity_identity_logo_primary_idx" ON "site_settings" USING btree ("identity_logo_primary_id");
  CREATE INDEX "site_settings_identity_identity_logo_alternative_idx" ON "site_settings" USING btree ("identity_logo_alternative_id");
  CREATE INDEX "site_settings_identity_identity_favicon_idx" ON "site_settings" USING btree ("identity_favicon_id");
  CREATE INDEX "site_settings_metadata_metadata_default_share_image_idx" ON "site_settings" USING btree ("metadata_default_share_image_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_navigation_primary_navigation" CASCADE;
  DROP TABLE "site_settings_navigation_primary_navigation_locales" CASCADE;
  DROP TABLE "site_settings_navigation_header_actions" CASCADE;
  DROP TABLE "site_settings_navigation_header_actions_locales" CASCADE;
  DROP TABLE "site_settings_language_settings_available_languages" CASCADE;
  DROP TABLE "site_settings_trust_bar_items" CASCADE;
  DROP TABLE "site_settings_trust_bar_items_locales" CASCADE;
  DROP TABLE "site_settings_methodology_principles" CASCADE;
  DROP TABLE "site_settings_methodology_principles_locales" CASCADE;
  DROP TABLE "site_settings_footer_footer_sections_links" CASCADE;
  DROP TABLE "site_settings_footer_footer_sections_links_locales" CASCADE;
  DROP TABLE "site_settings_footer_footer_sections" CASCADE;
  DROP TABLE "site_settings_footer_footer_sections_locales" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings_social_links_locales" CASCADE;
  DROP TABLE "site_settings_legal_links" CASCADE;
  DROP TABLE "site_settings_legal_links_locales" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TYPE "public"."enum_site_settings_navigation_primary_navigation_link_type";
  DROP TYPE "public"."enum_site_settings_navigation_header_actions_action_type";
  DROP TYPE "public"."enum_site_settings_navigation_header_actions_style";
  DROP TYPE "public"."enum_site_settings_language_settings_available_languages_code";
  DROP TYPE "public"."enum_site_settings_trust_bar_items_icon";
  DROP TYPE "public"."enum_site_settings_footer_footer_sections_links_link_type";
  DROP TYPE "public"."enum_site_settings_social_links_platform";
  DROP TYPE "public"."enum_site_settings_language_settings_default_language";
  DROP TYPE "public"."enum_site_settings_metadata_twitter_card_type";
  DROP TYPE "public"."enum_site_settings_metadata_robots_default";`)
}
