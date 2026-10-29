# Production RSS outcome diagnostics

The first scheduled run on29October completed at18:04:28UTC (20:04Romania). It reserved one MIT candidate and reported `skipped`, without creating a pair. The parent discarded the detailed child result and treated any zero exit without the old success marker as a skip. That also masked a zero-exit child with no output. The historical reason cannot be reconstructed from the retained log; this change does not claim a cause for that run.

The one-shot now emits exactly one `FLASH_RSS_PRODUCTION_ONE_SHOT_OUTCOME` JSON record on a normal terminal path. It is written synchronously to stdout so immediate process.exit cannot discard this small record. A pair-created record is emitted only after the atomic writer returns. Empty selection emits `no_candidate`; completed controlled skips emit their existing category: `event_identity_not_grounded`, `strong_duplicate`, or `article_publication_not_current`. Existing human-readable markers remain for existing readers.

The scheduled parent requires exit0 plus exactly one strictly valid record. A missing record yields `terminal_outcome_missing`; malformed JSON, unknown categories, extra fields or conflicting records yield `terminal_outcome_invalid`. Nonzero exit, timeout and output overflow retain existing failure precedence. Only fixed fields/categories cross into scheduled logs, with no raw source text, provider output or stderr. No new provider requests or diagnostic replay are introduced.

Source selection, permissions, exact target guards, freshness, grounded identity, classification, atomic draft/review persistence, durable reservations, rolling budget, seven-day candidate memory and cron are unchanged. A diagnosis failure still consumes its reserved attempt. It never retries generation, deletes memory or changes publication.

Validate subprocess protocol/redaction/chunking/empty-output tests, existing one-shot/handoff/freshness/budget suites, TypeScript and lint, full ephemeral-database CI and the actual Docker protocol smoke test without network/credentials. The protocol helper path is in worker workflow filters.

Preparation and PR validation do not deploy production. If merge/deploy is later approved, pin that reviewed merge to the dedicated production worker and use a no-cron dry-run preview, then restore the existing cron after unchanged-state proof. Review all staged environment changes. Do not replay the consumed20:00attempt; next normal run is30October06:00UTC/08:00Romania. The prior skipped URL remains reserved and excluded. Publication remains manual.
