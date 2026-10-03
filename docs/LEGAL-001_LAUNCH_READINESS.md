# LEGAL-001 — Privacy and cookie policy alignment

Date: 2026-10-03. Target: staging. Baseline: PR #178 / `8c6f963f28546ddde429bb87e9eba7c095989886`.

## Changes

- Update both public policy pages in RO and EN, preserving routes and controller contact.
- Describe account verification, sign-in, recovery, moderated comments and newsletter delivery through Brevo.
- Preserve confirmed primary hosting regions: Railway Amsterdam, Supabase Frankfurt. Do not equate these regions with all provider processing.
- Describe active newsletter record deletion on confirmed unsubscribe without promising unverified backup/provider deletion deadlines.
- Describe Payload authentication cookie and remove claims about a nonexistent consent banner/footer settings link.
- Use the GDPR response period of one month, with the applicable extension notice.

## Implementation evidence

- `src/collections/Useri.ts`: account fields, verification and recovery, no token lifetime override.
- Payload 3.85.1 defaults: `cookiePrefix: 'payload'`, `tokenExpiration: 7200`; generated authentication cookie is `payload-token`.
- `src/components/CommentsSection.tsx`: credentialed sign-in and requests.
- `src/collections/RestulColectiilor.ts`: newsletter and moderated comment data.
- `src/lib/public-comments.ts`: public comment text, display name, date; no public email field.
- `src/app/api-newsletter/route.ts`: public form stores email, language and general segment.
- `src/app/api-newsletter/dezabonare/route.ts`: confirmed POST deletes the active newsletter record.
- `src/lib/brevo-email-adapter.ts`, `src/lib/newsletter-email.ts`: server-side email delivery.

## Wider-launch blockers and follow-up

1. **Video consent is not implemented.** `ArticleView.tsx`, `richtext-converters.tsx` and `curs/[slug]/LectiiAcordeon.tsx` create direct iframes. The code contains no consent gate or cookie settings control. Truthful policy wording does not remedy this. Before wider launch, block optional third-party video loading until consent, or replace embeds with external links. Verify no provider requests before acceptance, and support refusal/withdrawal in RO/EN.
2. Confirm provider contracts, subprocessors, transfer safeguards, delivery metadata/tracking settings and retention periods. Brevo location and transfer guarantees are deliberately not invented.
3. Establish operational retention for unconfirmed subscriptions, rejected comments, account incidents, delivery records and backups. Verify account/comment erasure handling; policy text does not claim an automated cleanup job.
4. Inspect staging response headers/browser storage for anonymous, login, logout and video flows. The cookie inventory above is based on application configuration and installed Payload defaults, not a complete live browser audit.

## Sources

- GDPR, Articles 6, 12, 13, 17 and Chapter V: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- Brevo privacy policy: https://www.brevo.com/legal/privacypolicy/ (provider terms require further contractual verification).

## Validation

Local lint, TypeScript and RO/EN server-render smoke checks are recorded in the PR. Full repository CI must pass on the exact PR head before merge. Staging deploy and live checks follow separately; no production promotion is authorized by this change.
