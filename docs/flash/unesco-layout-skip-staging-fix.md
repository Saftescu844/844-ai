# UNESCO unsupported article layouts in staging

## Observed failure

Runs 91–94 (26 October 2026 22:01 UTC through 27 October 01:06 UTC) selected the same UNESCO event page:
`https://www.unesco.org/en/articles/critical-literacy-age-artificial-intelligence-understanding-evaluating-and-taking`.
They stopped during the RO handoff with `unknown / unclassified`, before any pair was saved.
Applying the existing extractor to a read-only capture of that page reproduced
`UNESCO article requires one lead.` Its event layout does not provide the article description field expected by the adapter.

## Resulting behavior

The UNESCO extractor continues to require an English document, one main container,
headline, original publication region, description and article body with paragraphs.
Missing, empty or ambiguous required structure now produces
`FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: <bounded field>`.
Only the six declared UNESCO fields are recognized as layout skips; URL failures,
invalid calendar dates and unknown errors retain their existing behavior.

The worker uses its existing transient skip path, records
`article-extraction / article_layout_not_supported`, consumes one attempt and tries
the next eligible candidate. The maximum remains three. No permanent rejection memory
is written for a structural skip, so a repaired page can be considered in a later run.
The diagnostic also recognizes the already supported OpenAI and Anthropic layout markers.
No HTML, generated text or arbitrary child error text is copied into diagnostics.

This change does not add event extraction, infer a missing lead from unrelated text,
relax freshness or editorial QA, enable OpenAI ingestion, or change publication settings.

## Validation and rollout

Regression coverage exercises the event-shaped missing-description case followed by
a supported article, the three-attempt cap, absence of provider/persistence work for
the rejected page, each declared structural field, and unknown-error propagation.
Existing UNESCO original-date/body normalization and OpenAI/Anthropic adapter tests
remain part of validation. Use the existing staging worker deployment procedure after
review; do not change its command, cron, source settings or budgets.

Runtime proof after deployment must show an unsupported UNESCO candidate logged as
`article_layout_not_supported` followed by the next candidate within the attempt limit.
A passing unit test or successful deploy is not that runtime proof. Keep all created
RO/EN pairs as drafts in review and verify their reciprocal association.
