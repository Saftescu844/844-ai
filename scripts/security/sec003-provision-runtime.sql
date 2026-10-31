-- SEC-003: manual, separately approved provisioning; NOT a Payload migration.
-- Run once as the migration owner, after schema migrations, in the selected project.
-- Leaves the new role NOLOGIN. Never place a password in this file.
BEGIN;
CREATE ROLE payload_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT USAGE ON SCHEMA public TO payload_runtime;
DO $sec003$
DECLARE
  expected text[] := ARRAY['_articole_v','_articole_v_rels','_articole_v_version_galerie','_articole_v_version_tags','_flash_ai_v','_flash_ai_v_version_disclaimer_types','_flash_ai_v_version_specialist_questions','_flash_ai_v_version_surse_flash','articole','articole_galerie','articole_rels','articole_tags','autori','autori_affiliations_and_sponsorships','autori_affiliations_and_sponsorships_locales','autori_contribution_types','autori_credentials','autori_credentials_locales','autori_editorial_roles','autori_expertise_areas','autori_expertise_areas_locales','autori_locales','autori_professional_identifiers','autori_social_links','autori_social_links_locales','autori_specialties','callouri_ue','callouri_ue_rels','categorii','comentarii','cursuri','cursuri_lectii','cursuri_locales','flash_ai','flash_ai_disclaimer_types','flash_ai_specialist_questions','flash_ai_surse_flash','flash_engine_runs','flash_engine_runs_reasons','media','media_locales','newsletter','newsletter_segment','payload_jobs','payload_jobs_log','payload_kv','payload_locked_documents','payload_locked_documents_rels','payload_migrations','payload_preferences','payload_preferences_rels','roadmaps','roadmaps_locales','roadmaps_pasi','roadmaps_pasi_resurse','search','search_rels','site_settings','site_settings_footer_footer_sections','site_settings_footer_footer_sections_links','site_settings_footer_footer_sections_links_locales','site_settings_footer_footer_sections_locales','site_settings_language_settings_available_languages','site_settings_legal_links','site_settings_legal_links_locales','site_settings_locales','site_settings_methodology_principles','site_settings_methodology_principles_locales','site_settings_navigation_header_actions','site_settings_navigation_header_actions_locales','site_settings_navigation_primary_navigation','site_settings_navigation_primary_navigation_locales','site_settings_social_links','site_settings_social_links_locales','site_settings_trust_bar_items','site_settings_trust_bar_items_locales','surse','surse_rels','tooluri','tooluri_categorie_tool','tooluri_locales','useri','useri_sessions'];
  actual text[];
  item record;
BEGIN
  SELECT array_agg(c.relname::text ORDER BY c.relname) INTO actual
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p');
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'SEC-003: public table manifest drift; review before granting';
  END IF;
  IF has_schema_privilege('payload_runtime','public','CREATE') THEN
    RAISE EXCEPTION 'SEC-003: inherited PUBLIC CREATE must be reviewed separately';
  END IF;
  FOR item IN SELECT c.oid,c.relname,c.relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    IF item.relrowsecurity IS DISTINCT FROM (item.relname::text = ANY(ARRAY['comentarii','newsletter','newsletter_segment','useri','useri_sessions'])) THEN
      RAISE EXCEPTION 'SEC-003: RLS manifest drift';
    END IF;
    IF item.relname = 'payload_migrations' THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO payload_runtime',item.relname);
    ELSE
      EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO payload_runtime',item.relname);
      -- Only sequences owned by columns of approved writable tables.
      FOR actual IN SELECT ARRAY[n.nspname,s.relname] FROM pg_depend d
        JOIN pg_class s ON s.oid=d.objid AND s.relkind='S'
        JOIN pg_namespace n ON n.oid=s.relnamespace
        WHERE d.refobjid=item.oid AND d.deptype IN ('a','i')
      LOOP
        EXECUTE format('GRANT USAGE,SELECT ON SEQUENCE %I.%I TO payload_runtime',actual[1],actual[2]);
      END LOOP;
    END IF;
  END LOOP;
END
$sec003$;
CREATE POLICY sec003_payload_runtime ON public."comentarii" FOR ALL TO payload_runtime USING (true) WITH CHECK (true);
CREATE POLICY sec003_payload_runtime ON public."newsletter" FOR ALL TO payload_runtime USING (true) WITH CHECK (true);
CREATE POLICY sec003_payload_runtime ON public."newsletter_segment" FOR ALL TO payload_runtime USING (true) WITH CHECK (true);
CREATE POLICY sec003_payload_runtime ON public."useri" FOR ALL TO payload_runtime USING (true) WITH CHECK (true);
CREATE POLICY sec003_payload_runtime ON public."useri_sessions" FOR ALL TO payload_runtime USING (true) WITH CHECK (true);
COMMIT;

