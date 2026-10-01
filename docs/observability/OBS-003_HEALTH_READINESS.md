# OBS-003 — Explicit liveness and readiness endpoints

**Project:** 844-ai.ro  
**Chapter:** 31 — Observability tehnică și editorială end-to-end  
**Scope:** explicit health semantics for the web application  
**Environment impact:** endpoint code plus a separately approved staging Railway healthcheck update; no database schema change; no production mutation

## 1. Goal

OBS-003 separates two different operational questions that were previously conflated by using a normal public page as a health check:

- **liveness** — is the application process able to serve HTTP?
- **readiness** — can the application reach the minimum critical dependency required to serve useful traffic?

The endpoint implementation itself does not require an infrastructure change. After direct staging validation, a separate explicitly approved operational follow-up changed Railway staging from the page-level healthcheck to `/api-health/ready`.

## 2. Endpoints

### `GET /api-health/live`

Returns HTTP 200 when the Next.js process is serving requests.

This endpoint deliberately does not touch PostgreSQL or external providers.

Response:

```json
{
  "ok": true,
  "status": "live"
}
```

### `GET /api-health/ready`

Performs one minimal PostgreSQL probe through the application's existing Payload database connection.

Success:

- HTTP 200
- `{"ok":true,"status":"ready"}`

Failure:

- HTTP 503
- `{"ok":false,"status":"not_ready"}`

The public response never exposes connection strings, SQL errors, schema details or provider details.

## 3. Observability

Both endpoints use the server-owned request correlation introduced by OBS-002 and return `X-Request-ID`.

A readiness database failure additionally emits a sanitized internal-failure event with stable code:

`READINESS_DATABASE_UNAVAILABLE`

## 4. Cache policy

Both endpoints return:

`Cache-Control: no-store`

Health state must not be cached by intermediaries.

## 5. Deliberate exclusions

The OBS-003 code slice does not:

- require a Railway configuration change as part of the code merge;
- query Anthropic/OpenAI/Brevo;
- query Storage;
- add a new database table;
- add metrics or alerts;
- expose secrets or raw Error objects;
- mutate application data;
- affect editorial/publication behavior.

## 6. Operational follow-up — completed in staging

After staging deployment, both endpoints were directly validated. The readiness response returned HTTP 200 and `{"ok":true,"status":"ready"}`; `X-Request-ID` was verified against the matching structured-log `correlationId`.

With separate explicit approval, Railway staging was then changed from the page-level `/ro` healthcheck to `/api-health/ready`. The resulting rollout completed successfully on commit `9ce282ab0424469b3f57b01f075e9221d2f212c6`.

This follow-up affected staging infrastructure only. Production remained unchanged.
