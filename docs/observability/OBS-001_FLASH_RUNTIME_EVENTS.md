# OBS-001 — Flash runtime structured events

**Project:** 844-ai.ro  
**Chapter:** 31 — Observability tehnică și editorială end-to-end  
**Scope:** first implementation slice  
**Environment impact:** code only; no database schema change; no Railway configuration change; no production mutation

## 1. Goal

OBS-001 introduces a small machine-readable runtime event contract before adding dashboards, alerting, tracing backends or third-party observability products.

The first target is the controlled Flash Engine execution path because it already has a strong deterministic correlation key:

`payload_jobs.id -> flash_engine_runs.run_id = flash-engine-job:<job-id>`

The goal is to make the same identifier visible in ordinary runtime logs so an operator can move from Railway logs to Payload job state and then to the persistent Flash Engine audit record.

## 2. Current baseline

Before OBS-001:

- Flash Engine already persists a read-only audit record in `flash-engine-runs`;
- each evaluation has a deterministic `runId`;
- Payload jobs and audit runs can already be correlated logically;
- CLI output is primarily human-readable;
- there is no generic `correlationId`, `requestId` or `traceId` contract in the application;
- there is no Sentry/OpenTelemetry dependency;
- no separate observability backend is required for this slice.

## 3. Structured event envelope

Every structured runtime event has:

- `schemaVersion: 1`
- ISO-8601 `timestamp`
- `level`
- stable `event`
- stable `component`
- `status`
- optional `correlationId`
- flat primitive-only `data`

The data contract intentionally rejects arbitrary nested payloads at the type boundary.

Do not log:

- API keys or tokens;
- provider response bodies;
- request bodies containing personal data;
- Error objects;
- raw source pages;
- arbitrary Payload documents.

## 4. Flash Engine events in this slice

### Enqueue

Event:

`flash.engine.enqueue`

Component:

`flash-engine-enqueue-cli`

On success the correlation ID is:

`flash-engine-job:<job-id>`

### Run by ID

Event:

`flash.engine.run-by-id`

Component:

`flash-engine-run-by-id-cli`

On success the correlation ID is:

`flash-engine-job:<job-id>`

### Run next

Event:

`flash.engine.run-next`

Component:

`flash-engine-run-next-cli`

Possible statuses:

- `success`
- `noop`
- `failed`

A successful execution uses:

`flash-engine-job:<job-id>`

A queue-empty no-op has no correlation ID because no job execution exists.

A CLI/guard failure can occur before a job is identified. Such failures therefore remain valid structured events without a correlation ID.

## 5. Compatibility

Existing human-readable markers remain in place:

- `FLASH_ENGINE_ENQUEUE_OK`
- `FLASH_ENGINE_ENQUEUE_FAILED`
- `FLASH_ENGINE_RUN_BY_ID_OK`
- `FLASH_ENGINE_RUN_BY_ID_FAILED`
- `FLASH_ENGINE_RUN_NEXT_OK`
- `FLASH_ENGINE_RUN_NEXT_EMPTY`
- `FLASH_ENGINE_RUN_NEXT_FAILED`

OBS-001 adds a JSON line; it does not remove the existing operator-friendly output.

## 6. Security and privacy boundary

Structured events contain only an allow-listed flat primitive data map.

Failure events use stable error codes in the structured record. The generic event contract does not accept an Error object or nested provider payload.

This is observability, not a second audit database. The existing `flash-engine-runs` collection remains the persistent technical audit authority for completed/failed Flash Engine evaluations.

## 7. What OBS-001 does not do

OBS-001 does not:

- add a database table;
- change Flash editorial state;
- publish content;
- call a provider;
- add retries;
- add cron/scheduling;
- change Railway variables/services;
- install Sentry/OpenTelemetry;
- create alert rules;
- add an external metrics system.

## 8. Chapter 31 continuation

After OBS-001 is validated, the next slices should stay incremental:

1. propagate a correlation/request ID through selected HTTP routes;
2. define explicit health/readiness checks per service;
3. define technical metrics and editorial metrics separately;
4. detect silent failures and stalled flows;
5. map the editorial chain:
   `Source -> Signal -> Event -> Claim -> Evidence -> Candidate -> Publication -> Watch`;
6. add alerting only after stable events/metrics exist;
7. build module dashboards from the validated signals;
8. connect incidents back to constitutional/editorial compliance evidence.

No external observability platform should be selected before the event and metric contracts are stable.
