# UNESCO and Anthropic layout repair — 2 November 2026

## Trigger and resulting behavior

The staging worker could discover a UNESCO article but rejected its summary:
the article header and an SDG tooltip both contain `field--name-field-description`.
For modern UNESCO articles, select exactly one description within exactly one
article header. A missing, empty or ambiguous header fails closed instead of
falling back to the SDG text. The previous unique-description layout remains
supported when modern article/header markers are absent.

Anthropic changed compiled CSS module names. The news-list parser expected
`TableView-*__summary` and found no rows; the article extractor similarly expected
`ArticlePage-*__Article` and `ArticleHero-*__Title/Metadata`.

For the new listing, require one `data-listing-rows=true` container, inspect at
most 50 `li[data-listing-row]` rows, and bind one `data-peek=true` summary's title
and date to the same CSS module prefix derived from that summary. No current
compiled hash is hardcoded. Duplicate collapsed details are excluded. The legacy
listing remains supported; a malformed modern listing does not fall back to it.

For articles, require one article containing the explicit `data-article-body=true`
marker, one headline, one Published list item, and one original time. Preserve
canonical-origin/path matching, visible-date validation and datetime corroboration,
one body, and exclusion of navigation, hidden content, related marketing and code.

## Evidence and validation

Before the repair, the active worker code reproduced both errors on public HTML
captured on November 2. After the repair, the same unmodified offline snapshots
yielded:

- UNESCO IFAP article: original date 29 October 2026, correct header summary and
  16 body paragraphs, excluding the SDG tooltip.
- Anthropic news list: 19 candidates, 15 within the existing freshness policy and
  four too old at the fixed reference 2026-11-02T10:00:00Z.
- Anthropic AI for Science article: original Published date 28 October 2026 and
  28 body paragraphs.

These are parser/extractor observations, not saved drafts, editorial approval,
provider/network verification on Railway, or a promise of future candidate counts.
The source-4 Commission handoff failure is not diagnosed or repaired by this change.

Public evidence URLs:

- https://www.unesco.org/en/articles/unesco-santiago-commemorated-25th-anniversary-information-all-programme-ifap-regional-events
- https://www.anthropic.com/news
- https://www.anthropic.com/news/ai-for-science-expands-foundations-research-institutions

Regression fixtures are synthetic reduced structures, not copied article bodies.
They cover the SDG collision, missing/duplicate header descriptions, renamed
modules, collapsed details, hidden/navigation rows, unrelated prefixes, ambiguous
titles/dates/containers, 50-row scan limits, original-date and canonical conflicts.
Run these with the existing institutional and Anthropic adapter suites.

## Release scope

The isolated worker candidate must be based directly on the active staging worker
commit `7b14aa53c5f9e5f33cb86152160785d89c376318`, with only these adapter changes,
regression tests and this note. The PR integration commit may also contain existing
staging work; do not deploy that broader merge tree to the hourly worker.

Merge and worker deployment require their respective approvals. For deployment,
use a dedicated release branch whose tip is the isolated candidate, and verify
both service config and actual deployment `meta.commitHash`. A pin-only update
on the general staging branch previously built a different branch-tip commit.

Keep cron, model, source registry, provider budget, max attempts, freshness,
identity checks, deduplication, QA and atomic review-only persistence unchanged.
No schema, new source, automatic publication, production change or manual AI
generation is part of preparing this PR. After an approved deployment inspect the
next natural cron; do not clear memory or replay generation to force evidence.
