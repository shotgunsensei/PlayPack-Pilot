# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── pwa-play-packager/  # PWA Play Packager (React + Vite + TypeScript, frontend-only)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/pwa-play-packager` (`@workspace/pwa-play-packager`) — "PlayPack Pilot"

SaaS-style React + Vite + TypeScript app for packaging PWAs for Google Play Store via Bubblewrap/TWA. Dark-mode UI, fully frontend-only with localStorage persistence.

**Architecture:**
- **Auth:** Local demo auth system (sign up/in/out, guest mode). Data stored in localStorage. Structured for future Supabase migration.
- **Multi-project:** CRUD, duplicate, archive, import/export JSON. Free tier limited to 1 project; Pro tier unlimited.
- **Plan gating:** `PlanGate` component blocks Pro features for free users with upgrade prompts. `UpgradePrompt` inline component.
- **Presets:** 4 starter templates (Generic App, SaaS Tool, Content App, Utility App) that prefill project defaults.
- **Store:** `playpack_pilot_state` localStorage key, STORAGE_VERSION=2. Migrates from old v1 `pwa_packager_state`.
- **Passwords:** Never persisted to localStorage or included in exports.

**Pages:**
- `/landing` — Marketing landing page (hero, features, FAQ, CTA)
- `/auth` — Sign in/up with demo mode and guest access
- `/pricing` — Free vs Pro plan comparison
- `/projects` — Multi-project dashboard (search, filter, CRUD)
- `/settings` — Profile, plan, command/export/theme preferences
- `/intake` — Project creation mode selector (Analyze Website, Upload Repo ZIP, Manual, Example)
- `/analyze/site` — Website scanner: enters URL, fetches via API proxy, parses HTML/manifest/icons/SW, shows readiness report
- `/analyze/repo` — Repo ZIP analyzer (Pro only): uploads ZIP, client-side extraction with JSZip, detects framework/manifest/icons
- `/analyze/review` — Review & Apply: table of detected values with confidence, source, approve/edit/reject controls. Creates project with approved values.
- `/` — Project dashboard (readiness scoring) — requires active project
- `/setup` through `/export` — 9-step wizard (Project Setup, PWA Validation, Signing Planner, Asset Links, Bubblewrap Build, GitHub Actions, Release Checklist, Docs Export, File Export)

**Routing:** Full-page routes (`/landing`, `/auth`, `/pricing`) render without sidebar. App routes render inside `SidebarLayout`. `/analyze/repo` gated behind `RequirePro` guard.

**Analysis architecture:**
- Backend proxy: `api-server/src/routes/proxy.ts` — POST `/api/proxy-scan` fetches website HTML, parses with cheerio, extracts manifest link/meta tags/icons/SW hints, fetches manifest.json, returns structured ScanResult. SSRF protection: DNS resolution validation, private IP blocking, redirect-by-redirect validation (manual redirect handling).
- Frontend services: `src/services/siteAnalysisService.ts` (calls proxy, builds analysis), `src/services/repoAnalysisService.ts` (ZIP extraction with JSZip, framework detection, file categorization)
- Types: `src/lib/analysis-types.ts` — DetectedValue (field/value/confidence/status/source), AnalysisResult, ScanResult, RepoAnalysisResult, ReadinessItem, IconCandidate
- Confidence model: High (directly parsed from manifest), Medium (inferred from meta tags/package.json), Low (guessed from domain/truncated values)
- Detection statuses: Detected, Inferred, Missing
- Vite dev proxy: `/api` → `http://localhost:8080` (API server)

**Key files:**
- `src/lib/store.tsx` — AppProvider context with all state, auth, project CRUD
- `src/lib/types.ts` — ProjectConfig, SigningConfig, SavedProject, UserProfile, PlanTier, ValidationResult
- `src/lib/analysis-types.ts` — Analysis result types, confidence levels, detection statuses
- `src/lib/presets.ts` — Starter template definitions
- `src/lib/validators.ts` — Readiness scoring and validation utilities
- `src/lib/generators.ts` — File content generators (manifest, assetlinks, workflows, docs)
- `src/lib/export-helpers.ts` — File download and ZIP generation
- `src/services/siteAnalysisService.ts` — Website scan + analysis builder
- `src/services/repoAnalysisService.ts` — ZIP/repo analysis + result builder
- `src/components/PlanGate.tsx` — Pro feature gating component

Key dependencies: wouter (routing), framer-motion, lucide-react, jszip, shadcn/ui components, cheerio (api-server).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
