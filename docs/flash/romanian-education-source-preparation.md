# Ministry of Education Romanian source preparation

This change adds extraction support, not a live source registration or activation.
No CMS source, ingestion policy, automatic publication setting, worker deployment,
database schema or editorial QA threshold is changed.

## Scope

- Discovery: the observed `https://www.edu.ro/rss.xml` feed. The catalogue remains
  a proposal, not the live Source Registry. General education notices are filtered
  by explicit AI terminology in the feed title/summary before attempt allocation.
  Digitalisation, manuals and scholarships alone do not establish AI relevance.
- Article URLs: HTTPS `edu.ro`/`www.edu.ro`, without credentials or custom ports,
  and only `/press_rel_<identifier>` paths. Strip tracking and fragments; reject
  listings, files, subdomains and other domains. The final article must have a
  matching canonical URL and declare Romanian.
- Structure: exactly one main, `#block-edu-page-title` headline, `article.edu-article`,
  `.edu-article__date` labelled `Data publicării`, and `.edu-article__body`.
  Preserve paragraphs, quotations and list items. Exclude navigation, captions,
  hidden/inert content, forms, code and Drupal's `ul.links` utility counters.
- Dates: parse Romanian calendar dates, retaining the visible original publication
  date. Missing, invalid or conflicting dates fail closed. Modified timestamps,
  feed dates and crawl times never replace the article's original date.
- Recheck AI relevance against the extracted title/body. Navigation does not
  establish relevance. The lexical filter is deliberately narrow and is not a
  substitute for editorial classification or fact checking.

## Source language and editorial language

The normalized primary candidate and persistence source-grounded values now permit
`ro | en`. The `ro-education` adapter supplies Romanian; existing adapters retain
English. This is a TypeScript contract change, not a database migration.
`targetLanguage` continues to select the generated RO or EN editorial independently.
Generation prompts already pass `sourceLanguage` separately. RO-to-EN classification
reuse still requires the identical primary candidate, including its source language.
Fingerprinting, freshness, source verification, identity, QA and review-pair controls
are unchanged. No trust promotion or identity bridge is added for this source.

## Evidence and limitations

Local read-only checks on 28 October 2026:

- Feed: HTTP 200, ten items; all ten excluded by the AI relevance filter. This is a
  correct empty result, not evidence of a broken feed.
- `/press_rel_23_2025`: HTTP 200, Romanian canonical document, original date
  19 March 2025, six editorial paragraphs after excluding the views counter.
  This old AI pilot announcement is an extraction sample only; it is ineligible
  for the normal 30-day freshness window and must not be used to force generation.
- The current 20 October director-selection notice was used to inspect the same
  layout. It is not AI news and the adapter rejects it on relevance.

These are local extraction checks, not Railway execution or RO/EN generation proof.
Short source notices may fail the existing generation length/QA gates; do not pad
the result or lower those gates. There is no recent eligible AI candidate in the
inspected feed to justify an AI generation probe now.

## Controlled next step

Offline plan, no credentials or network:

```sh
node --import tsx scripts/flash-first-source-expansion-preview.ts --source ro-education
```

After merge and an approved deployment to the existing no-cron staging probe service:

```sh
node --import tsx scripts/flash-first-source-expansion-preview.ts --probe --source ro-education
```

The network probe requires the known staging project/environment and contacts only
the explicitly selected source. `ro-education` is not added to the default multi-source
probe. No model client, Payload instance, writes or registry activation are involved.
An empty feed selection proves discovery/filtering only; it does not prove article
retrieval in Railway. Keep later registration and activation separate, with AUTO off,
and review a recent AI-specific candidate before any generation trial.
