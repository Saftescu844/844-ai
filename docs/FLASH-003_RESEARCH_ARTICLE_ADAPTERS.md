# FLASH-003 — Google Research / MIT News article adapters

## Scope

Adds explicit adapters to `extractFlashHtmlArticle` and extends candidate
normalization for these two sources. The existing CE extraction branch and
its date/path contract remain intact. No schema changes, source permission
changes, scheduler, generation, translation, CMS persistence or publication.

## Extraction contract

| Source | Allowed article path | Body | Date | Lead |
|---|---|---|---|---|
| research.google | `/blog/<slug>/` | `.blog-detail-wrapper`, paragraphs inside `.rich-text` | One English month/day/year paragraph in `.basic-hero--blog-detail__description` | `.blog-summary__summary` |
| news.mit.edu | `/<year>/<slug>-<MMDD>` | `.news-article--content--body--inner` | One visible `time` date | `meta[name=description]`, explicitly marked `meta-description` |

Registered and final hosts must match (www/trailing-dot normalization).
These adapters require HTTPS, no credentials/custom ports, English document
language, a unique main container/title/body and valid calendar date.
Listing/feed URLs are excluded. Layout changes/missing fields fail closed.
Dates normalize to YYYY-MM-DD while preserving the original visible string;
MIT's visible publication date is not shifted by converting its timestamp.
Canonical URL normalization removes query/fragment, retaining source text.

`parse5` 8.0.1 becomes an explicit production dependency, with its existing
locked version. HTML parsing is inert: no browser, JavaScript execution,
subresource loading or network access in the adapters. Fetching remains the
responsibility of the existing restricted source retriever.

Navigation, footers, sidebars, figures/captions, scripts/styles/templates and
explicitly hidden nodes are excluded. Acknowledgement/funding/disclosure
sections are separated into `provenanceParagraphs`. MIT's observed closing
funding paragraph is also separated by its explicit opening phrase.
An unrecognized funding formulation remains in the body rather than being
silently discarded. These rules are source-specific, not a general semantic
classifier. Provenance is retained on the normalized in-memory candidate;
persisting/using it downstream is a later step, not a new CMS field here.

The adapters preserve paragraph text, decode HTML entities, normalize
whitespace and record `sourceAdapter` / `leadKind`. They do not establish
scientific validity, translate claims, choose editorial labels or activate
the sources. Source documents remain untrusted evidence for later review.

## Verification

Synthetic integration fixtures cover exact body boundaries, entity/inline
markup handling, inert scripts, provenance separation, dates/leap years,
missing/ambiguous fields, language, unsupported paths, cross-host URLs,
HTTP/credentials/ports, normalization and unchanged AUTO permissions.
Run them with the CE extraction/normalization regression tests:

```sh
npx vitest run tests/int/flash-research-article-adapters.int.spec.ts tests/int/flash-html-article-extraction.int.spec.ts tests/int/flash-html-article-normalization.int.spec.ts
```

Local real-page verification on 2026-10-04:
- Google education article (2026-09-17): 19 editorial paragraphs, 1 provenance paragraph.
- MIT InstructMesh article (2026-10-01): 15 editorial paragraphs, 1 provenance paragraph.
- OpenAI is not implemented here; the preceding staging GET returned HTTP 403.

The versioned read-only script `scripts/flash-research-article-preview.ts`
fetches exactly these two public samples with the canonical retriever,
executes the real adapters and normalizer, and logs only metadata/digests.
It requires the designated staging project/environment IDs and exits
nonzero on retrieval, extraction or sample date validation failure.
It imports neither Payload nor model clients and does not read the registry;
sample source IDs are diagnostic labels, not an ingestion authorization.

```sh
node --import tsx scripts/flash-research-article-preview.ts
```

Run only on staging `flash-article-preview-once`, restart NEVER, no cron.
CI and the deployment ID/results are recorded in the PR after execution.
Production is outside this change. Next: primary evidence/editorial review,
then a separately controlled candidate ingestion pilot; no automatic launch.
