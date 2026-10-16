# Staging security candidate — 2026-10-16

**DRAFT / NO MERGE / NO DEPLOY.** Branch from staging commit `8162ac1f2dada7c3905914d60d149d8ec09d99b6`.

- Stage-only core update: Next 16.4.0 → 16.4.2, Payload 3.90.2 → 3.91.0 across all direct Payload packages, Vitest 4.0.18 → 4.1.12, eslint-config-next → 16.4.2. Keep sharp 0.35.5 and stage-specific undici 7.29.1.
- Complement transitive overrides verified on main candidate: fast-uri 3.1.8, js-yaml 4.3.2, source-map-js 1.2.2, fast-copy 3.1.0, nanoid 3.3.20, browserslist 4.28.7.
- Node 22.17.0 in publisher workflow; **no changes** to cron, database connection, CMS publishing rules, or secrets.
- Two compatibility migrations `20261011_182500_payload_auth_reset_requested_at` and `20261013_000001_payload_media_objectkey_compat` ALREADY exist in staging; this PR does not reintroduce or modify them.
- A short-lived workflow may regenerate a lockfile on this Draft branch only; it must be removed before final verification.
- Compare full CI and read-only audit and require explicit approval for merge and separately deploy. No production changes.
