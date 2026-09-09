# Epic Learning Pro

Marketing site for Epic Learning Pro (tutoring/coaching business, run by Olivia). Single-page site with a built-in, PIN-gated visual editor ("admin portal") so Olivia can edit text, images, colors, and backgrounds directly in the browser, with no code deploys needed for content changes.

Originally built with the Replit agent, then exported — Replit is no longer used for hosting or dev tooling. See `.agents/memory/deployment-target.md` for the full deployment story.

## Run & Operate

- `pnpm install` — install all workspace dependencies
- `pnpm --filter @workspace/epic-learning-pro run dev` — run the site locally (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build **only** `@workspace/epic-learning-pro` (the deployable site). Other artifacts (`mockup-sandbox`, `api-server`) are intentionally excluded — see Gotchas.
- `pnpm run deploy` — `wrangler deploy`, publishes to Cloudflare Workers (normally handled by Cloudflare's own git-connected CI, not run by hand)
- `pnpm --filter @workspace/api-server run dev` — run the contact-form API locally (not currently deployed anywhere — see Architecture decisions)

## Stack

- pnpm workspaces monorepo, Node.js 24, TypeScript 5.9
- **Site** (`artifacts/epic-learning-pro`): Vite + React 19 + wouter (routing) + Tailwind CSS v4 + Radix UI. Ships as a static SPA.
- **Admin portal**: vanilla JS (`artifacts/epic-learning-pro/public/admin-portal.js` + `.css`), loaded directly by the built `index.html`, not part of the React bundle. Currently localStorage-only — no backend.
- **API** (`artifacts/api-server`): Express 5, only route is `/contact` (nodemailer/SMTP email). Not currently deployed — see Gotchas.
- **DB** (`lib/db`): Drizzle ORM configured for Postgres, but the schema (`lib/db/src/schema/index.ts`) is an empty scaffold — no tables defined yet. Nothing reads/writes it currently.
- **Deploy**: Cloudflare Workers (static assets), via `wrangler.jsonc` + `worker/index.ts`.

## Where things live

- `artifacts/epic-learning-pro/` — the actual deployed site (React app + admin portal). `src/` is the React app; `public/` is served as-is (admin-portal.js/css, favicon, robots.txt).
- `artifacts/mockup-sandbox/` — internal design-preview sandbox for building/reviewing UI mockup components before wiring them into the real site. Dev-only; never built or deployed (root `build` script deliberately skips it).
- `artifacts/api-server/` — contact-form email backend (Express). Not wired into the Cloudflare deploy.
- `lib/api-client-react`, `lib/api-zod`, `lib/api-spec`, `lib/db` — shared libraries, consumed as raw TS source (no build step — `exports` point straight at `src/`).
- `wrangler.jsonc` + `worker/index.ts` — Cloudflare Workers deploy config. The Worker's only job is stripping the `/epiclearningpro` path prefix before handing requests to the static-assets binding (see Architecture decisions).
- `.agents/memory/` — persistent notes for future agent sessions (deployment target, admin portal architecture/storage layout, its acceptance checklist). Read these before touching the admin portal or deploy config.
- `attached_assets/` — original build inputs from the Replit-agent build (source copy doc, logo/photos actually used via the `@assets` Vite alias). Trimmed down from a much larger pile of duplicate guide drafts and stray screenshots — keep this folder to just what's actually referenced or has real reference value.
- `render.yaml` — Render.com config for `api-server`. Unconfirmed whether it's actually deployed there; likely to be replaced by a Cloudflare-based contact form (see deployment-target.md).

## Architecture decisions

- **Subpath deploy via a Worker script, not a Pages custom domain.** The site lives at `portfolio.cliquestudios.io/epiclearningpro`, a *path* on a domain that serves other things too — so it's a Cloudflare Workers **route** (`portfolio.cliquestudios.io/epiclearningpro*`), not a full custom domain. Cloudflare passes the full path through to the Worker, but the built assets live at the top level of the assets directory, so `worker/index.ts` strips the `/epiclearningpro` prefix before calling `env.ASSETS.fetch()`. If you ever change the deploy path, update both `wrangler.jsonc`'s route pattern and the `BASE_PATH` constant in `worker/index.ts` and `vite.config.ts` together — they have to agree.
- **Cloudflare "Runtime variables and secrets" ≠ build-time env vars.** Cloudflare's dashboard vars populate the deployed Worker's `env` at request time, not `process.env` during the git-connected build shell. `vite.config.ts` no longer depends on any dashboard-configured env var for a production build — `BASE_PATH` defaults to `/epiclearningpro/` in code, and `PORT` is only required for `vite dev`/`vite preview` (never touched by `vite build`).
- **Admin portal is Path A: localStorage only, no backend yet.** Data attributes (`data-key`, `data-editable*`) in the site markup are deliberately kept stable so a future backend swap (planned: Supabase) doesn't require changing the site markup — only `admin-portal.js`'s persistence layer changes. See `.agents/memory/admin-portal.md` for the exact storage-key layout before touching this.
- **`pnpm-workspace.yaml` enforces a 24h minimum package release age** (supply-chain guard). A `pnpm install --no-frozen-lockfile` for a package released in the last day will fail with `ERR_PNPM_NO_MATURE_MATCHING_VERSION` — pin an older patch version rather than disabling the check.

## Product

Single-page marketing site: hero, services, about/credentials, testimonials, contact form. The differentiator is the admin portal — Olivia (non-technical) can click into edit mode (PIN-gated, PIN in `.agents/memory/admin-portal.md`), and change text, swap images, edit brand colors (auto-detected from the page, applied everywhere those hexes appear), edit section backgrounds, and manage a promo banner — all live, no code changes, no redeploy.

## User preferences

- pnpm only (root `preinstall` script hard-fails if anything else is used).
- No Replit dependency of any kind — hosting, dev plugins, or tooling. If you find yourself reaching for a `@replit/*` package or Replit-specific env var (`REPL_ID`, etc.), stop and find the non-Replit equivalent instead.
- Prefers small, direct fixes over broad refactors — see commit history for the general style (e.g. the PORT/BASE_PATH build fix scoped the change to exactly what was broken).

## Gotchas

- **Always run `pnpm run build` from the repo root**, not `vite build` directly inside `artifacts/epic-learning-pro` — the root script runs the typecheck gate first, which Cloudflare's build also relies on.
- The root `build` script filters to `@workspace/epic-learning-pro` only. If another artifact ever needs to be part of the production deploy, that filter needs to change deliberately — don't switch it back to `pnpm -r` without checking every workspace package's build script actually works headless in CI (this is exactly how the original Cloudflare build broke, on `mockup-sandbox`'s then-unconditional `PORT` requirement).
- Cloudflare Workers Builds runs `pnpm install --frozen-lockfile` — any dependency change needs `pnpm install --no-frozen-lockfile` run locally first to update `pnpm-lock.yaml`, or the build fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` / out-of-date lockfile errors.
- `pnpm-workspace.yaml`'s `overrides` block strips non-Linux platform binaries (esbuild, rollup, lightningcss, etc.) — intentional, keeps installs fast. Don't "fix" missing macOS/Windows binaries by removing these; the Cloudflare build environment is Linux-only anyway.

## Pointers

- `.agents/memory/deployment-target.md` — full deploy story (Cloudflare Workers frontend, Render/contact-form API status)
- `.agents/memory/admin-portal.md` — admin portal storage layout and key architecture decisions
- `.agents/memory/admin-portal-checklist.md` — acceptance checklist for admin portal features; re-verify against this before shipping changes to logo/backgrounds/colors/promo/contacts
