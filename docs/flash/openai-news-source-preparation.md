# OpenAI News preparation

26 October 2026. Prepared on staging after PR #282. Source ID 7 remains unchanged and ingestion disabled; this implementation does not deploy, activate, call AI or publish.

## Confirmed extraction

The existing feed is `https://openai.com/news/rss.xml`. The new adapter supports the observed standard English `https://openai.com/index/<slug>/` article template. It requires the exact OpenAI origin, a matching canonical link, one main/article container, the marked headline and original publication region, and one `data-toc-content` body. It uses the visible hero publication date, never dates on related cards, hydration data or feed dates as a substitute for the article date.

Title, subhead (or explicitly labelled meta-description), body paragraphs and list items enter the existing canonical normalizer. Navigation, scripts, related content outside the body, hidden elements, figures and code samples are excluded. All existing freshness, deduplication, classification reuse, QA and reciprocal review-pair writing remain in place. No scientific paper identity is inferred from an OpenAI announcement.

Observed workspace HTTP/extraction evidence, without AI:

| Sample | Original article date | Body extraction |
| --- | --- | --- |
| `/index/chatgpt-expanding-world-of-work` | 26 October 2026 | 8 paragraphs, 498 words; normalizes to 2026-10-26 |
| `/index/introducing-gpt-5/` | 7 August 2025 | 37 paragraph/list items, 2,274 words; newer related cards do not replace the original date |
| `/index/introducing-gpt-6-1-terra` | Not available in the supported hero structure | Rejected as an unsupported custom hero; no date inferred |

The first 50 feed candidates all pass the existing 30-day feed-date filter at 2026-10-26T19:30Z. This is a bounded scan, not a claim that the entire feed is current or every article template is supported. Each selected article must still pass its own extraction and original-date check before AI.

## Unsupported templates

The worker skips only exact, allowlisted structural error markers emitted by this adapter, using transient reason `article_layout_not_supported`. A skipped page consumes one of the existing maximum three attempts; it is not added to permanent rejection memory. This supports safe continuation past a custom hero while leaving unexpected provider, origin, canonical mismatch, QA and persistence failures unchanged.

## Runtime proof and proposed activation

The existing read-only `scripts/flash-first-source-expansion-preview.ts --probe` now parses the OpenAI feed through the same ingestion parser and freshness filter, then extracts one newest fresh sample. It reports bounded counts and the publication date. It has no model client, Payload instance or CMS writes. The offline plan marks this adapter available; Anthropic remains pending.

Before activation, deploy and run this read-only probe in the known staging runtime and inspect its OpenAI result. A successful workspace fetch does not establish Railway runtime access.

Proposed CMS settings, to be reviewed before activation: primary source for its own announcements and research reports, high trust for those institutional statements, paraphrase with source link, pillars News/Tools/Education/Business, ingestion enabled only after runtime proof, automatic publication disabled. Company performance claims must remain attributed; institutional trust does not independently validate product performance, clinical utility or scientific conclusions. Existing scan/day bounds and review-only writing apply.

No registry permissions are changed by adding the adapter. Worker rollout and source activation remain separate from this preparation.
