# RES-003 — Producer recovery disposition

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Scope:** conservative recovery classification for producer failures  
**Environment impact:** code only; no Railway change; no database schema change; no production mutation

## 1. Goal

Classify each persisted producer failure reason into a conservative recovery disposition.

RES-003 answers only:

> Is it safe to recommend repeating the same request as-is?

It does not execute any retry or requeue.

## 2. Dispositions

Two dispositions are defined:

- `doNotRetry` — repeating the same request unchanged is not recommended;
- `manualAssessment` — the available failure reason is not sufficient to decide safely.

No producer failure reason is marked as automatically retryable in RES-003.

## 3. Why no automatic retryable class yet

The current bounded reason `provider_error` intentionally hides raw provider details.

That same reason may represent:

- a transient timeout;
- a rate limit;
- a server-side 5xx;
- invalid credentials;
- invalid model/configuration;
- account/billing restrictions;
- another provider-side 4xx.

Therefore `provider_error` cannot safely imply retry.

The same principle applies to `execution_error` and malformed structured-output cases: they require context before requeue.

## 4. Conservative mapping

### manualAssessment

- `provider_error`
- `provider_structured_output_invalid_json`
- `provider_structured_output_incomplete_json`
- `provider_structured_output_non_json`
- `provider_structured_output_multiple_text_blocks`
- `execution_error`

### doNotRetry

- `invalid_input`
- `configuration_error`
- `provider_output_truncated`
- `provider_refusal`
- generic/domain `invalid_output*` reasons

`doNotRetry` means: do not repeat the same request unchanged. It does not prohibit a later run after configuration, prompt, model, input or policy changes.

## 5. Persistent audit

RES-003 adds nullable recovery-disposition metadata next to each producer failure reason in the existing JSON `evidenceSummary`.

Examples:

- `verificationFailureReason: "provider_error"`
- `verificationRecoveryDisposition: "manualAssessment"`

and:

- `extraordinaryClaimFailureReason: "provider_output_truncated"`
- `extraordinaryClaimRecoveryDisposition: "doNotRetry"`

Successful and not-run producers keep a null recovery disposition.

Because this remains inside the existing JSON audit field, no database migration is required.

## 6. Safety boundary

RES-003 does not:

- enable automatic retry;
- execute requeue;
- call a provider;
- change `EvaluateFlashEngineTask.retries`;
- change RES-001 operator authorization;
- change the Decision Engine;
- change editorial state;
- change Railway;
- change production.

## 7. Follow-up boundary

A later resilience slice may safely introduce sanitized provider transport metadata, such as a bounded HTTP-status class or network-timeout category.

Only then should the system consider introducing a true `retryCandidate` disposition for clearly transient failures such as timeout, rate-limit or selected 5xx classes.
