# PUB-001 — Legacy Publisher Containment

## Problem

The production `main` branch still runs the legacy scheduled GitHub Actions publisher four times per day.

The production workflow dispatches:

- `publish-rss.ts`
- `publish-health.ts`
- `publish-education.ts`
- `publish-business.ts`

Production evidence collected on 2026-09-25 confirms that this authority is active.

In the preceding seven-day window, automatically generated production content included:

- 78 article rows in total;
- 72 directly published article rows;
- 6 medical draft rows.

The two published rows categorized as Health in that window were produced through the general RSS publisher's cross-pillar classification path; the dedicated medical publisher itself remains draft-only.

The direct-publication paths are:

- RSS / general: direct publish;
- Education: direct publish;
- Business: direct publish.

The medical publisher is already draft-only in production.

This creates parallel editorial authority because the newer staging architecture requires review/gating before publication while the legacy production scripts can still publish without that boundary.

## Current staging contract

The `staging` branch already contains the intended containment behavior for all four legacy publishers:

- writes use Payload draft semantics with `draft: true`;
- generated articles use `editorialStatus: 'review'`;
- no publisher sets `status: 'published'`;
- no publisher sets `publishedAt`;
- RO/EN reciprocal linking updates remain inside `draft: true`.

The integration test
`tests/int/legacy-publisher-draft-only.int.spec.ts`
locks this contract into the CI `quality-gate`.

## Target authority model

Legacy publisher:

`retrieve → select → generate → create review draft`

Canonical editorial authority:

`review/gating → explicit publication decision → publish`

The legacy publisher may continue to discover and generate content during containment, but it must not own the final publication decision.

## Production cutover

Production is intentionally unchanged by this document and its companion test.

Promotion to `main` must be a dedicated production change with explicit approval.

Production currently uses an older Article editorial model than staging:

- production `main`: custom `status = draft | review | published | blocked`;
- staging: `editorialStatus` plus Payload-native `_status`.

Therefore the first production containment must be schema-compatible and must **not** copy the staging write shape mechanically.

The proven production-compatible precedent is `publish-health.ts`, which already creates `status: 'draft'` rows successfully in the production database.

Recommended sequence:

1. validate the modern draft-only contract in staging CI;
2. prepare a surgical branch from `main`;
3. for `publish-rss.ts`, `publish-education.ts`, and `publish-business.ts`, replace direct `status: 'published'` / `publishedAt` writes with the existing production-compatible `status: 'draft'` pattern;
4. keep `publish-health.ts` behavior unchanged except for any non-semantic logging cleanup;
5. do not introduce `editorialStatus`, `draft: true`, or staging-only schema assumptions into this first production containment patch;
6. inspect the production diff and confirm no unrelated staging code is included;
7. merge only with explicit production approval;
8. observe the next scheduled publisher runs;
9. verify newly generated rows are `status='draft'` and `published_at IS NULL`;
10. keep the schedule active initially so discovery/generation continues;
11. only after the canonical publication boundary is operational, consider disabling the legacy schedule.

A later controlled production schema/application promotion can adopt the staging `editorialStatus + _status` model. PUB-001 containment does not require that larger migration.

## Non-goals

PUB-001 containment does not:

- disable the scheduled workflow;
- rewrite publisher ingestion;
- migrate legacy content;
- change production database schema;
- alter production secrets;
- change ranking or source selection;
- introduce a new publishing service.

The first objective is narrower: remove direct publication authority while preserving useful legacy discovery and generation.
