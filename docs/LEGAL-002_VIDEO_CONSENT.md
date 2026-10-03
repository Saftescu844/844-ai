# LEGAL-002 — Per-video consent

Date: 2026-10-03. Base: staging `5c0fb47e0a8f972a70b5ec45fe17a56582a05e3d` (PR #179).

## Behavior

All three video rendering paths (article video, rich-text block, course lesson) use `ExternalVideo`.
Before explicit acceptance there is no iframe, remote thumbnail, provider script or preconnect.
Accept and Decline have equal styling. Decline leaves the text readable. Withdrawal unmounts the iframe,
stops playback and restores the blocked state. Focus remains on the action button.

Consent is for one mounted video only, in React memory. It is not stored in cookies, localStorage or
sessionStorage. Other videos, changed sources, page reloads and reopened lessons require fresh consent.
Provider cookies/data already created cannot be removed by our player; this is explained in RO/EN.
No general banner or footer control is needed for this per-video model; withdrawal is next to each loaded video.

URLs are parsed and allowlisted (HTTPS YouTube / Vimeo only). Unsupported URLs never become iframes.
YouTube uses privacy-enhanced embeds; Vimeo uses `dnt=1`, preserving valid unlisted access hashes.
The provider still receives requests after consent. Privacy modes are not described as substitutes for consent.

Privacy and Cookie policies describe the implemented behavior in both languages.
No schema, migration, dependency or infrastructure changes.

## Verification

- Component/DOM and server-render tests cover initial blocking, refusal, acceptance, withdrawal,
  independent videos, source changes, remounts, lessons, rich text, RO/EN and URL validation.
- TypeScript and changed-file lint checked locally; existing any/image lint warnings remain.
- Real Chromium network/visual QA was attempted but the browser download was unavailable in this environment.
  DOM/SSR tests are not a substitute for that live browser check.
- Before production promotion, verify on staging in browser: no YouTube/Vimeo requests before acceptance
  (including after refusal), only the chosen player loads, withdrawal removes it and stops playback,
  refresh/new video requires consent, keyboard controls and mobile wrapping work in RO/EN.
- Full CI must pass on the PR head. Merge and staging deploy require the established explicit approval.

Remaining provider-contract, retention and account-cookie audit work from LEGAL-001 is unchanged.
