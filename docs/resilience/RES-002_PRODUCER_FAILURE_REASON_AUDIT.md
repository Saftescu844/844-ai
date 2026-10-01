# RES-002 — Producer failure reason audit

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Scope:** persistent audit visibility for semantic producer failures  
**Environment impact:** code only; no Railway change; no database schema change; no production mutation

## 1. Goal

Preserve the stable failure reason already produced by semantic and factual producers in the persistent Flash Engine audit summary.

Before RES-002, `evidenceSummary` recorded only:

- `completed`;
- `failed`;
- `notRun`.

That was not sufficient to distinguish a provider transport failure from truncated output, refusal, invalid structured output, invalid input or an internal execution error.

## 2. Safety model

RES-002 does not persist raw provider responses or Error objects.

It stores only the existing bounded internal failure reason enum, for example:

- `provider_error`;
- `provider_output_truncated`;
- `provider_refusal`;
- `provider_structured_output_invalid_json`;
- `invalid_output`;
- `execution_error`.

Successful or not-run producers receive a null failure reason.

## 3. Audit shape

Existing producer status fields remain unchanged.

Additional nullable fields are added inside the JSON `evidenceSummary` projection, including:

- `claimExtractionFailureReason`;
- `verificationFailureReason`;
- `contradictionsFailureReason`;
- `safetyFailureReason`;
- `medicalInterpretationFailureReason`;
- `extraordinaryClaimFailureReason`;
- `regulatoryStatusFailureReason`.

Because `evidenceSummary` is already a JSON field, this change does not require a database migration.

## 4. Behavioral boundary

RES-002 does not:

- classify failures as retryable or non-retryable;
- enable automatic retry;
- change `EvaluateFlashEngineTask.retries`;
- requeue a failed job;
- change the Decision Engine;
- change editorial state;
- call a provider;
- change Railway;
- change production.

The purpose is observability and auditability only.

## 5. Why this precedes retry classification

RES-001 introduced a safe controlled requeue path for jobs that genuinely fail.

However, many semantic provider failures are deliberately converted into producer-level `ok:false` results while the runtime continues conservatively toward REVIEW / engine uncertainty.

Retry policy must therefore distinguish:

1. job-level technical failure;
2. producer-level provider/output failure;
3. normal editorial uncertainty.

Persisting the exact bounded producer failure reason is the prerequisite for making that distinction without guessing.

## 6. Follow-up boundary

A later resilience slice may define a conservative retryability classifier over these stable reasons and provider transport metadata.

That later slice must remain separate from any automatic execution or backoff policy.
