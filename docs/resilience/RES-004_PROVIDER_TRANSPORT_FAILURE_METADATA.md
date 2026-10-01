# RES-004 — Provider transport failure metadata

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Scope:** sanitized transport metadata for provider failures  
**Environment impact:** code only; no Railway change; no database schema change; no production mutation

## 1. Goal

Preserve a small, bounded transport-failure category when a provider SDK request fails.

Before RES-004, SDK exceptions were intentionally collapsed to:

`provider_error`

This protected the system from persisting raw provider errors, but also removed the minimum signal needed to distinguish:

- timeout;
- rate limiting;
- provider/server failure;
- client-side HTTP failure;
- network/connectivity failure;
- unknown transport failure.

RES-004 restores only that bounded signal.

## 2. Bounded categories

The only persisted transport categories are:

- `timeout`
- `rateLimited`
- `serverError`
- `clientError`
- `networkError`
- `unknown`

The classifier is provider-agnostic and uses only bounded structural evidence such as HTTP status class, SDK error name, or common network error code.

## 3. Sanitization boundary

RES-004 does **not** preserve or persist:

- raw Error messages;
- provider response bodies;
- request IDs;
- headers;
- raw provider error codes;
- API keys or credentials;
- SDK-specific error objects.

The controlled application error message remains the stable internal reason, for example:

`provider_error`

The transport category is separate metadata.

## 4. Propagation

The category can flow through:

1. Anthropic/OpenAI semantic executor;
2. `FlashSemanticEvidenceProducerError`;
3. generic or factual producer failure result;
4. Flash Engine audit projection.

The metadata is optional at the producer-result boundary so existing non-provider failures and success contracts remain unchanged.

## 5. Persistent audit

RES-004 adds nullable fields next to the existing producer failure metadata in the JSON `evidenceSummary`, including:

- `claimExtractionTransportCategory`
- `verificationTransportCategory`
- `contradictionsTransportCategory`
- `safetyTransportCategory`
- `medicalInterpretationTransportCategory`
- `extraordinaryClaimTransportCategory`
- `regulatoryStatusTransportCategory`

Successful, not-run, or non-transport failures receive `null`.

Because `evidenceSummary` is already JSON, no database migration is required.

## 6. Recovery-policy boundary

RES-004 does not change RES-003 recovery policy.

A failure such as:

- `reason: "provider_error"`
- `transportCategory: "rateLimited"`

still remains governed by the existing RES-003 disposition until a separate policy slice explicitly changes that behavior.

This separation is deliberate: observability first, recovery policy second.

## 7. Safety boundary

RES-004 does not:

- enable automatic retry;
- execute requeue;
- add backoff;
- change `EvaluateFlashEngineTask.retries`;
- call a provider beyond existing runtime behavior;
- change the Decision Engine;
- change editorial or publication state;
- modify database schema;
- modify Railway;
- modify production.

## 8. Follow-up boundary

A later resilience slice may use only the sanitized transport category to refine recovery disposition.

A conservative future mapping could consider clearly transient categories such as timeout, rate limit, selected server failures, or network failures as retry candidates while keeping client/configuration failures non-retryable.

That policy change is intentionally not part of RES-004.
