# Auto-Publisher: missing public media URL in GitHub Actions

## Incident and verified scope

On 2026-10-14, scheduled **Auto-Publisher 844-ai.ro** on `main`
([failed workflow](https://github.com/Saftescu844/844-ai/actions/runs/38545632754))
failed after RSS classification with:
`MEDIA_PUBLIC_BASE_URL nu este configurată`.

The GitHub Actions workflow forwarded `ANTHROPIC_API_KEY`, `DATABASE_URL` and
`PAYLOAD_SECRET`, but did not forward the public media URL required by
Payload's S3 storage plugin when serializing certain article records.

This publisher is **separate from the Railway staging Flash AI worker**.

A code review of `publish-rss.ts`, `publish-health.ts`,
`publish-education.ts`, `publish-business.ts` and `translator.ts`
confirms they create article drafts and translations; none uploads media.
Therefore **S3 access keys must not be added to this GitHub Actions workflow**.
Those belong only to the application/service that needs storage access.

## One new GitHub Actions repository variable

Before promoting this patch to `main`, configure:

**GitHub repository → Settings → Secrets and variables → Actions → Variables**

| Variable | Expected production value |
| --- | --- |
| `MEDIA_PUBLIC_BASE_URL` | `https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media` |

This is a public URL, so use an Actions **variable**, not a secret. The
preflight validates that it is an HTTPS URL for the production Supabase
project `hyapqvnubhwkwmwudeit` and the `media` public bucket.
A trailing slash is accepted.

The following **existing GitHub Actions secrets** remain necessary:

- `DATABASE_URL`: production Supabase DB, never staging
- `PAYLOAD_SECRET`: production Payload secret
- `ANTHROPIC_API_KEY`: production model API key

The connection must use the official production direct database hostname or
official Supabase pooler with the project-scoped username. Secrets are
referenced by name only; their values are never printed.

`S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and
`S3_SECRET_ACCESS_KEY` **are not required by these draft-only publisher
scripts**. They remain configured for the actual Railway/Storage runtime,
outside this PR. Do not copy Railway secrets to GitHub Actions.

The current actual presence of this new GitHub variable cannot be inferred
from repository source code or from Railway settings. It must be confirmed
before any approved production promotion.

## Preflight and safety

`scripts/publisher-env-preflight.mjs` parses local environment variables
only. It does **not** contact the DB, Supabase, S3, or AI provider.

The workflow runs the preflight:

1. Before dependency installation, so a missing media URL fails early;
2. Again immediately before `npx tsx` runs the publisher.

It checks missing values, NODE_ENV, production DB identity, and the exact
public media destination; diagnostics show only variable **names** and
failure categories. No credential value, DB URI, or URL value appears
in logs.

Existing scheduled cron entries and publisher scripts are unchanged.
`PAYLOAD_DB_PUSH=false` is explicitly set for publisher execution.

## Validation and release gates

- The integration tests use fake environment values only, no real
  database, provider, or storage actions.
- This change is initially a **draft pull request to `staging`** with CI
  verification, not a production action.
- Confirm CI green, review the four changed files, then request separate
  approval before any merge into `staging`.
- Later promotion into `main` must be **separately approved** and requires
  operator verification of GitHub Actions variable presence.
- Do not run `workflow_dispatch` as a simple test: the existing action
  defaults to RSS publication, which can create drafts and incur AI charges.
