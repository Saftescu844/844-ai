# Security baseline — 844-ai.ro / 2026-10-16

**DRAFT. No merge, deployment, publisher execution, or production DB access.**

CI snapshots from PR checks on 2026-10-16:
- main: 34 npm audit findings (3 critical, 22 high, 9 moderate), CI run 38866226471.
- staging: 27 npm audit findings (1 critical, 18 high, 8 moderate), CI run 38865839247.
- Railway staging npm install reported 30; installation methods differ, and results need to be reproduced.

Dependency versions from main lockfile: Next.js 16.2.6, Payload 3.85.1, undici 7.24.4 and 7.28.0, fast-uri 3.1.3.
Dependency versions from staging lockfile: Next.js 16.4.0, Payload 3.90.2, undici 7.29.1, fast-uri 3.1.8.
Next.js 16.4.0 is itself within an advisory affected range, so copying the staging lockfile is not a security solution.

Node compatibility: project requires Node >=22.17.0 <23, but scheduled publisher workflow selected Node 20.
The proposed runtime correction is limited to the Node setup step. Cron, provider selection, preflight and editorial rules stay unchanged.

Security Inventory workflow runs on pull requests without secrets or production connections.
It prints all affected packages and production-only findings. It does not automatically remediate packages.

Next steps before security promotion:
1. Reconcile audit entries by advisory, exact installed version, direct/transitive status and production use.
2. Identify current patched releases and minimum reproducible package-lock changes.
3. Test Node 22 publisher compatibility and patched dependencies on an isolated branch.
4. CI green, staging validation, explicit merge and deploy approvals.
5. Keep editorial PR #256 in Draft and independent.

## Reproducible remediation candidate on PR #259
- Generated lockfile commit: `9c4c480d78c7cfa9e66bf4662c04c860edec9c03`, created by a temporary branch-restricted workflow. Temporary write workflow removed in subsequent commit.
- Node 22.17.0; Next.js 16.4.2; Payload 3.91.0 (all direct Payload packages aligned); sharp 0.35.5; Vitest 4.1.12; eslint-config-next 16.4.2.
- Targeted transitive overrides: fast-uri 3.1.8, js-yaml 4.3.2, source-map-js 1.2.2, fast-copy 3.1.0, nanoid 3.3.20, browserslist 4.28.7. `brace-expansion` was refreshed inside compatible ranges (1.1.21 and 5.0.12) in the generated lock.
- npm install --package-lock-only succeeded, npm ci --ignore-scripts succeeded; generated lockfile is reproducible.
- npm audit all for the candidate: **18 affected packages (0 critical, 13 high, 5 moderate)**, down from 34 (3 critical, 22 high, 9 moderate).
- Remaining high findings concentrate around transitive Payload tooling (chokidar, braces, micromatch, sass, find-node-modules, findup-sync), ESLint tooling, and their dependency advisories. Do not force old major releases to silence advisory cascades.
- **Not a production approval:** verify full CI, production-only npm audit, upgrade/compatibility concerns in Payload and Next.js, and a staging rollout before main merge.
- The temporary writable PR workflow is removed; only the read-only inventory remains.
