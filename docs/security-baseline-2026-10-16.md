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
