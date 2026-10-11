# Controlled human-approved Flash AI manuscripts

This directory contains the two **editorially approved** MIT SANDO RO/EN
manuscripts (11 October 2026). They are source documents, **not** published
articles, not fixtures for regeneration, and not instructions to run an import.

The importer
`scripts/flash-ai-staging-import-approved-sando-pair.ts` is a
**single-subject, staging-only** adapter that:

1. Refuses edits to either manuscript using its pinned SHA-256 and verifies
   the exact body word count, title, excerpt, source notes and language.
2. Uses the verified live MIT article, its canonical URL and IEEE-Xplore
   identity to reconstruct the existing normalized candidate. Re-checks
   source/event fingerprints and duplicate evidence independently for RO/EN.
3. Reuses the existing strict editorial length gate, Lexical round trip,
   persistence readiness and staging write-input builder. The two excerpts
   are exactly those **already approved** by the editor, not regenerated.
4. Uses the existing atomic review-pair writer for both languages together:
   final dedup, a single transaction, two drafts, reciprocal links,
   `editorialStatus=review`, `automationDecision=review` and
   `_status=draft`. Any failure rolls the transaction back.
5. **Does not** call OpenAI or any other model. The source articles have
   already been human-reviewed; this is not a new semantic AI-QA pass.

## Safe workflow (separate approvals required)

- **PR approval alone does not authorize deployment or database writes.**
- Deploy this exact pinned `staging` commit manually **only** to
  `flash-article-preview-once` in the staging Railway project. Keep cron
  disabled and restart policy `NEVER`.
- Run `node --import tsx scripts/flash-ai-staging-import-approved-sando-pair.ts`
  **without flags** as a read-only dry-run. Do not proceed if any difference,
  duplicate or source-identity mismatch is detected. No AI calls are used.
- **Only after a second explicit approval for a database write**, run with
  `--allow-staging-sando-pair-write` in the **same dedicated staging service**.
  Its database guard rejects the production Supabase project.
- Independently verify the two resulting draft IDs, `review` state, reciprocal
  `versiuneAlternativa` links, no `publishedAt`, RO/EN title/excerpt/body
  integrity and continued production isolation. Finally restore the original
  preview start command in the permitted staging-only deployment.
- Never deploy this writer to `main` or production and never enable a cron.

The 12 real-flight result is attributed to **MIT News** in both manuscripts;
the April arXiv preprint reports different test counts. This attribution
difference remains in the editorial notes, not treated as resolved.
