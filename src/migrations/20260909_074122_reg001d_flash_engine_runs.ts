import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_flash_engine_runs_status" AS ENUM('running', 'completed', 'failed');
  CREATE TYPE "public"."enum_flash_engine_runs_decision" AS ENUM('autoPublish', 'review', 'blocked');
  CREATE TABLE "flash_engine_runs_reasons" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "reason" varchar NOT NULL
  );

  CREATE TABLE "flash_engine_runs" (
    "id" serial PRIMARY KEY NOT NULL,
    "flash_id" integer,
    "flash_id_snapshot" numeric NOT NULL,
    "run_id" varchar NOT NULL,
    "status" "enum_flash_engine_runs_status" DEFAULT 'running' NOT NULL,
    "provider" varchar NOT NULL,
    "model" varchar NOT NULL,
    "engine_version" varchar NOT NULL,
    "started_at" timestamp(3) with time zone NOT NULL,
    "completed_at" timestamp(3) with time zone,
    "decision" "enum_flash_engine_runs_decision",
    "decision_input_snapshot" jsonb,
    "evidence_summary" jsonb,
    "error_code" varchar,
    "error_message" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "flash_engine_runs_reasons" ADD CONSTRAINT "flash_engine_runs_reasons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."flash_engine_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "flash_engine_runs" ADD CONSTRAINT "flash_engine_runs_flash_id_flash_ai_id_fk" FOREIGN KEY ("flash_id") REFERENCES "public"."flash_ai"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "flash_engine_runs_reasons_order_idx" ON "flash_engine_runs_reasons" USING btree ("_order");
  CREATE INDEX "flash_engine_runs_reasons_parent_id_idx" ON "flash_engine_runs_reasons" USING btree ("_parent_id");
  CREATE INDEX "flash_engine_runs_flash_idx" ON "flash_engine_runs" USING btree ("flash_id");
  CREATE INDEX "flash_engine_runs_flash_id_snapshot_idx" ON "flash_engine_runs" USING btree ("flash_id_snapshot");
  CREATE UNIQUE INDEX "flash_engine_runs_run_id_idx" ON "flash_engine_runs" USING btree ("run_id");
  CREATE INDEX "flash_engine_runs_status_idx" ON "flash_engine_runs" USING btree ("status");
  CREATE INDEX "flash_engine_runs_started_at_idx" ON "flash_engine_runs" USING btree ("started_at");
  CREATE INDEX "flash_engine_runs_decision_idx" ON "flash_engine_runs" USING btree ("decision");
  CREATE INDEX "flash_engine_runs_updated_at_idx" ON "flash_engine_runs" USING btree ("updated_at");
  CREATE INDEX "flash_engine_runs_created_at_idx" ON "flash_engine_runs" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "flash_engine_runs_reasons" CASCADE;
  DROP TABLE "flash_engine_runs" CASCADE;
  DROP TYPE "public"."enum_flash_engine_runs_status";
  DROP TYPE "public"."enum_flash_engine_runs_decision";`)
}
