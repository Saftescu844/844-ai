-- Read-only. Execute separately against the intended staging/production project.
-- Editorial fields only: no user/session/credential data.
SELECT s.id, s.nume, s.url, s.source_role, s.editorial_trust,
       s.citation_mode, s.activa, s.allow_ingestion, s.allow_auto_publish,
       s.feed_r_s_s, s.regiune,
       COALESCE((
         SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'pilon', c.pilon))
         FROM public.surse_rels r
         JOIN public.categorii c ON c.id = r.categorii_id
         WHERE r.parent_id = s.id AND r.path = 'pilon'
       ), '[]'::json) AS categorii
FROM public.surse s
ORDER BY s.id;
