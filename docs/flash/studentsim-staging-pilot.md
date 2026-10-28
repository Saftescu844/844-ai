# StudentSim: one-off RO/EN staging pilot

This opt-in uses the existing RSS stage-next pipeline to evaluate and, only after both handoffs pass, atomically save one RO/EN review pair from Microsoft Research source #10. It does not enable scheduled ingestion or AUTO, modify source trust, or introduce another generator.

## Reviewed profile

- Project `44c37d0f-b300-4462-b001-31259ddae5dd`, environment `a589dc28-1c59-468c-9eb4-351fce8fa17b` (the staging project's environment is named `production`).
- Only `flash-article-preview-once`, service `7be51b73-dc87-4a53-9ad4-879c00aecad6`. The scheduled worker is rejected when this flag is set.
- `PAYLOAD_DB_PUSH=false`; the ordinary staging database guard remains required.
- Existing active source #10, primary/standard/paraphrase, pillars 1/3/4/5, RSS, `allowIngestion=false`, `allowAutoPublish=false`.
- Exact source URL `https://www.microsoft.com/en-us/research/` and feed `https://www.microsoft.com/en-us/research/feed/`.
- Exact article `https://www.microsoft.com/en-us/research/blog/simulating-student-learning-for-better-ai-tutoring/`.
- The observed primary evidence must resolve through the existing Microsoft publication-page resolver to `https://arxiv.org/abs/2609.01591`. The profile compares evidence; it never inserts an identifier into article text or substitutes one for missing evidence.

The source policy is read before planning, independently in each child, and again immediately before persistence. These are point-in-time checks, not a new distributed source-policy lock.

## Command after explicit rollout approval

Pin the one-off service to the tested merge SHA; keep cron unset and restart NEVER. Stage and inspect only its SHA/start-command changes before applying the authorized deployment. Do not deploy the scheduled worker merely to run this pilot.

```text
node --import tsx scripts/flash-rss-stage-next.ts --model gpt-5.6-terra --source-id 10 --candidate-url https://www.microsoft.com/en-us/research/blog/simulating-student-learning-for-better-ai-tutoring/ --max-items 1 --max-attempts 1 --allow-provider-requests --allow-staging-rss-stage-next --allow-staging-studentsim-pilot
```

The ordinary provider and persistence opt-ins remain mandatory. The pilot requires exactly one candidate/attempt and the unchanged 30-day freshness policy. It rejects production/read-only-pilot mode combinations. Unlike the legacy `--read-only-pilot` override, this named profile supports the existing provider-backed pair preparation while source ingestion remains off.

## Behavior and acceptance

1. Read source #10 through Payload; never update its registry record or skip memory. The normal planner continues to select only `allowIngestion=true` sources when the new flag is absent.
2. Use the ordinary RSS parser, requested-candidate filter, freshness, skip-memory, existing-URL and daily-budget filters. An absent/ineligible candidate fails the pilot before generation.
3. Prepare RO and EN with the existing model/classification/generation/QA and Lexical gates. EN reuses validated RO classification. Both children require grounded identity; no pending-identity bridge is allowed for the pilot.
4. Confirm that both handoffs match the reviewed source, article and observed arXiv fingerprint, re-read the source policy, and use the existing final-dedup/atomic pair writer. No writer, publication or QA checks are relaxed.
5. Any candidate error stops the one-attempt pilot and leaves registry/skip memory untouched. Both handoffs must pass before any Flash draft is created. Existing run-audit rows remain enabled.
6. Accept only terminal deployment success **and** a completed RSS run with `outcome=pair-created`, sourceId=10, one attempt, and RO/EN IDs. A deploy alone is not evidence of successful generation.
7. Read back both latest Payload versions: draft/review, automationDecision=review, publishedAt=null, reciprocal association, identical classification/source/date. Compare source #10 policy and skip memory with the pre-pilot snapshot.

The article is dated 12 October 2026; the paper was submitted 1 September. The resolver's citation date remains diagnostic metadata, not a new semantic model input. Human review must preserve this chronology and distinguish student simulation/tutor-development research from outcomes demonstrated in classrooms. This pilot does not establish the accuracy of all scientific claims or authorize source activation/publication.

## Rollback and follow-up

A failed pilot leaves no intended partial pair; investigate its bounded diagnostics before approving any further provider-backed execution. Do not enable ingestion or raise trust to get past a failure. A successful pilot still needs editorial review. Scheduled ingestion can be considered only as a separate action; AUTO remains off.
