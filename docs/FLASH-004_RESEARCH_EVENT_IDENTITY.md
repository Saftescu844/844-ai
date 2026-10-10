# FLASH-004 — Source-grounded research event identity

## Scope

Extends the Google Research / MIT News article adapters with one deterministic
primary-research evidence signal that can ground Flash event identity before
pre-persistence dedup.

This change does not alter schemas, source permissions, AUTO settings,
scheduling, model calls, translation, Payload persistence, or publication.
Production remains outside scope.

## Primary-evidence contract

The source adapters may expose one unique primary arXiv link when the source
itself labels that link as the article's primary research artifact:

- Google Research: an anchor labelled `Tech report`.
- MIT News: an anchor whose visible label begins with `paper`.

Only HTTPS `arxiv.org/abs/<modern-id>` links are accepted. Credentials,
custom ports, other hosts, and non-`/abs/` paths are ignored. arXiv version
suffixes, query strings, and fragments are removed before the URL is retained.
More than one distinct accepted primary arXiv link fails closed.

The normalized candidate carries these links as `primaryEvidenceUrls`.
This preserves evidence provenance without adding a database field.

## Grounded event identity

`evaluateExplicitGroundedEventIdentity` accepts a retained primary arXiv
evidence link as an explicit primary identifier:

- authority: `arxiv`
- stable ID: the base arXiv identifier, for example `2609.20738`

Exactly one primary identifier can ground the existing
`flash-event:v1` event fingerprint. Multiple distinct primary identifiers
remain ambiguous. If no explicit stable identity exists, the event remains
pending.

The event identity is not inferred from article title, publication date,
article URL, fuzzy matching, embeddings, or model output.

## Fixed staging samples

Validated on 2026-10-04 against the same fixed public samples used by
`scripts/flash-research-article-preview.ts`:

- Google Research — `2609.20738`
  (`Harnessing Generative UI for Education: Tailored Learning Interactives`).
- MIT News / InstructMesh — `2608.28534`
  (`InstructMesh: Selective Refinement of Generative 3D Models for Fabrication`).

The MIT paper also has an ACM DOI, but this pilot does not infer DOI/arXiv
alias equivalence from external metadata. It uses the explicit primary arXiv
link carried by the source article.

The staging preview validates the expected arXiv identity, builds the
deterministic event fingerprint, and reports metadata/digests only. It does
not generate, persist, or publish content.

## Verification

Targeted tests cover:

- Google and MIT primary-evidence extraction;
- arXiv version/query/fragment canonicalization;
- propagation into normalized candidates;
- event identity and deterministic fingerprint input;
- ambiguous multiple-primary-evidence failure;
- unchanged article-body/provenance boundaries and source permissions.

The full protected `quality-gate` remains the merge authority for staging.

## 2026-10-10 extension: Google Research primary NBER papers

The original arXiv-only examples above remain valid. Google Research can
also carry a labelled `Paper` anchor to a **primary NBER working paper**.
This extension is deliberately narrow:

- Only a `Paper` label extracted by the **Google Research** article adapter
  qualifies; arbitrary article body links and MIT NBER links do not qualify.
- Require HTTPS with no credentials or custom port, and the exact host
  `nber.org` or `www.nber.org`, not a look-alike subdomain.
- Require the exact path `/papers/w<4-9 digits>` (optional trailing slash);
  strip tracking parameters and fragments and normalize to
  `https://www.nber.org/papers/w<number>`.
- Map that official working-paper identifier deterministically to the
  NBER DOI pattern `10.3386/w<number>` for the existing `doi` event
  authority. This is **not** inference from title, publication date, or AI
  output. The code does not fetch the NBER page or establish article-paper
  title correspondence by itself.
- Never select one of multiple distinct labelled primary evidence links:
  mixed arXiv/NBER (or multiple NBER) evidence fails closed.
- A confirmed primary DOI takes precedence over the **same DOI** repeated
  in the article body, which by itself remains contextual and ungrounded.

For the Google Research post `does-better-work-always-mean-better-workers`,
the publicly documented study is NBER Working Paper 35720, DOI
`10.3386/w35720`, verified against the official NBER catalog.
**The live Google `Paper` anchor must still be validated end-to-end
before asserting that this specific post is unblocked.** The extension
allows only a source-labelled and strictly allowlisted link, not a
hand-supplied unverified source.

Fixed integration fixtures include valid and invalid NBER links, spoofed
domains, secondary citations, ambiguous primary links, normalization
and existing arXiv regressions. No schema changes, publishing, cron,
or production configuration are in scope. Run the protected staging
quality gate before any merge approval.
