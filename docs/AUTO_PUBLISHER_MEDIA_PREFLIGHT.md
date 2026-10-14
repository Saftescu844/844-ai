# Auto-Publisher: media environment preflight (GitHub Actions)

## Incident and scope

On 2026-10-14 the scheduled **Auto-Publisher 844-ai.ro** job on `main`
failed after RSS ingestion/classification with:
`MEDIA_PUBLIC_BASE_URL nu este configurată`.
This GitHub Actions publisher is **not** the Railway staging Flash AI worker.
The publisher workflow passed only `ANTHROPIC_API_KEY`, `DATABASE_URL`,
and `PAYLOAD_SECRET`; Payload's S3 media plugin now needs explicit media
configuration while loading article records.

This patch is prepared first as a **draft PR to `staging`**. It does not
run a publisher, touch production databases, upload media, migrate schemas, or
change any existing RSS/editorial logic.

## Variables required before any future production promotion

In **GitHub repository → Settings → Secrets and variables → Actions**,
configure these **Repository variables**, using the production Supabase project:

| Variable | Required production value |
| --- | --- |
| `MEDIA_PUBLIC_BASE_URL` | `https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media` |
| `S3_BUCKET` | `media` |
| `S3_REGION` | `eu-central-1` |
| `S3_ENDPOINT` | `https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/s3` |

Configure or confirm these **Repository secrets** (real production values
only, never staging values):

- `S3_ACCESS_KEY_ID` — production Supabase S3 access key ID
- `S3_SECRET_ACCESS_KEY` — production Supabase S3 secret access key
- `DATABASE_URL` — existing production database connection
- `PAYLOAD_SECRET` — existing production Payload secret
- `ANTHROPIC_API_KEY` — existing production Anthropic API key

**Never copy staging S3 or database credentials.** Do not post credentials
in pull requests, screenshots, discussion, or repository files. A GitHub
Actions variable and a GitHub Actions secret are different scopes: make sure
the names are placed in the correct one.

The publisher is independent of Railway's runtime environment variables.
Configuring Railway does **not** populate GitHub Actions.

## Fail-closed behavior

`scripts/publisher-env-preflight.mjs` uses only local environment parsing,
with no network requests or side effects:

1. Fail if a required variable is missing or blank.
2. Ensure `NODE_ENV=production` and that `DATABASE_URL` names the production Supabase project.
3. Ensure the public media URL and S3 endpoint use the documented **production**
   Supabase project and that the bucket is `media`.
4. Report only variable **names** and redacted problem types, never values.
5. Exit nonzero before `npm ci` and, as defense in depth, immediately before
   `npx tsx publish-*.ts`.

GitHub secrets are passed only to those two steps, **not** at job level or
to the dependency-install step. The existing cron selection is unchanged.
`PAYLOAD_DB_PUSH=false` is explicitly passed to the publisher.

> A successful synthetic CI preflight does not prove that the GitHub
> repository's actual Actions variables/secrets are populated or that real
> Supabase/AI calls will succeed. These must be confirmed separately
> before a user-authorized production promotion.

## Validation and release gates

- CI tests use **synthetic values only** and perform **no** provider requests,
  production database access, S3 operations, or content writes.
- Review the PR diff: only environment wiring, preflight, tests, and this doc.
- Keep the PR in Draft until CI is green and operator approves readiness.
- Integrate into `staging` only with explicit approval; **no automatic
  Railway deployment or manual production workflow run**.
- Promote to `main` via a separate approved PR only after the real GitHub
  variable/secret presence has been confirmed. The expected configured values
  must match production, never staging.
- Avoid running `workflow_dispatch` casually: the current workflow defaults
  to the RSS publisher, which can create review drafts and spend API credits.
