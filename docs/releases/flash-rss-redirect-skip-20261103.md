# RSS candidate replacement after a source-identity redirect rejection

## Problem and behavior

The staging worker repeatedly selects the Commission's 6G funding item. A public
request to its listed URL currently returns a 302 to `smart-networks.europa.eu`.
The retriever correctly rejects this different source host, but the parent does
not classify `redirect_identity_mismatch`; it terminates the run with
`RSS_HANDOFF_FAILED` before trying the next eligible candidate. Recent Railway
logs are consistent with this reproduced path, but their bounded historical
diagnostics do not expose the original child message.

Recognize only the exact existing child failure line for this reason. Keep the
retriever unchanged: never fetch the redirected destination or add it as an
allowed source. Classify the failure as article retrieval / redirect identity
mismatch, remember the original candidate URL with a dedicated reason, and
continue with the next existing eligible candidate within the three-attempt cap.

The existing JSON skip memory stores a 24-hour cooldown for this reason. It is
source-scoped, canonicalizes the original URL, respects the existing 100-entry
bound, rejects future-dated pauses, and expires at 24 hours. It is not a permanent
blacklist. Existing six-hour short-output and seven-day other rejection policies
remain unchanged. Memory persistence errors still fail the run; no attempt is
silently reported successful. No new database schema or source-registry entry is
needed: `surse.rssCandidateSkipMemory` is the existing JSON field.

## Evidence and validation

- Offline mock of the observed 302: exactly one fetch call, no call to the new
  host, `redirect_identity_mismatch`, no retrieved content and no provider call
  for the rejected candidate.
- A later eligible candidate can be processed in the same bounded run. Future
  scans suppress the original URL during the cooldown and reconsider it after
  expiry without clearing unrelated memory.
- Regression checks cover exact versus partial/unknown failure markers, fixed
  diagnostic redaction, expiry boundaries, future timestamps, unchanged network
  protection and failure propagation, memory roundtrip, and the attempt limit.

Passing offline checks does not prove all historical crashes had this cause or
that a future run will produce a draft pair. The live regression must be checked
on the next normally scheduled run after an approved deployment.

## Release scope

Only the staging hourly worker is targeted. Build the isolated worker candidate
directly on `dbd9acdc34af488d59ac5d1cd47ced68a1c58b6f` (PR #301). Preserve existing
staging work in the PR integration tree; do not deploy the broader staging merge
tree. Use a dedicated release branch at the isolated candidate and verify both
source config and deployment commit metadata.

PR preparation does not authorize merge or deployment. No manual AI run, memory
edit/reset, cron/model/budget change, new source, automatic publication, CMS content
change or production deployment is part of this PR. Existing drafts RO 168 / EN
169 remain queued for editorial review. Do not regenerate them for this test.
