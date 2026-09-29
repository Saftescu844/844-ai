# RES-006 — Controlled rerun from retry-candidate audit

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Scope:** controlled enqueue from a completed Flash Engine audit run marked with `retryCandidate`  
**Environment impact:** code only; no Railway change; no database schema change; no production mutation

## 1. Goal

Provide a safe operator-controlled rerun path for a Flash Engine evaluation that completed technically but contains one or more producer failures classified by RES-005 as:

`retryCandidate`

This is intentionally separate from RES-001.

## 2. Why RES-006 is separate from RES-001

RES-001 handles Payload jobs that failed technically:

- `hasError=true`;
- at least one job attempt;
- failed source job remains unchanged;
- a fresh replacement job is queued.

RES-006 handles a different case:

- the Payload job may have completed successfully;
- the Flash Engine audit run has `status=completed`;
- one or more factual/semantic producer results were unavailable because of a transient provider transport failure;
- the Decision Engine continued conservatively, typically toward review;
- the audit contains `recoveryDisposition=retryCandidate`.

These are different operational states and should not be conflated.

## 3. Source of truth

The operator supplies the record ID of an existing `flash-engine-runs` audit row.

RES-006 verifies:

- the audit run exists;
- `status=completed`;
- `provider=anthropic`, because the current Payload queue task is Anthropic-only;
- `flashIdSnapshot` is a positive integer;
- `model` is non-empty;
- the bounded audit summary contains at least one valid `retryCandidate` field.

Only the known recovery-disposition fields are inspected.

### Factual fields

- `claimExtractionRecoveryDisposition`
- `verificationRecoveryDisposition`

### Semantic fields

- `contradictionsRecoveryDisposition`
- `safetyRecoveryDisposition`
- `medicalInterpretationRecoveryDisposition`
- `extraordinaryClaimRecoveryDisposition`
- `regulatoryStatusRecoveryDisposition`

Arbitrary JSON fields do not qualify.

## 4. Controlled enqueue

If all guards pass, RES-006 queues a fresh Flash Engine evaluation for:

- the same `flashIdSnapshot`;
- the same Anthropic model.

The existing queue duplicate guard remains active.

If an untouched equivalent pending job already exists, RES-006 reuses it instead of creating another job.

## 5. Operator authorization

Two explicit approvals remain mandatory:

- job write authorization;
- provider-capable job authorization.

The enqueue helper remains restricted to the exact Railway STAGING target.

No Payload initialization occurs before these safety guards pass.

## 6. Execution boundary

RES-006 only enqueues.

It does **not**:

- run the queued job;
- call Anthropic during enqueue;
- enable Payload native retry;
- change `EvaluateFlashEngineTask.retries`;
- change the source audit run;
- modify FlashAI editorial state;
- publish or unpublish;
- change Decision Engine behavior.

Execution remains a separate, explicitly guarded operation.

## 7. CLI

The controlled staging CLI is:

```text
pnpm exec tsx scripts/flash-engine-rerun-retry-candidate.ts \
  --run-record-id <flash-engine-run-record-id> \
  --allow-job-write \
  --allow-provider-requests
```

Successful enqueue emits the structured runtime event:

`flash.engine.retry-candidate-enqueue`

The event records bounded identifiers and metadata only.

## 8. Audit preservation

The source Flash Engine audit run is never reset, overwritten or reused.

A future execution of the new queued job will receive a new Payload job ID and therefore a new deterministic Flash Engine `runId`.

This preserves the original run and the rerun as separate audit events.

## 9. Safety boundary

RES-006 does not:

- introduce automatic retry or backoff;
- poll for retry candidates;
- execute provider requests automatically;
- modify database schema;
- modify Railway configuration;
- modify production.

## 10. Follow-up boundary

A later resilience slice may improve operator visibility by listing or reporting completed runs with `retryCandidate`.

That should remain observational unless a separate, explicit decision is made to automate any part of the recovery workflow.
