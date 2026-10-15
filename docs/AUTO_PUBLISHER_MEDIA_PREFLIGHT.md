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
- The correction was already integrated into `staging` via PR #252, with
  CI #193 successful. This isolated **Draft PR to `main`** copies only
  the four publisher-related files onto the production branch baseline.
- Confirm CI green on this isolated PR, review exactly four changed files,
  and request separate approval for Ready for Review and for merge into `main`.
- The operator has reported adding the public GitHub Actions repository
  variable. Its exact stored value cannot be read through the connector;
  verify in the GitHub UI before authorizing production merge.
- Do not run `workflow_dispatch` as a simple test: the existing action
  defaults to RSS publication, which can create drafts and incur AI charges.

## Follow-up 2026-10-15 — approved app role in DB preflight (draft)

The media-URL repair in PR #253 reached `main`, but scheduled Auto-Publisher
runs [38590658560](https://github.com/Saftescu844/844-ai/actions/runs/38590658560),
[38608875693](https://github.com/Saftescu844/844-ai/actions/runs/38608875693)
and [38632422797](https://github.com/Saftescu844/844-ai/actions/runs/38632422797)
all failed **at the early environment preflight**, before `npm ci` or the
publisher step, with `DATABASE_URL nu identifică proiectul Supabase de producție`.

The production database contains the existing dedicated login role
`app_prod2` with permissions on relevant article and version tables.
Supabase documents custom-role pooler usernames as
`<ROLE>.<PROJECT-REF>`. The previous checker accepted only `postgres`.

This **restricted draft patch** extends the production-only allowlist
from `postgres` to `postgres` **or** `app_prod2`:
- direct host `db.hyapqvnubhwkwmwudeit.supabase.co`: exactly those bare roles;
- official `*.pooler.supabase.com`: exactly those roles with
  `.hyapqvnubhwkwmwudeit` appended.

The guard still rejects staging identifiers, unapproved roles, spoofed
hosts, malformed connection URIs, missing secrets, and media URLs outside
the exact production media bucket. It never prints credentials or makes
a database connection. The new synthetic tests cover the supported
connection forms and unsafe variants. No additional database privileges
or secrets are added.

**Confirmed diagnostic (2026-10-15):** The independent, manually dispatched
[Publisher DB Identity Check run #38694917922](https://github.com/Saftescu844/844-ai/actions/runs/38694917922)
completed successfully on `main` without connecting to PostgreSQL or running
any publisher. Its allowlisted, credential-free output was:
- `SECRET_STATUS=present`
- `PROJECT=production`
- `ROLE=app_prod2`
- `METHOD=pooler`
- `MAIN_PREFLIGHT=reject`
- `PR254_PREFLIGHT=accept`

This confirms that the GitHub Actions `DATABASE_URL` **URI identifies the
production Supabase project** using the approved dedicated `app_prod2` role
via a pooler. It also explains why the old, postgres-only preflight rejected
the URI and why the explicitly restricted role allowlist in this patch
accepts it. No URL, hostname, password or credential was printed.

**Limit:** this was local URI classification, **not** a network connection or
authentication test. It does not prove the password is valid, that the DB is
reachable, or that article writes/publication will succeed. Preserve
production/staging isolation and observe scheduled behavior separately after
an explicitly approved merge.

**Release gates:** draft PR to `main`, CI on its final HEAD, inspect the
three-file diff and obtain a separate explicit Ready/merge approval.
Do not run `workflow_dispatch` for diagnosis: it can create articles
and incur provider charges. No merge, deploy, secret update, migration
or manual publisher run is authorized by preparing this patch.
