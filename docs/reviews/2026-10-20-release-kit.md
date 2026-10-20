# Release-kit source repair, 2026-10-20

Baseline: `038489524f1a9e3884263220673357c44399d739` (`main`). This is a bounded source repair of generated release files and their callers, not production acceptance of PlayPack or an Android app.

## Changes and evidence

- The generated workflow used retired `actions/upload-artifact@v3`. It now pins verified v7.0.2 at `cf430e030ddbb5b0abf93d22962f4752f3646cd9`, uploads only `app/app-release-bundle.aab`, rejects missing files and excludes hidden files. This template targets GitHub.com-hosted Ubuntu runners; GHES requires a separately reviewed compatible approach.
- The previous template mixed interactive project initialization with unsupported password CLI flags. It now requires a locally initialized and reviewed `app/` project, checks its existing signing path/alias and Bubblewrap manifest checksum, and uses Bubblewrap's documented password environment variables. It creates no keys and publishes nothing. Read-only repository permission, disabled persisted checkout credentials, a timeout and unconditional temporary-keystore cleanup bound the template.
- Project values no longer enter generated workflow YAML or shell code. Local Bash and PowerShell commands quote project/signing metadata as literal arguments. Exported Markdown uses a sufficiently long code fence to preserve command text containing backticks or newlines. Signing metadata inspection replaces redundant re-signing instructions.
- Lighthouse 12 removed its PWA category. Shared UI/exported checklist items now require manual install/launch, offline fallback, reconnect and service-worker update checks. Retired/unknown saved checklist keys and nonboolean imported values cannot complete current checks.
- Release-note templates no longer assert that packaging supplies offline behavior. The Bubblewrap package link is corrected. Generated signing notes describe existing owned key metadata without supplying new-key commands.
- ZIP export consumes one ten-file map and exports only signing filename, alias and SHA-256 fingerprint. Its generated files and the individual FileExport configuration omit password values and unexpected signing fields. This protects those named download paths, not arbitrary sensitive text placed in other metadata fields. Store persistence and exportProject remain unchanged and are explicitly deferred below.

## Verification scope

`node --test tests/release-kit.test.cjs` runs source-level regressions with the repository's TypeScript dev dependency. No additional test dependency is added. Tests execute the actual generators, page components, store persistence/export callbacks and ZIP export caller. React/DOM and the ZIP writer are isolated test doubles; this is not a rendered browser or real JSZip integration test. Bash/Windows PowerShell execute only inert argument-recording functions, never Bubblewrap/keytool. A generated-preflight fixture uses synthetic public metadata, not signing material. The PowerShell test explicitly skips on non-Windows platforms.

Local evidence uses already-installed TypeScript 5.9.3 (the lockfile's compiler version) and YAML 2.9.1. Strict checking of the four pure TypeScript modules passes. The generated workflow parses with the required events, permissions, signing bindings and artifact inputs for both normal and adversarial fixtures. Review ZIPs use Python's standard ZIP writer and were read back byte-for-byte against the generated map; real JSZip serialization remains unrun.

The required pass suite retains a control for the baseline store's two named password fields only. A separate failing reproduction, outside that suite, demonstrates that unexpected imported signing fields still reach localStorage and exportProject. That defect is not skipped, marked TODO, or described as fixed. The original local allowlist patch remains preserved separately; its credential-bearing file was excluded from this scoped candidate after automatic approval review rejected uploading that file.

The full workspace typecheck and production build remain unrun: this checkout has no installed workspace dependencies and no `pnpm` executable is available. No dependencies were acquired. There is no repository lint script or checked-in GitHub Actions workflow in the baseline. Source tests cannot substitute for these missing build gates.

## Trust boundaries and human gates

The existing auth, admin and Pro state are browser-local demonstrations using localStorage and a client-side demo credential. They provide neither server-enforced authentication/authorization nor tenant separation or verified paid entitlements. This patch does not implement a backend, checkout or live integration and does not establish multiuser or paid production readiness. Do not put real credentials in this app's browser storage.

The API's existing `/api/proxy-scan` route and repository/site analysis features are outside this repair. The proxy needs a separate review of authentication, DNS-to-connection binding, private-address handling, redirects and streaming resource limits before public production use. No live target scans were performed.

Before release: restore the exact locked workspace dependency graph and pass full typecheck/build plus rendered UI/real ZIP checks; independently review the frozen patch; select and verify Bubblewrap/JDK/SDK and runner configuration; use existing owned signing material only through an approved secret process; run a real signed build, inspect its artifact, and test install, asset links, offline/reconnect/update behavior on an owned device. Play Console upload/publication, security settings, credentials and production changes require separate human action/approval. The generated checklist is self-reported acceptance, not automatic verification.

The other setup actions retain their baseline major tags and Bubblewrap installation remains a template instruction requiring version/toolchain review. No claim is made that this complete workflow has passed a hosted runner or that the SHA-1 project checksum authenticates a source or signing identity; it only matches Bubblewrap's update-detection format.

## Primary sources inspected

- [GitHub artifact v3 retirement notice](https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/)
- [upload-artifact v7.0.2 release](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) and [immutable action definition](https://github.com/actions/upload-artifact/blob/cf430e030ddbb5b0abf93d22962f4752f3646cd9/action.yml) (Node24, missing-file and hidden-file inputs)
- [Lighthouse 12 PWA category removal](https://github.com/GoogleChrome/lighthouse/releases/tag/v12.0.0)
- [Bubblewrap build implementation](https://github.com/GoogleChromeLabs/bubblewrap/blob/80d97ad2007fd80941ae56588f603bff5b5546b9/packages/cli/src/lib/cmds/build.ts) (password environment variables, checksum update prompts and output name)
- [Bubblewrap checksum implementation](https://github.com/GoogleChromeLabs/bubblewrap/blob/80d97ad2007fd80941ae56588f603bff5b5546b9/packages/cli/src/lib/cmds/shared.ts) and [CLI package](https://github.com/GoogleChromeLabs/bubblewrap/tree/80d97ad2007fd80941ae56588f603bff5b5546b9/packages/cli)
