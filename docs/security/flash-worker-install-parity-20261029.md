# Flash worker dependency installation parity — 29 October 2026

The production proof built successfully but reported 24 affected packages, including one critical. PR295's inventory and a fresh audit of its unchanged lockfile report 18 (1 low, 7 moderate, 10 high, zero critical); the production-only lockfile profile reports 17 (1 low, 8 moderate, 8 high, zero critical). These are npm package counts, including propagated findings, not counts of distinct exploitable vulnerabilities.

## Reproduced cause

CI installs with `npm ci` from the repository, including its tracked `.npmrc` (`legacy-peer-deps=true`). The worker dependency stage copied only the manifests and ran a floating global `npm@11` upgrade followed by `npm install --include=dev`. It did not copy that configuration.

An isolated resolution probe with npm11.9.0 and the original manifests, without the config and with lifecycle scripts disabled, changed 24 package-version locations. It introduced `monaco-editor@0.57.0` through `@monaco-editor/react`'s peer dependency and then `dompurify@3.4.15`. The resulting audit reports 25 affected packages, including critical DOMPurify GHSA-cg2g-xh64-v4q7. The exact total differs from the earlier Railway summary; the newly introduced dependency chain and critical advisory are reproduced. No production image inventory or exploit was executed.

Simply substituting `npm ci` while still omitting the config fails with EUSAGE and missing peer packages. With the original lockfile and repository config together, the dry run succeeds. The isolated resolver ran on host Node24.22.1/npm11.9.0, so it is not an Alpine/Node22 execution proof. The new CI job builds the actual Node22.17.0 Alpine image and imports Payload, parse5 and sharp with networking disabled, overriding the generation command. No database, provider credentials, source fetch, generator, publication or deployment is involved.

The correction includes the config in the Dockerfile-specific context allowlist, copies it, runs `npm ci --include=dev`, and keeps the npm bundled with the fixed Node image. The first actual image CI caught the missing context exception before deployment; the allowlist and workflow path filter were then corrected. It neither regenerates the lockfile nor changes dependencies, application code, data, schedules or source controls. Dev dependencies remain installed because the existing worker directly uses tsx; changing packaging is separate work.

## Residual findings and exposure

| Component | Evidence | Disposition |
| --- | --- | --- |
| DOMPurify3.4.15 | Absent from reviewed lockfile, added by worker-style peer resolution; advisory fixed in3.4.17 | Prevent the unreviewed graph change; this is not a blanket DOMPurify exploit claim. Advisory requires non-default template/DOM settings and downstream evaluation. |
| happy-dom20.14.6 | Runtime dependency through lexical/headless; advisory patched in21.0.4 | Keep open for compatibility assessment. Worker source parsing uses parse5; no direct happy-dom/withDOM use found in project code. This static observation does not prove absence of every transitive path. |
| undici7.29.1 | Payload safeFetch imports Agent/fetch; fixes in7.30.1 | Targeted patch candidate. Payload uses manual redirects and no shared cache composition in the inspected safeFetch path; that mitigates one advisory's preconditions, not the other findings. Worker RSS fetch uses Node's native fetch, a separate implementation/version. |
| graphql-scalars1.22.2 | Audit broadly marks <=2.0.0; installed PhoneNumber regex is the older bounded linear form | Do not apply the audit's suggested Payload downgrade. Advisory narrative locates the problematic regex in>=1.24.1; GraphQL is disabled in application config. Record the discrepancy rather than suppressing all package findings. |
| fast-uri3.1.8 | Existing override; advisory fixes3.1.9 | Small compatible update candidate, requiring URI/schema regression checks. Do not conflate it with native URL parsing in source retrieval. |
| esbuild/Vite | Development-server advisories; no such server launched by worker command | Installed does not imply reachable. Preserve the findings; no dev-server exposure demonstrated here. |
| deepmerge4.3.1 | Low-severity prototype poisoning report | Retain in follow-up inventory; no automatic major upgrade or force fix. |

Primary references: https://github.com/advisories/GHSA-cg2g-xh64-v4q7 ; https://github.com/advisories/GHSA-834v-8h66-3h79 ; https://github.com/advisories/GHSA-4w7w-5xrc-9h26 ; https://github.com/advisories/GHSA-x8rm-f576-gq67 ; https://github.com/advisories/GHSA-w74x-v6f9-j3xg ; https://docs.npmjs.com/cli/v11/commands/npm-ci/ .

## Operational boundary

This patch prepares reproducible future builds. It does not certify zero vulnerabilities or alter an already-built Railway image. Before periodic production operation: pass image CI and dependency inventory, assess the remaining targeted updates, and prepare a separate deployment command. The current production one-shot snapshot contains the already-consumed generation command: do not redeploy it as a smoke test. RO5/EN6 are already published and must not be regenerated or republished. No cron or AUTO permission is granted by this change.
