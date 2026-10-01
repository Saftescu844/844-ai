# RES-005 — Transport-aware retry candidate policy

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Scope:** conservative recovery policy using sanitized provider transport metadata  
**Environment impact:** code only; no Railway change; no database schema change; no production mutation

## 1. Goal

Refine the producer recovery disposition introduced in RES-003 by using the sanitized provider transport category introduced in RES-004.

RES-005 introduces one new disposition:

`retryCandidate`

This means only:

> repeating the same provider operation may be reasonable after operator/policy review.

It does **not** authorize automatic retry or execute a requeue.

## 2. Provider transport mapping

For:

`reason: "provider_error"`

the bounded transport category now determines recovery disposition.

### retryCandidate

- `timeout`
- `rateLimited`
- `serverError`
- `networkError`

These categories are transient enough to justify consideration for a controlled requeue.

### doNotRetry

- `clientError`

A provider-side 4xx client failure should not be repeated unchanged without first correcting credentials, model/configuration, request shape, account state or another client-side cause.

### manualAssessment

- `unknown`
- missing transport category

Without enough bounded evidence, the system does not guess.

## 3. Non-provider failure behavior

Existing RES-003 policy remains unchanged for non-transport reasons.

Examples:

- configuration/input problems remain `doNotRetry`;
- provider refusal and truncation remain `doNotRetry`;
- malformed structured provider output remains `manualAssessment`;
- unexpected execution errors remain `manualAssessment`.

## 4. Persistent audit

The existing recovery-disposition fields inside `evidenceSummary` now use both:

- producer failure reason;
- sanitized transport category.

Example:

```text
reason: provider_error
transportCategory: rateLimited
recoveryDisposition: retryCandidate
```

No database migration is required because the metadata remains inside the existing JSON audit field.

## 5. Safety boundary

RES-005 does not:

- enable automatic retry;
- change `EvaluateFlashEngineTask.retries`;
- execute RES-001 requeue;
- change the RES-001 operator authorization gates;
- add backoff or retry scheduling;
- call a provider;
- modify Decision Engine behavior;
- modify editorial/publication state;
- modify database schema;
- modify Railway;
- modify production.

## 6. Why RES-001 is not changed here

RES-001 is an explicit operator-controlled recovery tool.

RES-005 intentionally does not make RES-001 depend on the new disposition yet.

That separation allows us to validate the policy in audit first, before deciding whether the requeue tool should:

- require `retryCandidate`;
- allow explicit override for `manualAssessment`;
- always block `doNotRetry`;
- or remain fully operator-driven.

That decision belongs to a separate resilience slice.

## 7. Follow-up boundary

A later slice may connect the audited recovery disposition to the controlled requeue workflow.

Any such connection must preserve explicit authorization and must not silently introduce automatic provider requests.
