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
