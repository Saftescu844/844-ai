# Staging RSS worker: deployment preflight and interrupted execution

## Scope

Run #100 was stopped while generating EN when Railway replaced its deployment.
It saved no pair, but its audit remained `running` because the process disappeared.
Do not call that record completed, infer a provider failure, or expire it merely
because it is old. Its historical correction requires a separate, evidenced operation.

This change adds a read-only deploy check and makes normal process interruption
observable. It does not change cron, attempt limits, providers, QA, source activation,
pair persistence or publication settings. It does not rewrite historical audit rows.

## Pre-deploy command

After review, configure only the known staging worker:

```text
node --import tsx scripts/flash-rss-deploy-preflight.ts
```

Set its pre-deploy timeout to 30 seconds. The command validates project, environment,
worker service, `PAYLOAD_DB_PUSH=false` and the existing staging database guard before
opening a connection. The PG session is read-only, with 5-second connection and query
timeouts. It reads only whether an RSS audit has `status=running`. Any such record,
including an old unresolved one, blocks deployment. Database failures also block it.
No Payload instance, provider request, migration or content/audit write is performed.
Railway does not proceed when a pre-deploy command exits nonzero.

This is an observation immediately before rollout, not a distributed maintenance lock.
A cron execution could start after the check. Continue to inspect current audit and
Railway execution state before applying a staged deployment, and avoid the cron boundary.
Do not claim that this command prevents every possible overlap.

## Graceful interruption

The worker now awaits child processes asynchronously instead of blocking in
`spawnSync`. Its SIGTERM/SIGINT handler requests shutdown, terminates the current
handoff child (SIGTERM, then SIGKILL after 5 seconds if necessary), and prevents a
subsequent handoff or the start of pair persistence. The normal catch/finalization path
records `failed / RSS_PROCESS_INTERRUPTED` with the last checkpoint. This says that a
signal was observed; it does not guess whether a deploy or an operator caused it.

If atomic pair persistence was already entered, it is allowed to settle. A confirmed
pair result remains a successful result. Interruption does not roll back or delete
previous drafts, publish anything, or turn an unknown persistence result into success.
Audit finalization failures retain the existing explicit fallback and unresolved record.

For the next rollout, use the direct Node entrypoint (preserving all existing flags):

```text
node --import tsx scripts/flash-rss-stage-next.ts --model gpt-5.6-terra --max-items 10 --max-attempts 3 --allow-provider-requests --allow-staging-rss-stage-next
```

Configure Railway draining time to 60 seconds so the handler can run. Railway's default
SIGTERM-to-SIGKILL buffer is zero. This setting is necessary alongside the code; a signal
handler cannot help after immediate SIGKILL. A longer drain remains a time budget, not a
guarantee against a stuck database or operation. Hard kill, process crash, unavailable
database or exhausted grace period can still leave an unresolved audit, which the
preflight correctly blocks. No automatic age-based reconciliation is added.

New audit summaries retain only a validated `RAILWAY_DEPLOYMENT_ID` UUID. This provides
a precise join to Railway evidence for later investigations; invalid arbitrary values
are omitted. Existing record IDs, statuses and collection access rules are unchanged.

## Activation sequence

1. Finish the PR checks. Keep the live worker/config unchanged during preparation.
2. Separately review and reconcile #100 using the already documented stop evidence.
   Do not remove `running` rows from the preflight query or bypass the gate to deploy.
3. Verify no execution is active, including in Railway, and avoid the hourly boundary.
4. Stage only the new worker commit, the pre-deploy command and timeout, direct Node
   start command and 60-second draining time. Verify all other fields are unchanged.
5. After the authorized deploy, verify terminal SUCCESS, commit, config, and the next
   scheduled execution. Subsequent rollouts can exercise the new version's handler;
   the old deployed version has no handler, so the first rollout must occur while idle.

## Validation

Tests use fake audit/query clients and local child processes, with no live database or
provider calls. They cover the target boundary, active/unresolved rejection, empty and
invalid query results, failed queries, child stdout/stderr/nonzero exit, output cap,
spawn failure, SIGINT/SIGTERM cancellation, refusal to launch another child after shutdown,
and a real parent SIGTERM during an awaited child with an interrupted audit outcome.
Deployment UUID validation and the existing unknown-disappearance behavior are covered.

Railway references checked while preparing this change:
- https://docs.railway.com/deployments/pre-deploy-command
- https://docs.railway.com/deployments/deployment-teardown
- https://docs.railway.com/variables/reference
