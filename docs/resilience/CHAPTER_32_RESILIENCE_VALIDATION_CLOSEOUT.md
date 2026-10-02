# Chapter 32 — Resilience validation closeout

**Project:** 844-ai.ro  
**Chapter:** 32 — Failure handling / retries / operational resilience  
**Environment:** staging only  
**Validation date:** 2026-09-29  
**Validated staging commit:** `cc0a77de04843816b122b5e78a3f70da0a9bed5b`  
**Status:** VALIDATED / CHAPTER CLOSED IN STAGING

---

## 1. Scope completed

Chapter 32 is implemented in staging through:

- RES-001 — controlled failed-job requeue;
- RES-002 — producer failure reason audit;
- RES-003 — recovery disposition;
- RES-004 — sanitized provider transport failure metadata;
- RES-005 — transport-aware `retryCandidate` policy;
- RES-006 — controlled rerun from a completed retry-candidate audit.

The chapter intentionally does not enable automatic provider retry or automatic backoff.

---

## 2. Operational staging validation

A real Flash Engine evaluation was executed in staging after RES-006 was merged.

Validation target:

- Flash ID: `4`;
- provider: `anthropic`;
- model: `claude-sonnet-4-6`;
- queue: `flash-engine-manual`;
- task: `evaluateFlashEngine`;
- Payload job ID: `9`;
- deterministic run ID: `flash-engine-job:9`;
- persisted Flash Engine run record ID: `14`.

The staging worker deployment used for the run was:

- service: `flash-engine-worker`;
- Railway deployment ID: `8122a689-fbad-4db2-bcac-e53b27b173cf`;
- commit: `cc0a77de04843816b122b5e78a3f70da0a9bed5b`;
- deployment status: `SUCCESS`;
- cron: `*/15 * * * *`.

The scheduled worker started at approximately `2026-09-29T10:46:02Z`.

Runtime logs confirmed:

- one new job was claimed;
- zero jobs were retried;
- task `evaluateFlashEngine`;
- queue `flash-engine-manual`;
- execution status `success`;
- structured runtime correlation ID `flash-engine-job:9`;
- terminal marker `FLASH_ENGINE_RUN_NEXT_OK`.

---

## 3. Persistent audit result

The persisted run completed successfully:

- status: `completed`;
- decision: `review`;
- started at: `2026-09-29T10:46:06.200Z`;
- completed at: `2026-09-29T10:46:48.570Z`;
- error code: `null`;
- error message: `null`.

### Factual producers

- claim extraction: `completed`;
- factual verification: `completed`;
- evidence set complete: `true`;
- source corpus complete: `true`.

### Semantic producers

- contradictions: `completed`;
- safety: `completed`;
- medical interpretation: `completed`;
- extraordinary claim: `completed`;
- regulatory status: `completed`.

### RES-002…RES-005 audit metadata

For the healthy run:

- all producer failure reasons are `null`;
- all provider transport categories are `null`;
- all recovery dispositions are `null`;
- runtime `engineCertain=true`;
- runtime `aggregatedEvidenceComplete=true`;
- runtime `missingComponents=[]`.

This is the expected result when no provider/runtime failure occurs.

No `retryCandidate` was expected or produced.

---

## 4. Editorial immutability verification

The Flash source remained editorially unchanged after the evaluation.

Flash ID `4` remained:

- `editorial_status = draft`;
- `automation_decision = review`;
- editorial `updated_at` unchanged from `2026-09-10T10:34:00.656Z`.

The validation therefore confirmed that the Flash Engine evaluation and resilience audit path do not mutate editorial state.

---

## 5. Enqueue method used for this validation

The normal supported operator path remains:

`scripts/flash-engine-enqueue.ts`

and the controlled retry/rerun CLIs documented by RES-001 and RES-006.

For this one-time validation, the available Railway integration did not expose arbitrary one-shot command execution inside the worker runtime.

Therefore one staging-only `payload_jobs` row was inserted directly into the staging database using the exact queue/task/input contract expected by `queueFlashEngineEvaluationJob`, together with a `NOT EXISTS` duplicate guard.

This was a controlled validation technique only.

It does **not** replace the repository CLI as the normal operator procedure.

No production database was used or modified.

---

## 6. Retry-candidate inventory at closeout

Before the validation run, staging contained:

- 5 Flash Engine runs;
- 5 completed;
- 0 failed;
- 0 running;
- 0 completed runs containing `retryCandidate`.

Those runs predated RES-002…RES-006.

The new validation run is the first real staging run exercising the current resilience audit shape.

Because it completed normally, it also contains no `retryCandidate`.

---

## 7. RES-007 decision

No RES-007 is created at this point.

A possible future operator-visibility feature could list completed runs containing `retryCandidate`, but staging currently contains no such run.

Building that feature now would solve a need that has not yet appeared operationally.

The current decision is therefore:

**do not add further resilience machinery without new evidence.**

If a real retry candidate appears later, the need for listing/reporting can be reassessed.

---

## 8. Closeout decision

Chapter 32 is considered:

**implemented, quality-gated, merged and operationally validated in staging.**

The resilience work now has:

- explicit failed-job recovery;
- bounded failure observability;
- sanitized provider transport classification;
- conservative recovery policy;
- explicit retry-candidate classification;
- controlled rerun from completed audits;
- preserved audit lineage;
- no automatic provider retry;
- no editorial mutation.

No production mutation was performed as part of Chapter 32 closeout.

Further work should proceed from demonstrated product or operational needs rather than extending resilience architecture pre-emptively.
