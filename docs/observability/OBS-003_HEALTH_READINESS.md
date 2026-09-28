# OBS-003 — Explicit liveness and readiness endpoints

**Project:** 844-ai.ro  
**Chapter:** 31 — Observability tehnică și editorială end-to-end  
**Scope:** explicit health semantics for the web application  
**Environment impact:** code only; no Railway configuration change; no database schema change; no production mutation

## 1. Goal

OBS-003 separates two different operational questions that were previously conflated by using a normal public page as a health check:

- **liveness** — is the application process able to serve HTTP?
- **readiness** — can the application reach the minimum critical dependency required to serve useful traffic?

The existing Railway staging healthcheck remains unchanged in this slice.

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

OBS-003 does not:

- change Railway's configured healthcheck path;
- query Anthropic/OpenAI/Brevo;
- query Storage;
- add a new database table;
- add metrics or alerts;
- expose secrets or raw Error objects;
- mutate application data;
- affect editorial/publication behavior.

## 6. Future operational step

After staging deployment and direct verification of both endpoints, a later separate infrastructure decision may replace Railway's current page-level healthcheck with the explicit readiness endpoint.

That Railway configuration change is intentionally not part of OBS-003 and should require explicit approval.
