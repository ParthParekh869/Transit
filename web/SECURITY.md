# Security notes

## `npm audit` warnings we knowingly leave open

After bumping to Next.js 14.2.35, `npm audit` still reports five warnings.
None of them are exploitable in this codebase. They are listed here so future
maintainers don't have to redo the analysis.

| Advisory | Affected package | Why it does not apply to this app |
|---|---|---|
| GHSA-9g9p-9gw9-jx7f, GHSA-3x4c-7xq6-9pq8, GHSA-h64f-5h5j-jqjh, GHSA-xv57-4mr9-wg8v | `next` (Image Optimizer / Optimization API) | We do not use `next/image` anywhere. |
| GHSA-ggv3-7p47-pfv8 | `next` (HTTP request smuggling in rewrites) | No `rewrites()` are configured in `next.config.mjs`. |
| GHSA-3g8h-86w9-wvmq, GHSA-36qx-fr4f-26g5 | `next` (middleware redirect / i18n bypass) | No `middleware.ts`, no Pages Router, no i18n. |
| GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj, GHSA-vfv6-92ff-j949, GHSA-wfc6-r584-vfw7 | `next` (Server Actions / RSC patterns) | No Server Actions; only plain RSC and route handlers. |
| GHSA-ffhc-5mcf-pf4q, GHSA-gx5p-jg67-6x7h | `next` (CSP nonces / `beforeInteractive` scripts) | We do not set CSP nonces or use `beforeInteractive`. |
| GHSA-c4j6-fc7j-m34r | `next` (WebSocket SSRF) | No WebSocket upgrades. |
| GHSA-qx2v-qp2m-jg93 | `postcss` bundled inside `next` | XSS via `</style>` only triggers when user-controlled CSS is stringified — all our CSS is build-time. |
| GHSA-5j98-mcp5-4vw2 | `glob` (transitive via `eslint-config-next`) | Vulnerability is in `glob`'s **CLI** command (`-c/--cmd`), which we never invoke. It is used as a library only. |

`npm audit`'s offered fix for the `next` and `postcss` warnings is a
major-version upgrade to `next@16`, which is a breaking change (App Router
API changes, requires React 19). Adopting it for non-applicable CVEs is not
worthwhile right now. When/if we move to Next 15 or 16 for other reasons,
these warnings will clear automatically.

## Reporting a real issue

If you discover a security issue that **does** apply to this app's actual
behavior, please open a GitHub issue and tag it `security`, or contact the
maintainer directly.
