# Staging handoff exit diagnostics — 2 November 2026

## Observed incident

Railway `resilient-harmony` / environment `a589dc28-1c59-468c-9eb4-351fce8fa17b`
is staging despite its environment name `production`. The affected service is
`flash-engine-worker` (`d479e8ea-00a4-4b58-87a0-fc3221f4679c`), pinned to
`121966b82a739c18aa19c9cdbb159b7919bc8152` (PR #291).

The bounded log search from 2026-11-01 07:00 UTC through 2026-11-02 08:10 UTC
returned 20 `FLASH_RSS_STAGE_NEXT_FAILED` markers. These are execution failures,
not necessarily 20 failed image builds. Railway's current environment summary
reported zero recent failed deployments even though the execution logs retained
these failures; it is insufficient for historical cron diagnosis.

Three sampled terminal audit events (November 1 22:07, November 2 06:04 and
07:03 UTC) report `RSS_HANDOFF_FAILED`, `generation-ro`, source 4,
`unknown/unclassified`. The latest sample selected the Commission's 6G article
after an unsupported UNESCO layout was skipped. It also reported a separate
source-9 discovery parsing error; neither that nor the UNESCO skip proves the
cause of the fatal source-4 child failure. No RO/EN IDs were returned by those
failed runs. This is not a database-wide assertion that no drafts exist.

The next observed staging run, 08:03 UTC (10:03 Romania), succeeded with
`FLASH_RSS_STAGE_NEXT_EMPTY`: 107 discovered, 83 existing source URLs,
30 remembered rejected URLs, zero eligible candidates. An empty success does
not demonstrate repaired generation. The production web service remained online;
the separate production worker's latest execution was reported successful at
06:00:26 UTC. Its editorial outcome was not audited in this incident task.

## Change and limits

Before handling a child failure, emit `FLASH_RSS_STAGE_NEXT_CHILD_EXIT` with only
source ID, language, bounded numeric exit code, signal presence, a fixed process
error category, UTF-8 stdout/stderr byte counts, exact application failure marker
presence, and Node unsettled-await warning presence. No raw captured text,
Error object, arbitrary error code, path, credentials or provider response is
forwarded. Existing failure classification and fail-closed behavior are retained.

Exit 13 alone does not prove a loader problem; the warning flag records only an
observed warning and does not establish a root cause. Historical failures cannot
be retroactively classified from this new diagnostic. This change improves
evidence for the next naturally scheduled run; it does not claim to repair the
underlying source-4 failure. No automatic retry, skip, provider request, source
expansion, budget change, SQL/CMS write or schema migration is added.

## Rollout boundary

Target only the staging hourly worker. Review the exact staged environment diff
before deployment; never promote the whole current main branch or modify the
production worker/web service to diagnose this staging incident. Obtain approval
for deploying the reviewed patch commit based directly on the live PR #291 pin,
not the later staging merge tree (which also contains separate PR #292/#293 work).
Obtain approval
for the concrete merge and worker deployment. Do not manually replay generation
or clear candidate memory. After deployment inspect the next scheduled terminal
outcome, and correlate a child-exit record with source ID and language.

If a run returns empty, leave its success intact and do not claim the diagnostic
was exercised. A reproduced classified failure is the evidence needed to design
the next behavioral fix. Returning to the previous reviewed worker pin is the
rollback if the diagnostic change itself causes a regression.
