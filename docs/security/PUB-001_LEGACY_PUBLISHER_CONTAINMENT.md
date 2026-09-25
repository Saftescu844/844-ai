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

- 66 directly published article rows;
- 6 medical draft rows.

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

Recommended sequence:

1. validate the draft-only contract in staging CI;
2. prepare a surgical production PR from `main`, copying only the validated publisher containment changes;
3. inspect the production diff and confirm no unrelated staging code is included;
4. merge only with explicit production approval;
5. observe the next scheduled publisher runs;
6. verify newly generated rows are `draft` / review-only;
7. verify no direct `publishedAt` writes occur from the legacy publisher;
8. keep the schedule active initially so discovery/generation continues;
9. only after the canonical publication boundary is operational, consider disabling the legacy schedule.

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
