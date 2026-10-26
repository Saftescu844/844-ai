# First source expansion — institutional discovery

26 October 2026. Base: staging PR #279, 810b2f7. No registry changes, AI calls, deployment or publication in this implementation.

The target lot is UNESCO, European Commission, OpenAI and Anthropic. This PR prepares the two HTML sources whose markup was available for inspection. It does not claim all four are operational.

| Source | Implementation | Current evidence / remaining work |
| --- | --- | --- |
| UNESCO AI in Education | Explicit HTML listing and article extraction; existing candidate normalization and review-only pipeline | Workspace GET 200 for listing and article. Seven same-host cards, four within 30 days on 26 October. Sample article: original publication 19 October, 12 paragraph/list items, 458 body words (lead separate). Runtime probe, registry entry and controlled generation still required. |
| EC Digital Strategy / AI | Existing article extractor retained; dated listing cards now enter the same staging runner | Workspace listing GET 200; one card dated 22 October. Sample article GET timed out twice. Current article access/extraction still needs staging proof. Existing allowIngestion entry is not changed here. |
| OpenAI News | Existing RSS remains available to the existing RSS-only planner; new bounded endpoint probe | Workspace GET returned 403. No article adapter implemented or activation. Verify access from Railway, then inspect actual article markup before adding an adapter. |
| Anthropic News | New bounded endpoint probe only | Workspace GET returned 403. No article/listing adapter implemented or activation. Verify access from Railway, then inspect actual markup. |

Public web retrieval of rendered Anthropic/UNESCO content is useful editorial evidence, but does not establish HTTP access or extraction from the worker. Refusals are not bypassed. The EC and UNESCO source URLs and discovery URLs are the exact existing catalogue entries.

## Integration

`planFlashRssIngestionSources(payload, { includeHtml: true })` is used only by the staging stage-next runner. Existing callers remain RSS-only by default. HTML source plans require the exact supported host/listing path, HTTPS, active/allowIngestion selection from the CMS and the existing source-configured scan/day bounds. No synthetic feed, extra scheduler or competing writer is added.

The inert parse5 listing adapters inspect at most 50 dated cards, exclude navigation and off-host links, and deduplicate canonical article URLs. Only original visible dates are used; absent/invalid dates are passed to the existing freshness filter with a bounded reason. Publication dates are checked again from the article before AI. UNESCO extraction retains the original visible publication date, English title and lead, body paragraphs and list items, excludes surrounding UI/scripts, and rejects missing or ambiguous required structure. It does not infer clinical validation or scientific identity.

Discovered items use the existing URL/rejection memory, freshness, daily budget, sorting, eligible scan limit and maxAttempts=3. RO classification reuse, source verification, editorial QA, final dedup and transactional reciprocal review drafts are unchanged.

A discovery retrieval/parse failure is counted per source and does not suppress other sources. If every selected source fails discovery, the run fails with RSS_ALL_SOURCES_FAILED rather than reporting a healthy empty scan. Unknown downstream QA/persistence failures still fail closed.

## Controlled rollout

1. Merge after CI and review approval.
2. Deploy the read-only `scripts/flash-first-source-expansion-preview.ts --probe` on the staging one-shot service, with no cron and no model calls. It checks all four catalogue endpoints sequentially and extracts the newest fresh EC/UNESCO sample article, with the existing size/time/redirect limits. The script imports no Payload instance and never changes source permissions. Exit is nonzero on retrieval/parse failures; a retrieved OpenAI/Anthropic endpoint still explicitly reports that the article adapter is pending.
3. Validate source article extraction from the staging runtime before worker rollout. UNESCO must be explicitly registered with approved source role, trust, citations and allowed pillars; no permission is inferred from an HTTP 200 response.
4. Deploy the staging worker only after the bounded probe and source preparation have been reviewed. This enables the existing EC HTML source in that runner; adding UNESCO requires its separate registry entry.
5. Observe the first scheduled run, reciprocal RO/EN metadata and review-only state. Existing drafts remain unchanged; production is separate.

Default/offline preview:

```sh
node --import tsx scripts/flash-first-source-expansion-preview.ts
```

The runtime probe reports bounded counts and statuses, never raw HTML/provider responses or credentials. No source is made active simply by running a probe. Until the remaining adapters and rollout checks are complete, OpenAI and Anthropic remain pending work in this same expansion lot.
