# RES-001 — Controlled failed-job requeue

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Scope:** controlled retry preparation for Flash Engine jobs  
**Environment impact:** code only; no Railway change; no database schema change; no production mutation

## 1. Goal

Provide a safe recovery path for a failed Flash Engine Payload job without enabling automatic retries.

The existing task keeps:

`retries: 0`

This is deliberate.

## 2. Why native same-job retry remains disabled

Flash Engine audit persistence uses a deterministic run identifier derived from the Payload job ID:

`flash-engine-job:<job-id>`

The `flash-engine-runs.runId` field is unique.

A native retry of the same Payload job would therefore attempt to reuse the same audit run identity after a failed attempt. Until the audit model is explicitly redesigned for multiple attempts per logical job, enabling native same-job retries would risk violating the audit uniqueness contract.

RES-001 does not weaken that contract.

## 3. Controlled recovery model

A failed job can be used only as the source for a new queue operation.

The controlled requeue:

- verifies the exact source job ID;
- requires the Flash Engine task and manual queue;
- requires `hasError=true`;
- rejects a job still marked as processing;
- requires at least one recorded attempt;
- validates the stored Flash ID and model;
- requires the original stored provider authorization;
- requires explicit operator authorization for the new job write;
- requires explicit authorization for a provider-capable retry job;
- is restricted to the known Railway staging target;
- creates a fresh equivalent job, or reuses an already untouched equivalent pending job.

The failed source job is never rewritten or reset.

## 4. Execution boundary

Requeue and execution remain separate operations.

RES-001:

- does not call Anthropic during requeue;
- does not execute the replacement job;
- does not publish or unpublish FlashAI;
- does not change editorial state;
- does not enable automatic retry;
- does not modify production.

A later worker run may execute the newly queued job under the existing execution guards.

## 5. Operator CLI

The staging-only CLI is:

```text
pnpm exec tsx scripts/flash-engine-retry-failed.ts \
  --job-id <failed-job-id> \
  --allow-job-write \
  --allow-provider-requests
```

The CLI emits structured runtime events under:

`flash.engine.retry-enqueue`

Successful retry enqueue events include both the failed source job ID and the replacement/pending job ID.

## 6. Follow-up boundary

RES-001 intentionally does not introduce:

- automatic backoff;
- provider-specific retry classification;
- same-job retry;
- retry counters beyond Payload's existing job history;
- dead-letter queues;
- production rollout.

Those require separate design and validation after the controlled replacement-job path is proven in staging.
