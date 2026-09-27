import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Legacy production bridge.
    --
    -- The July production model used the custom editorial field as the
    -- public-read authority, while Payload's native _status could disagree.
    -- The modern model intentionally makes _status the only publication
    -- authority. Preserve the old public visibility exactly once when the
    -- historical production marker is present.
    DO $legacy_publication_state_alignment$
    DECLARE
      v_is_legacy boolean;
      v_expected_public integer;
      v_native_public integer;
      v_invalid_public integer;
      v_unpublished_approved integer;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM "payload_migrations"
        WHERE "name" = 'dev'
          AND "batch" = -1
      )
      INTO v_is_legacy;

      IF NOT v_is_legacy THEN
        RAISE NOTICE
          'Legacy publication alignment skipped: historical production marker not present';
        RETURN;
      END IF;

      -- Every legacy row that was publicly visible under the old model was
      -- migrated from status=published to editorial_status=approved.
      -- Production was verified to have published_at populated for all such
      -- rows. Fail closed if that invariant is not true at migration time.
      SELECT count(*) INTO v_unpublished_approved
      FROM "articole"
      WHERE "editorial_status" = 'approved'
        AND "published_at" IS NULL;

      IF v_unpublished_approved <> 0 THEN
        RAISE EXCEPTION
          'Legacy publication alignment abort: approved rows without published_at=%',
          v_unpublished_approved;
      END IF;

      SELECT count(*) INTO v_expected_public
      FROM "articole"
      WHERE "editorial_status" = 'approved';

      -- Old public authority -> new public authority.
      UPDATE "articole"
      SET "_status" = 'published'
      WHERE "editorial_status" = 'approved'
        AND "_status" IS DISTINCT FROM 'published'::"public"."enum_articole_status";

      -- Rows hidden by the old custom status must remain hidden even if their
      -- historical Payload native status says published.
      UPDATE "articole"
      SET "_status" = 'draft'
      WHERE "editorial_status" <> 'approved'
        AND "_status" IS DISTINCT FROM 'draft'::"public"."enum_articole_status";

      SELECT count(*) INTO v_native_public
      FROM "articole"
      WHERE "_status" = 'published';

      SELECT count(*) INTO v_invalid_public
      FROM "articole"
      WHERE "_status" = 'published'
        AND "editorial_status" <> 'approved';

      IF v_native_public <> v_expected_public
        OR v_invalid_public <> 0
      THEN
        RAISE EXCEPTION
          'Legacy publication alignment postcheck failed expected_public=% native_public=% invalid_public=%',
          v_expected_public,
          v_native_public,
          v_invalid_public;
      END IF;
    END
    $legacy_publication_state_alignment$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Intentionally no-op.
    --
    -- The old application used the custom status field, not _status, for
    -- public visibility. Keeping _status aligned when rolling application
    -- code back therefore does not change the old public-read contract.
    --
    -- Reconstructing the historical mismatches would be both unnecessary and
    -- unsafe because they were implementation artifacts, not editorial intent.
    DO $legacy_publication_state_alignment_down$
    BEGIN
      RAISE NOTICE
        'Legacy publication alignment down migration is intentionally a no-op';
    END
    $legacy_publication_state_alignment_down$;
  `)
}
