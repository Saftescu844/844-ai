# RSS scan window correction — local review

Base: staging 64ac78a (PR #273). No deployment, migration, provider request or CMS change.

Previously the first ten feed entries were selected before existing/rejected URL filtering. An exhausted prefix prevented inspection of further feed entries.

The staging stage-next runner now examines at most 50 feed entries per source, filters existing and remembered rejected URLs, applies the existing daily budget, sorts newest first, then retains at most min(operator --max-items, source.maxCandidatesPerScan) eligible candidates per source. The existing global maxAttempts=3 stays unchanged. Diagnostics account separately for candidates removed by the final scan limit. Other parser callers retain their current per-source parsing limit. Only the stage-next runner opts into scanBeforeEligibility, with a hard ceiling of 50.

This expands discovery of older entries; it does not validate their relevance, scientific evidence or suitability for publication. No new age threshold or permission to publish is introduced. Recency remains an editorial review concern before any deployment/generation decision.

Additional sources already exist in src/lib/flash/ingestion/flashDiscoveryCatalog.ts, introduced in commit c5b3510. This is a proposal only, not the live Source Registry: Anthropic, UNESCO, PubMed, arXiv, OpenReview, Hugging Face Papers, Ministerul Educației și Cercetării, UEFISCDI, DNSC, Reuters and MIT Technology Review, alongside EC, Google, MIT and OpenAI. No source is activated by this correction.

Validation: 56 tests passed across 10 RSS/source configuration suites; TypeScript --noEmit, scoped ESLint and git diff --check passed. Tests used Node 24.22.1 available in this workspace; the repository requires Node 22, so matching-runtime CI remains necessary before integration. No production or staging service was changed.
