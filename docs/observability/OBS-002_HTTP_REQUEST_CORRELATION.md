# OBS-002 — HTTP request correlation

**Project:** 844-ai.ro  
**Chapter:** 31 — Observability tehnică și editorială end-to-end  
**Scope:** selected public write routes  
**Environment impact:** code only; no database schema change; no Railway configuration change; no production mutation

## 1. Goal

OBS-002 adds a server-owned request correlation ID to selected public HTTP workflows so an operator can connect:

`HTTP request -> structured runtime event -> route outcome -> downstream service failure`

The first routes are deliberately limited to:

- `POST /api-newsletter`
- `POST /api-account/register`

These two routes combine public input, database writes and email delivery, and already use anti-enumeration responses that can intentionally hide internal failures from the caller.

## 2. Request ID contract

Each request receives a new server-generated UUID.

The ID is:

- returned as `X-Request-ID`;
- used as the structured-event `correlationId`;
- not derived from email, name, IP address or other personal data;
- not copied from query parameters;
- generated independently for every request.

## 3. Structured events

### Completion

Event:

`http.request.completed`

Data:

- HTTP method;
- URL path only;
- HTTP status;
- duration in milliseconds.

Query strings and request bodies are not logged.

### Internal failure

Event:

`http.request.internal-failure`

Internal failures are represented by stable error codes such as:

- `NEWSLETTER_PAYLOAD_UNAVAILABLE`
- `NEWSLETTER_RESEND_CONFIRMATION_FAILED`
- `NEWSLETTER_CREATE_FAILED`
- `NEWSLETTER_SEND_CONFIRMATION_FAILED`
- `NEWSLETTER_PROCESSING_FAILED`
- `ACCOUNT_REGISTER_PAYLOAD_UNAVAILABLE`
- `ACCOUNT_REGISTER_RATE_LIMIT_FAILED`
- `ACCOUNT_REGISTER_LOOKUP_FAILED`
- `ACCOUNT_REGISTER_CREATE_OR_SEND_FAILED`
- `ACCOUNT_REGISTER_CLEANUP_FAILED`

The structured event does not serialize the Error object, stack, provider response or user-supplied values.

## 4. Anti-enumeration compatibility

The public response behavior is preserved.

A newsletter or registration workflow may still return the generic `verifica_emailul` response when an internal dependency fails, but the server log now contains a correlated, sanitized internal-failure event.

This improves operator diagnosis without exposing account/subscriber existence or infrastructure details to the public caller.

## 5. What OBS-002 does not do

OBS-002 does not:

- add database tables;
- change Payload collections;
- change RLS or grants;
- add Sentry/OpenTelemetry;
- add distributed tracing;
- log IP addresses;
- log email addresses or names;
- alter registration/newsletter business rules;
- change email provider behavior;
- modify production.

## 6. Next slice

After validation, extend the same request-context contract only where it adds operational value:

- newsletter confirmation/unsubscribe;
- comments;
- selected authenticated/account endpoints.

Do not blanket-instrument every route before event quality is proven useful.
