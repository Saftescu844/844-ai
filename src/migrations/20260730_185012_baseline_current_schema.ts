import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_articole_limba" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_articole_subcategorie" AS ENUM('diagnostic', 'medicamente', 'asistenta-clinica', 'reglementare', 'pacienti');
  CREATE TYPE "public"."enum_articole_subcategorie_educatie" AS ENUM('invatare-ai', 'institutii', 'instrumente-edu', 'cercetare', 'cariere');
  CREATE TYPE "public"."enum_articole_tip" AS ENUM('stire-auto', 'analiza', 'frontiera', 'ghid');
  CREATE TYPE "public"."enum_articole_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articole_v_version_limba" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum__articole_v_version_subcategorie" AS ENUM('diagnostic', 'medicamente', 'asistenta-clinica', 'reglementare', 'pacienti');
  CREATE TYPE "public"."enum__articole_v_version_subcategorie_educatie" AS ENUM('invatare-ai', 'institutii', 'instrumente-edu', 'cercetare', 'cariere');
  CREATE TYPE "public"."enum__articole_v_version_tip" AS ENUM('stire-auto', 'analiza', 'frontiera', 'ghid');
  CREATE TYPE "public"."enum__articole_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articole_v_published_locale" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_surse_nivel_incredere" AS ENUM('primar', 'secundar', 'speculativ');
  CREATE TYPE "public"."enum_surse_tip_citare_permis" AS ENUM('citat-scurt', 'parafrazare', 'frontiera');
  CREATE TYPE "public"."enum_surse_regiune" AS ENUM('global', 'europa', 'romania');
  CREATE TYPE "public"."enum_categorii_pilon" AS ENUM('stiri', 'sanatate', 'educatie', 'tools', 'afaceri');
  CREATE TYPE "public"."enum_useri_rol" AS ENUM('cititor', 'contributor', 'editor', 'admin');
  CREATE TYPE "public"."enum_useri_nivel_abonament" AS ENUM('gratuit', 'premium', 'complet');
  CREATE TYPE "public"."enum_useri_limba_preferata" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_comentarii_status" AS ENUM('asteptare', 'aprobat', 'respins');
  CREATE TYPE "public"."enum_tooluri_categorie_tool" AS ENUM('text', 'imagine', 'video', 'cod', 'audio', 'productivitate', 'cercetare');
  CREATE TYPE "public"."enum_tooluri_pret" AS ENUM('gratuit', 'freemium', 'platit');
  CREATE TYPE "public"."enum_roadmaps_nivel" AS ENUM('incepator', 'intermediar', 'avansat');
  CREATE TYPE "public"."enum_callouri_ue_program" AS ENUM('eic-accelerator', 'eic-pre', 'genai4eu', 'horizon', 'digital-europe', 'altele');
  CREATE TYPE "public"."enum_newsletter_segment" AS ENUM('general', 'profesionisti', 'studenti', 'callouri');
  CREATE TYPE "public"."enum_newsletter_limba" AS ENUM('ro', 'en');
  CREATE TYPE "public"."enum_media_sursa_imagine" AS ENUM('pexels', 'pixabay', 'unsplash', 'proprie');
  CREATE TABLE "articole_galerie" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagine_id" integer,
  	"caption" varchar,
  	"credit" varchar
  );
  
  CREATE TABLE "articole_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "articole" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titlu" varchar,
  	"slug" varchar,
  	"limba" "enum_articole_limba" DEFAULT 'ro',
  	"versiune_alternativa_id" integer,
  	"continut_hash_tradus" varchar,
  	"necesita_retraducere" boolean DEFAULT false,
  	"pilon_id" integer,
  	"subcategorie" "enum_articole_subcategorie",
  	"subcategorie_educatie" "enum_articole_subcategorie_educatie",
  	"tip" "enum_articole_tip" DEFAULT 'stire-auto',
  	"excerpt" varchar,
  	"continut" jsonb,
  	"imagine_principala_id" integer,
  	"video_titlu" varchar,
  	"video_url" varchar,
  	"sursa_nume" varchar,
  	"sursa_link" varchar,
  	"producator" varchar,
  	"link_producator" varchar,
  	"status" "enum_articole_status" DEFAULT 'draft',
  	"este_breaking" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"cluster_hash" varchar,
  	"unghi" varchar,
  	"generat_automat" boolean DEFAULT false,
  	"corectat_compliance" boolean DEFAULT false,
  	"numar_confirmari" numeric DEFAULT 0,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articole_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articole_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"surse_id" integer
  );
  
  CREATE TABLE "_articole_v_version_galerie" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"imagine_id" integer,
  	"caption" varchar,
  	"credit" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articole_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articole_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titlu" varchar,
  	"version_slug" varchar,
  	"version_limba" "enum__articole_v_version_limba" DEFAULT 'ro',
  	"version_versiune_alternativa_id" integer,
  	"version_continut_hash_tradus" varchar,
  	"version_necesita_retraducere" boolean DEFAULT false,
  	"version_pilon_id" integer,
  	"version_subcategorie" "enum__articole_v_version_subcategorie",
  	"version_subcategorie_educatie" "enum__articole_v_version_subcategorie_educatie",
  	"version_tip" "enum__articole_v_version_tip" DEFAULT 'stire-auto',
  	"version_excerpt" varchar,
  	"version_continut" jsonb,
  	"version_imagine_principala_id" integer,
  	"version_video_titlu" varchar,
  	"version_video_url" varchar,
  	"version_sursa_nume" varchar,
  	"version_sursa_link" varchar,
  	"version_producator" varchar,
  	"version_link_producator" varchar,
  	"version_status" "enum__articole_v_version_status" DEFAULT 'draft',
  	"version_este_breaking" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_cluster_hash" varchar,
  	"version_unghi" varchar,
  	"version_generat_automat" boolean DEFAULT false,
  	"version_corectat_compliance" boolean DEFAULT false,
  	"version_numar_confirmari" numeric DEFAULT 0,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articole_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articole_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_articole_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"surse_id" integer
  );
  
  CREATE TABLE "surse" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nume" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"nivel_incredere" "enum_surse_nivel_incredere" DEFAULT 'secundar' NOT NULL,
  	"tip_citare_permis" "enum_surse_tip_citare_permis" DEFAULT 'parafrazare' NOT NULL,
  	"permite_auto_generare" boolean DEFAULT true,
  	"feed_r_s_s" varchar,
  	"regiune" "enum_surse_regiune" DEFAULT 'global',
  	"activa" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "surse_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorii_id" integer
  );
  
  CREATE TABLE "categorii" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nume" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"pilon" "enum_categorii_pilon" NOT NULL,
  	"descriere" varchar,
  	"necesita_disclaimer" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "useri_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "useri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nume" varchar,
  	"rol" "enum_useri_rol" DEFAULT 'cititor' NOT NULL,
  	"nivel_abonament" "enum_useri_nivel_abonament" DEFAULT 'gratuit',
  	"stripe_customer_id" varchar,
  	"stripe_subscription_id" varchar,
  	"abonament_expira" timestamp(3) with time zone,
  	"limba_preferata" "enum_useri_limba_preferata" DEFAULT 'ro',
  	"abonat_newsletter" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "comentarii" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"continut" varchar NOT NULL,
  	"autor_id" integer NOT NULL,
  	"articol_id" integer NOT NULL,
  	"status" "enum_comentarii_status" DEFAULT 'asteptare' NOT NULL,
  	"raspuns_la_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tooluri_categorie_tool" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tooluri_categorie_tool",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tooluri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nume" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"website" varchar NOT NULL,
  	"link_afiliat" varchar,
  	"logo_id" integer,
  	"scor" numeric,
  	"pret" "enum_tooluri_pret",
  	"verificat_la" timestamp(3) with time zone,
  	"activ" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tooluri_locales" (
  	"descriere" varchar,
  	"recenzie" jsonb,
  	"studiu_de_caz" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "roadmaps_pasi_resurse" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titlu" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "roadmaps_pasi" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titlu" varchar NOT NULL,
  	"descriere" jsonb
  );
  
  CREATE TABLE "roadmaps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"nivel" "enum_roadmaps_nivel",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "roadmaps_locales" (
  	"titlu" varchar NOT NULL,
  	"descriere" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cursuri_lectii" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titlu" varchar NOT NULL,
  	"continut" jsonb,
  	"video_u_r_l" varchar,
  	"durata_minute" numeric
  );
  
  CREATE TABLE "cursuri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"imagine_id" integer,
  	"gratuit" boolean DEFAULT false,
  	"pret_stripe" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cursuri_locales" (
  	"titlu" varchar NOT NULL,
  	"descriere" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "callouri_ue" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titlu" varchar NOT NULL,
  	"program" "enum_callouri_ue_program",
  	"descriere" jsonb,
  	"finantare_max" varchar,
  	"deadline" timestamp(3) with time zone,
  	"eligibil_romania" boolean DEFAULT true,
  	"link_oficial" varchar NOT NULL,
  	"activ" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "callouri_ue_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorii_id" integer
  );
  
  CREATE TABLE "newsletter_segment" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_newsletter_segment",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "newsletter" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"limba" "enum_newsletter_limba" DEFAULT 'ro',
  	"confirmat" boolean DEFAULT false,
  	"user_asociat_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hash_m_d5" varchar,
  	"sursa_imagine" "enum_media_sursa_imagine",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articole_id" integer,
  	"surse_id" integer,
  	"categorii_id" integer,
  	"useri_id" integer,
  	"comentarii_id" integer,
  	"tooluri_id" integer,
  	"roadmaps_id" integer,
  	"cursuri_id" integer,
  	"callouri_ue_id" integer,
  	"newsletter_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"useri_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "articole_galerie" ADD CONSTRAINT "articole_galerie_imagine_id_media_id_fk" FOREIGN KEY ("imagine_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole_galerie" ADD CONSTRAINT "articole_galerie_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articole"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articole_tags" ADD CONSTRAINT "articole_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articole"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articole" ADD CONSTRAINT "articole_versiune_alternativa_id_articole_id_fk" FOREIGN KEY ("versiune_alternativa_id") REFERENCES "public"."articole"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole" ADD CONSTRAINT "articole_pilon_id_categorii_id_fk" FOREIGN KEY ("pilon_id") REFERENCES "public"."categorii"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole" ADD CONSTRAINT "articole_imagine_principala_id_media_id_fk" FOREIGN KEY ("imagine_principala_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articole_rels" ADD CONSTRAINT "articole_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articole"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articole_rels" ADD CONSTRAINT "articole_rels_surse_fk" FOREIGN KEY ("surse_id") REFERENCES "public"."surse"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articole_v_version_galerie" ADD CONSTRAINT "_articole_v_version_galerie_imagine_id_media_id_fk" FOREIGN KEY ("imagine_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v_version_galerie" ADD CONSTRAINT "_articole_v_version_galerie_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articole_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articole_v_version_tags" ADD CONSTRAINT "_articole_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articole_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_parent_id_articole_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articole"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_version_versiune_alternativa_id_articole_id_fk" FOREIGN KEY ("version_versiune_alternativa_id") REFERENCES "public"."articole"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_version_pilon_id_categorii_id_fk" FOREIGN KEY ("version_pilon_id") REFERENCES "public"."categorii"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v" ADD CONSTRAINT "_articole_v_version_imagine_principala_id_media_id_fk" FOREIGN KEY ("version_imagine_principala_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articole_v_rels" ADD CONSTRAINT "_articole_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articole_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articole_v_rels" ADD CONSTRAINT "_articole_v_rels_surse_fk" FOREIGN KEY ("surse_id") REFERENCES "public"."surse"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "surse_rels" ADD CONSTRAINT "surse_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."surse"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "surse_rels" ADD CONSTRAINT "surse_rels_categorii_fk" FOREIGN KEY ("categorii_id") REFERENCES "public"."categorii"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "useri_sessions" ADD CONSTRAINT "useri_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."useri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comentarii" ADD CONSTRAINT "comentarii_autor_id_useri_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."useri"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comentarii" ADD CONSTRAINT "comentarii_articol_id_articole_id_fk" FOREIGN KEY ("articol_id") REFERENCES "public"."articole"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comentarii" ADD CONSTRAINT "comentarii_raspuns_la_id_comentarii_id_fk" FOREIGN KEY ("raspuns_la_id") REFERENCES "public"."comentarii"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tooluri_categorie_tool" ADD CONSTRAINT "tooluri_categorie_tool_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tooluri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tooluri" ADD CONSTRAINT "tooluri_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tooluri_locales" ADD CONSTRAINT "tooluri_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tooluri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roadmaps_pasi_resurse" ADD CONSTRAINT "roadmaps_pasi_resurse_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roadmaps_pasi"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roadmaps_pasi" ADD CONSTRAINT "roadmaps_pasi_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roadmaps_locales" ADD CONSTRAINT "roadmaps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cursuri_lectii" ADD CONSTRAINT "cursuri_lectii_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cursuri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cursuri" ADD CONSTRAINT "cursuri_imagine_id_media_id_fk" FOREIGN KEY ("imagine_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cursuri_locales" ADD CONSTRAINT "cursuri_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cursuri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "callouri_ue_rels" ADD CONSTRAINT "callouri_ue_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."callouri_ue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "callouri_ue_rels" ADD CONSTRAINT "callouri_ue_rels_categorii_fk" FOREIGN KEY ("categorii_id") REFERENCES "public"."categorii"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "newsletter_segment" ADD CONSTRAINT "newsletter_segment_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "newsletter" ADD CONSTRAINT "newsletter_user_asociat_id_useri_id_fk" FOREIGN KEY ("user_asociat_id") REFERENCES "public"."useri"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articole_fk" FOREIGN KEY ("articole_id") REFERENCES "public"."articole"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_surse_fk" FOREIGN KEY ("surse_id") REFERENCES "public"."surse"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categorii_fk" FOREIGN KEY ("categorii_id") REFERENCES "public"."categorii"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_useri_fk" FOREIGN KEY ("useri_id") REFERENCES "public"."useri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comentarii_fk" FOREIGN KEY ("comentarii_id") REFERENCES "public"."comentarii"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tooluri_fk" FOREIGN KEY ("tooluri_id") REFERENCES "public"."tooluri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_roadmaps_fk" FOREIGN KEY ("roadmaps_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cursuri_fk" FOREIGN KEY ("cursuri_id") REFERENCES "public"."cursuri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_callouri_ue_fk" FOREIGN KEY ("callouri_ue_id") REFERENCES "public"."callouri_ue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_useri_fk" FOREIGN KEY ("useri_id") REFERENCES "public"."useri"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articole_galerie_order_idx" ON "articole_galerie" USING btree ("_order");
  CREATE INDEX "articole_galerie_parent_id_idx" ON "articole_galerie" USING btree ("_parent_id");
  CREATE INDEX "articole_galerie_imagine_idx" ON "articole_galerie" USING btree ("imagine_id");
  CREATE INDEX "articole_tags_order_idx" ON "articole_tags" USING btree ("_order");
  CREATE INDEX "articole_tags_parent_id_idx" ON "articole_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articole_slug_idx" ON "articole" USING btree ("slug");
  CREATE INDEX "articole_limba_idx" ON "articole" USING btree ("limba");
  CREATE INDEX "articole_versiune_alternativa_idx" ON "articole" USING btree ("versiune_alternativa_id");
  CREATE INDEX "articole_pilon_idx" ON "articole" USING btree ("pilon_id");
  CREATE INDEX "articole_subcategorie_idx" ON "articole" USING btree ("subcategorie");
  CREATE INDEX "articole_subcategorie_educatie_idx" ON "articole" USING btree ("subcategorie_educatie");
  CREATE INDEX "articole_tip_idx" ON "articole" USING btree ("tip");
  CREATE INDEX "articole_imagine_principala_idx" ON "articole" USING btree ("imagine_principala_id");
  CREATE INDEX "articole_status_idx" ON "articole" USING btree ("status");
  CREATE INDEX "articole_cluster_hash_idx" ON "articole" USING btree ("cluster_hash");
  CREATE INDEX "articole_updated_at_idx" ON "articole" USING btree ("updated_at");
  CREATE INDEX "articole_created_at_idx" ON "articole" USING btree ("created_at");
  CREATE INDEX "articole__status_idx" ON "articole" USING btree ("_status");
  CREATE INDEX "articole_rels_order_idx" ON "articole_rels" USING btree ("order");
  CREATE INDEX "articole_rels_parent_idx" ON "articole_rels" USING btree ("parent_id");
  CREATE INDEX "articole_rels_path_idx" ON "articole_rels" USING btree ("path");
  CREATE INDEX "articole_rels_surse_id_idx" ON "articole_rels" USING btree ("surse_id");
  CREATE INDEX "_articole_v_version_galerie_order_idx" ON "_articole_v_version_galerie" USING btree ("_order");
  CREATE INDEX "_articole_v_version_galerie_parent_id_idx" ON "_articole_v_version_galerie" USING btree ("_parent_id");
  CREATE INDEX "_articole_v_version_galerie_imagine_idx" ON "_articole_v_version_galerie" USING btree ("imagine_id");
  CREATE INDEX "_articole_v_version_tags_order_idx" ON "_articole_v_version_tags" USING btree ("_order");
  CREATE INDEX "_articole_v_version_tags_parent_id_idx" ON "_articole_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_articole_v_parent_idx" ON "_articole_v" USING btree ("parent_id");
  CREATE INDEX "_articole_v_version_version_slug_idx" ON "_articole_v" USING btree ("version_slug");
  CREATE INDEX "_articole_v_version_version_limba_idx" ON "_articole_v" USING btree ("version_limba");
  CREATE INDEX "_articole_v_version_version_versiune_alternativa_idx" ON "_articole_v" USING btree ("version_versiune_alternativa_id");
  CREATE INDEX "_articole_v_version_version_pilon_idx" ON "_articole_v" USING btree ("version_pilon_id");
  CREATE INDEX "_articole_v_version_version_subcategorie_idx" ON "_articole_v" USING btree ("version_subcategorie");
  CREATE INDEX "_articole_v_version_version_subcategorie_educatie_idx" ON "_articole_v" USING btree ("version_subcategorie_educatie");
  CREATE INDEX "_articole_v_version_version_tip_idx" ON "_articole_v" USING btree ("version_tip");
  CREATE INDEX "_articole_v_version_version_imagine_principala_idx" ON "_articole_v" USING btree ("version_imagine_principala_id");
  CREATE INDEX "_articole_v_version_version_status_idx" ON "_articole_v" USING btree ("version_status");
  CREATE INDEX "_articole_v_version_version_cluster_hash_idx" ON "_articole_v" USING btree ("version_cluster_hash");
  CREATE INDEX "_articole_v_version_version_updated_at_idx" ON "_articole_v" USING btree ("version_updated_at");
  CREATE INDEX "_articole_v_version_version_created_at_idx" ON "_articole_v" USING btree ("version_created_at");
  CREATE INDEX "_articole_v_version_version__status_idx" ON "_articole_v" USING btree ("version__status");
  CREATE INDEX "_articole_v_created_at_idx" ON "_articole_v" USING btree ("created_at");
  CREATE INDEX "_articole_v_updated_at_idx" ON "_articole_v" USING btree ("updated_at");
  CREATE INDEX "_articole_v_snapshot_idx" ON "_articole_v" USING btree ("snapshot");
  CREATE INDEX "_articole_v_published_locale_idx" ON "_articole_v" USING btree ("published_locale");
  CREATE INDEX "_articole_v_latest_idx" ON "_articole_v" USING btree ("latest");
  CREATE INDEX "_articole_v_rels_order_idx" ON "_articole_v_rels" USING btree ("order");
  CREATE INDEX "_articole_v_rels_parent_idx" ON "_articole_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articole_v_rels_path_idx" ON "_articole_v_rels" USING btree ("path");
  CREATE INDEX "_articole_v_rels_surse_id_idx" ON "_articole_v_rels" USING btree ("surse_id");
  CREATE INDEX "surse_nivel_incredere_idx" ON "surse" USING btree ("nivel_incredere");
  CREATE INDEX "surse_updated_at_idx" ON "surse" USING btree ("updated_at");
  CREATE INDEX "surse_created_at_idx" ON "surse" USING btree ("created_at");
  CREATE INDEX "surse_rels_order_idx" ON "surse_rels" USING btree ("order");
  CREATE INDEX "surse_rels_parent_idx" ON "surse_rels" USING btree ("parent_id");
  CREATE INDEX "surse_rels_path_idx" ON "surse_rels" USING btree ("path");
  CREATE INDEX "surse_rels_categorii_id_idx" ON "surse_rels" USING btree ("categorii_id");
  CREATE UNIQUE INDEX "categorii_slug_idx" ON "categorii" USING btree ("slug");
  CREATE INDEX "categorii_updated_at_idx" ON "categorii" USING btree ("updated_at");
  CREATE INDEX "categorii_created_at_idx" ON "categorii" USING btree ("created_at");
  CREATE INDEX "useri_sessions_order_idx" ON "useri_sessions" USING btree ("_order");
  CREATE INDEX "useri_sessions_parent_id_idx" ON "useri_sessions" USING btree ("_parent_id");
  CREATE INDEX "useri_nivel_abonament_idx" ON "useri" USING btree ("nivel_abonament");
  CREATE INDEX "useri_updated_at_idx" ON "useri" USING btree ("updated_at");
  CREATE INDEX "useri_created_at_idx" ON "useri" USING btree ("created_at");
  CREATE UNIQUE INDEX "useri_email_idx" ON "useri" USING btree ("email");
  CREATE INDEX "comentarii_autor_idx" ON "comentarii" USING btree ("autor_id");
  CREATE INDEX "comentarii_articol_idx" ON "comentarii" USING btree ("articol_id");
  CREATE INDEX "comentarii_status_idx" ON "comentarii" USING btree ("status");
  CREATE INDEX "comentarii_raspuns_la_idx" ON "comentarii" USING btree ("raspuns_la_id");
  CREATE INDEX "comentarii_updated_at_idx" ON "comentarii" USING btree ("updated_at");
  CREATE INDEX "comentarii_created_at_idx" ON "comentarii" USING btree ("created_at");
  CREATE INDEX "tooluri_categorie_tool_order_idx" ON "tooluri_categorie_tool" USING btree ("order");
  CREATE INDEX "tooluri_categorie_tool_parent_idx" ON "tooluri_categorie_tool" USING btree ("parent_id");
  CREATE UNIQUE INDEX "tooluri_slug_idx" ON "tooluri" USING btree ("slug");
  CREATE INDEX "tooluri_logo_idx" ON "tooluri" USING btree ("logo_id");
  CREATE INDEX "tooluri_updated_at_idx" ON "tooluri" USING btree ("updated_at");
  CREATE INDEX "tooluri_created_at_idx" ON "tooluri" USING btree ("created_at");
  CREATE UNIQUE INDEX "tooluri_locales_locale_parent_id_unique" ON "tooluri_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "roadmaps_pasi_resurse_order_idx" ON "roadmaps_pasi_resurse" USING btree ("_order");
  CREATE INDEX "roadmaps_pasi_resurse_parent_id_idx" ON "roadmaps_pasi_resurse" USING btree ("_parent_id");
  CREATE INDEX "roadmaps_pasi_resurse_locale_idx" ON "roadmaps_pasi_resurse" USING btree ("_locale");
  CREATE INDEX "roadmaps_pasi_order_idx" ON "roadmaps_pasi" USING btree ("_order");
  CREATE INDEX "roadmaps_pasi_parent_id_idx" ON "roadmaps_pasi" USING btree ("_parent_id");
  CREATE INDEX "roadmaps_pasi_locale_idx" ON "roadmaps_pasi" USING btree ("_locale");
  CREATE UNIQUE INDEX "roadmaps_slug_idx" ON "roadmaps" USING btree ("slug");
  CREATE INDEX "roadmaps_updated_at_idx" ON "roadmaps" USING btree ("updated_at");
  CREATE INDEX "roadmaps_created_at_idx" ON "roadmaps" USING btree ("created_at");
  CREATE UNIQUE INDEX "roadmaps_locales_locale_parent_id_unique" ON "roadmaps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cursuri_lectii_order_idx" ON "cursuri_lectii" USING btree ("_order");
  CREATE INDEX "cursuri_lectii_parent_id_idx" ON "cursuri_lectii" USING btree ("_parent_id");
  CREATE INDEX "cursuri_lectii_locale_idx" ON "cursuri_lectii" USING btree ("_locale");
  CREATE UNIQUE INDEX "cursuri_slug_idx" ON "cursuri" USING btree ("slug");
  CREATE INDEX "cursuri_imagine_idx" ON "cursuri" USING btree ("imagine_id");
  CREATE INDEX "cursuri_updated_at_idx" ON "cursuri" USING btree ("updated_at");
  CREATE INDEX "cursuri_created_at_idx" ON "cursuri" USING btree ("created_at");
  CREATE UNIQUE INDEX "cursuri_locales_locale_parent_id_unique" ON "cursuri_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "callouri_ue_deadline_idx" ON "callouri_ue" USING btree ("deadline");
  CREATE INDEX "callouri_ue_updated_at_idx" ON "callouri_ue" USING btree ("updated_at");
  CREATE INDEX "callouri_ue_created_at_idx" ON "callouri_ue" USING btree ("created_at");
  CREATE INDEX "callouri_ue_rels_order_idx" ON "callouri_ue_rels" USING btree ("order");
  CREATE INDEX "callouri_ue_rels_parent_idx" ON "callouri_ue_rels" USING btree ("parent_id");
  CREATE INDEX "callouri_ue_rels_path_idx" ON "callouri_ue_rels" USING btree ("path");
  CREATE INDEX "callouri_ue_rels_categorii_id_idx" ON "callouri_ue_rels" USING btree ("categorii_id");
  CREATE INDEX "newsletter_segment_order_idx" ON "newsletter_segment" USING btree ("order");
  CREATE INDEX "newsletter_segment_parent_idx" ON "newsletter_segment" USING btree ("parent_id");
  CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter" USING btree ("email");
  CREATE INDEX "newsletter_user_asociat_idx" ON "newsletter" USING btree ("user_asociat_id");
  CREATE INDEX "newsletter_updated_at_idx" ON "newsletter" USING btree ("updated_at");
  CREATE INDEX "newsletter_created_at_idx" ON "newsletter" USING btree ("created_at");
  CREATE INDEX "media_hash_m_d5_idx" ON "media" USING btree ("hash_m_d5");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_articole_id_idx" ON "payload_locked_documents_rels" USING btree ("articole_id");
  CREATE INDEX "payload_locked_documents_rels_surse_id_idx" ON "payload_locked_documents_rels" USING btree ("surse_id");
  CREATE INDEX "payload_locked_documents_rels_categorii_id_idx" ON "payload_locked_documents_rels" USING btree ("categorii_id");
  CREATE INDEX "payload_locked_documents_rels_useri_id_idx" ON "payload_locked_documents_rels" USING btree ("useri_id");
  CREATE INDEX "payload_locked_documents_rels_comentarii_id_idx" ON "payload_locked_documents_rels" USING btree ("comentarii_id");
  CREATE INDEX "payload_locked_documents_rels_tooluri_id_idx" ON "payload_locked_documents_rels" USING btree ("tooluri_id");
  CREATE INDEX "payload_locked_documents_rels_roadmaps_id_idx" ON "payload_locked_documents_rels" USING btree ("roadmaps_id");
  CREATE INDEX "payload_locked_documents_rels_cursuri_id_idx" ON "payload_locked_documents_rels" USING btree ("cursuri_id");
  CREATE INDEX "payload_locked_documents_rels_callouri_ue_id_idx" ON "payload_locked_documents_rels" USING btree ("callouri_ue_id");
  CREATE INDEX "payload_locked_documents_rels_newsletter_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_useri_id_idx" ON "payload_preferences_rels" USING btree ("useri_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "articole_galerie" CASCADE;
  DROP TABLE "articole_tags" CASCADE;
  DROP TABLE "articole" CASCADE;
  DROP TABLE "articole_rels" CASCADE;
  DROP TABLE "_articole_v_version_galerie" CASCADE;
  DROP TABLE "_articole_v_version_tags" CASCADE;
  DROP TABLE "_articole_v" CASCADE;
  DROP TABLE "_articole_v_rels" CASCADE;
  DROP TABLE "surse" CASCADE;
  DROP TABLE "surse_rels" CASCADE;
  DROP TABLE "categorii" CASCADE;
  DROP TABLE "useri_sessions" CASCADE;
  DROP TABLE "useri" CASCADE;
  DROP TABLE "comentarii" CASCADE;
  DROP TABLE "tooluri_categorie_tool" CASCADE;
  DROP TABLE "tooluri" CASCADE;
  DROP TABLE "tooluri_locales" CASCADE;
  DROP TABLE "roadmaps_pasi_resurse" CASCADE;
  DROP TABLE "roadmaps_pasi" CASCADE;
  DROP TABLE "roadmaps" CASCADE;
  DROP TABLE "roadmaps_locales" CASCADE;
  DROP TABLE "cursuri_lectii" CASCADE;
  DROP TABLE "cursuri" CASCADE;
  DROP TABLE "cursuri_locales" CASCADE;
  DROP TABLE "callouri_ue" CASCADE;
  DROP TABLE "callouri_ue_rels" CASCADE;
  DROP TABLE "newsletter_segment" CASCADE;
  DROP TABLE "newsletter" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_articole_limba";
  DROP TYPE "public"."enum_articole_subcategorie";
  DROP TYPE "public"."enum_articole_subcategorie_educatie";
  DROP TYPE "public"."enum_articole_tip";
  DROP TYPE "public"."enum_articole_status";
  DROP TYPE "public"."enum__articole_v_version_limba";
  DROP TYPE "public"."enum__articole_v_version_subcategorie";
  DROP TYPE "public"."enum__articole_v_version_subcategorie_educatie";
  DROP TYPE "public"."enum__articole_v_version_tip";
  DROP TYPE "public"."enum__articole_v_version_status";
  DROP TYPE "public"."enum__articole_v_published_locale";
  DROP TYPE "public"."enum_surse_nivel_incredere";
  DROP TYPE "public"."enum_surse_tip_citare_permis";
  DROP TYPE "public"."enum_surse_regiune";
  DROP TYPE "public"."enum_categorii_pilon";
  DROP TYPE "public"."enum_useri_rol";
  DROP TYPE "public"."enum_useri_nivel_abonament";
  DROP TYPE "public"."enum_useri_limba_preferata";
  DROP TYPE "public"."enum_comentarii_status";
  DROP TYPE "public"."enum_tooluri_categorie_tool";
  DROP TYPE "public"."enum_tooluri_pret";
  DROP TYPE "public"."enum_roadmaps_nivel";
  DROP TYPE "public"."enum_callouri_ue_program";
  DROP TYPE "public"."enum_newsletter_segment";
  DROP TYPE "public"."enum_newsletter_limba";
  DROP TYPE "public"."enum_media_sursa_imagine";`)
}
