# Anthropic News preparation

26 October 2026. Prepared after staging PR #283. No source registration, activation, AI call, deployment or publication is performed by this implementation.

## Discovery and extraction

Use the catalogue endpoints `https://www.anthropic.com/` and `https://www.anthropic.com/news`. The observed English listing has `TableView` summary rows with separate title-link and date components. Match component names and suffixes without pinning the generated CSS hash. Inspect at most 50 summary rows; ignore category links, hidden/inert expanders, navigation and duplicate article URLs. Feed missing/invalid/future/old dates into the existing freshness reasons.

Article URLs must be HTTPS on the exact registered Anthropic host (www alias accepted), without credentials or custom ports, and use `/news/<slug>`. Require a matching canonical URL, English document, one marked ArticlePage article, one ArticleHero title, the metadata block labelled Published, its visible time, and one `data-article-body` region. A datetime attribute, when present, must match the visible original date. Updated or related-card dates do not substitute for publication.

The first body paragraph supplies the lead and is retained in the full body. The observed meta-description is generic company marketing and is deliberately not used as article evidence. Retain body paragraphs/list items; exclude navigation, surrounding UI, hidden content, scripts, figures and code. No scientific paper identity or independent performance validation is inferred.

Workspace HTTP 200 / extraction evidence:

| Sample | Original date | Body extraction |
| --- | --- | --- |
| News listing | 19 distinct articles, 15 within 30 days | 4 rejected as too old at 2026-10-26T20:10Z |
| `/news/s1-sec` | 26 October 2026 | 4 paragraphs, 239 words |
| `/news/donating-agent-skills-to-the-agentic-ai-foundation` | 22 October 2026 | 7 paragraphs, 364 words |

Some source notices are brief. Extraction success does not establish that a faithful generated Flash can satisfy the existing editorial word-count/QA gates. Do not pad or bypass them.

## Integration and controlled proof

The existing opt-in HTML planner now recognizes the exact Anthropic listing. The existing worker uses the same freshness, deduplication, candidate budgets, classification reuse, QA and atomic reciprocal review-pair writer. Explicit allowlisted structural adapter failures are skipped transiently within the existing three-attempt maximum; other errors remain fail-closed.

Offline source-specific plan:

```sh
node --import tsx scripts/flash-first-source-expansion-preview.ts --source anthropic-news
```

Approved staging runtime proof, after merge and deployment to the dedicated no-cron, restart-NEVER one-shot service:

```sh
node --import tsx scripts/flash-first-source-expansion-preview.ts --probe --source anthropic-news
```

The new selector contacts only Anthropic. It does not retry OpenAI's confirmed Cloudflare-challenged article endpoint. The probe reports bounded listing/freshness/extraction counts and the original date, with no model client, Payload instance, CMS writes or activation. Workspace HTTP success is not Railway runtime proof.

Proposed source settings for later activation: primary/high for its own institutional announcements, paraphrase with source link, News/Tools/Education/Business pillars, maximum 10 candidates per scan and 40 per day, automatic publication disabled. Product capabilities and results must remain attributed to Anthropic; high institutional trust does not establish independent research or clinical validity. Register/enable ingestion and deploy the worker only after the runtime result has been reviewed. Production remains separate.
