# Epic Learning Pro

Marketing site for Epic Learning Pro (tutoring/coaching business, run by Olivia). Single-page site with a built-in, PIN-gated visual editor ("admin portal") so Olivia can edit text, images, colors, and backgrounds directly in the browser, with no code deploys needed for content changes.

Originally built with the Replit agent, then exported — Replit is no longer used for hosting or dev tooling.

## Run & Operate

- `pnpm install` — install all workspace dependencies
- `pnpm --filter @workspace/epic-learning-pro run dev` — run the site locally (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build **only** `@workspace/epic-learning-pro` (the deployable site). Other artifacts (`mockup-sandbox`, `api-server`) are intentionally excluded — see Gotchas.
- `npx wrangler dev --local` — run the site + contact-form API through the actual Workers runtime locally (Miniflare), closest thing to a production preview without deploying
- `pnpm run deploy` — `wrangler deploy`, publishes to Cloudflare Workers (normally handled by Cloudflare's own git-connected CI, not run by hand)

## Stack

- pnpm workspaces monorepo, Node.js 24, TypeScript 5.9
- **Site** (`artifacts/epic-learning-pro`): Vite + React 19 + wouter (routing) + Tailwind CSS v4 + Radix UI. Ships as a static SPA.
- **Admin portal**: vanilla JS (`artifacts/epic-learning-pro/public/admin-portal.js` + `.css`), loaded directly by the built `index.html`, not part of the React bundle. localStorage-only — no backend yet (Supabase migration planned, not started).
- **Contact form**: handled entirely by `worker/index.ts` (`POST /epiclearningpro/api/contact`), which calls the Resend API directly over `fetch`. No Express server involved in production.
- **Deploy**: Cloudflare Workers (static assets + the contact-form route), via `wrangler.jsonc` + `worker/index.ts`.
- **Legacy, not in the production path**: `artifacts/api-server` (Express contact-form backend) and `lib/db` (Drizzle/Postgres, empty schema scaffold) predate the Cloudflare setup — kept as reference/local-dev tools, not deployed anywhere. `render.yaml` was removed once the contact form moved to Cloudflare.

## Where things live

- `artifacts/epic-learning-pro/` — the actual deployed site (React app + admin portal). `src/` is the React app; `public/` is served as-is (admin-portal.js/css, favicon, robots.txt).
- `artifacts/mockup-sandbox/` — internal design-preview sandbox for building/reviewing UI mockup components before wiring them into the real site. Dev-only; never built or deployed (root `build` script deliberately skips it).
- `artifacts/api-server/` — legacy Express contact-form backend, superseded by `worker/index.ts`. Not wired into the Cloudflare deploy; kept only as reference.
- `lib/api-client-react`, `lib/api-zod`, `lib/api-spec`, `lib/db` — shared libraries, consumed as raw TS source (no build step — `exports` point straight at `src/`). Mostly unused scaffolding right now (`lib/db`'s schema is empty).
- `wrangler.jsonc` + `worker/index.ts` — Cloudflare Workers deploy config and the Worker itself. Two jobs: strip the `/epiclearningpro` path prefix before handing static-asset requests to the assets binding, and handle `POST /api/contact` (Resend email) directly.
- `attached_assets/` — original build inputs from the Replit-agent build (source copy doc, logo/photos actually used via the `@assets` Vite alias). Keep this to just what's actually referenced or has real reference value — it was previously a large pile of duplicate guide drafts and stray screenshots.

## Architecture decisions

- **Subpath deploy via a Worker script, not a Pages custom domain.** The site lives at `portfolio.cliquestudios.io/epiclearningpro`, a *path* on a domain that serves other things too — so it's a Cloudflare Workers **route** (`portfolio.cliquestudios.io/epiclearningpro*`), not a full custom domain. Cloudflare passes the full path through to the Worker, but the built assets live at the top level of the assets directory, so `worker/index.ts` strips the `/epiclearningpro` prefix before calling `env.ASSETS.fetch()`. If you ever change the deploy path, update `wrangler.jsonc`'s route pattern, the `BASE_PATH` constant in `worker/index.ts`, and the default in `vite.config.ts` together — they have to agree.
- **The client-side router defends against being loaded outside `/epiclearningpro`.** `App.tsx` only applies wouter's `base` when `window.location.pathname` actually starts with it; otherwise it routes from `/`. Without this, loading the site from *any* URL that doesn't start with `/epiclearningpro` — e.g. Cloudflare's own `*.workers.dev` preview URL for this Worker — silently matched no route and rendered a blank white page. This was a real bug, not just a preview quirk: verified via `wrangler dev` + headless Chromium that the bare Worker root rendered nothing before this fix, and the full page after it.
- **Cloudflare "Runtime variables and secrets" ≠ build-time env vars.** Cloudflare's dashboard vars populate the deployed Worker's `env` at *request time*, not `process.env` during the git-connected *build* shell — they're two different execution contexts. `vite.config.ts` no longer depends on any dashboard-configured env var for a production build — `BASE_PATH` defaults to `/epiclearningpro/` in code, and `PORT` is only required for `vite dev`/`vite preview` (never touched by `vite build`). Runtime vars/secrets (like `RESEND_API_KEY`) are the right tool for anything read inside `worker/index.ts`'s `fetch` handler — that code genuinely runs per-request, so `env.RESEND_API_KEY` works correctly there.
- **Contact form: Resend over the Workers `fetch` API, no SMTP.** Workers can't hold raw SMTP sockets the way `nodemailer` needs, so the contact form calls Resend's HTTPS API directly instead. Requires `RESEND_API_KEY` set on the deployed Worker (Workers Builds → Settings → Variables, add it as a **Secret** so its value stays encrypted — not a plain Variable). Optional: `CONTACT_TO_EMAIL` (defaults to `contact@epiclearningpro.com`), `CONTACT_FROM_EMAIL` (defaults to `onboarding@resend.dev`, Resend's shared sandbox sender — for real production delivery, verify a sending domain in Resend and set this to an address on it). Since frontend and API are same-origin now, no CORS handling is needed (the old Express version needed the `cors` package for exactly this reason).
- **Admin portal is Path A: localStorage only, no backend yet.** Data attributes (`data-key`, `data-editable*`) in the site markup are deliberately kept stable so a future backend swap (planned: Supabase) doesn't require changing the site markup — only `admin-portal.js`'s persistence layer changes.
- **`pnpm-workspace.yaml` enforces a 24h minimum package release age** (supply-chain guard). A `pnpm install --no-frozen-lockfile` for a package released in the last day will fail with `ERR_PNPM_NO_MATURE_MATCHING_VERSION` — pin an older patch version rather than disabling the check.

## Product

Single-page marketing site: hero, services, about/credentials, testimonials, contact form. The differentiator is the admin portal — Olivia (non-technical) can click into edit mode (PIN-gated, PIN `8421`, hardcoded in `admin-portal.js`'s CONFIG section), and change text, swap images, edit brand colors (auto-detected from the page, applied everywhere those hexes appear), edit section backgrounds, and manage a promo banner — all live, no code changes, no redeploy.

### Admin portal storage layout

localStorage keys (all suffixed `-site_preview_001`):

- `ap-content-*` — text content snapshot
- `ap-original-*` — original snapshot (first load)
- `ap-colors-*` — OLD format `{ '--brand-primary': '#hex' }` (CSS vars)
- `ap-hexcolors-*` — NEW format `{ '#oldHex': '#newHex' }` (all site hexes)
- `ap-promo-*` — promo banner + section data
- `ap-img-*<key>` — base64 images per data-key
- `ap-section-bg-*` — per-section background objects

Logo key: `data-key="logo"`, shared by nav + footer `<img>`. Click opens a small floating panel with image-replace + brand-name text field. React `onClick` suppressed via a capture-phase listener on the wrapper button.

Stacking order: Editor bar (z:100000, top:0) → Promo Banner (z:99997, top:toolbarH) → Sticky header (top:toolbarH+bannerH) → body (`paddingTop` = sum). All set via `updatePageOffsets()`.

### Admin portal acceptance checklist (guide §14)

Re-verify against this list before shipping any change to logo, backgrounds, colors, promo, or contacts:

1. **Logo click** → `showLogoEditor(imgEl, wrapperEl)` — floating panel with "Replace Logo Image" + brand name field. Click doesn't scroll.
2. **Nav + footer logos in sync** — shared `data-key="logo"` + `querySelectorAll('[data-editable-image][data-key="logo"]')` updates all.
3. **Panel labeled "Backgrounds"** — toolbar button `id=ap-btn-backgrounds`, calls `openBgPanel()`.
4. **Backgrounds accordion one-open** — `wireAccordionOneOpen(panel)` called on panel open.
5. **Solid autofills solid** — `detectCurrentBgFromEl` reads inline `style` first (React sets it there), regex-parses; solid→solid, gradient→gradient, never mis-detected.
6. **Gradient autofills real start/end** — `parseGradientStr` splits gradient parts, extracts first/last hex/rgb stops.
7. **Live apply, no Preview button** — `.ap-bg-live` on all color/number inputs, wired to `applySectionBgAccRow` on both `input` and `change`. Type-switcher applies immediately too.
8. **All site hexes, Color 1/2/3 labels** — `getSiteColors()` scans section inline styles (weight 10), all inline styles (weight 3), `:root` (weight 5), stylesheet rules (weight 1); skips near-white/near-black noise; returns top 12 by frequency.
9. **Changing hex updates all uses** — `updateAllHexUses(old, new)` regex-replaces the old hex in `:root` inline style, brand CSS vars, and every `[style]` element attr.
10. **Contact links independent** — separate `contact.section.link-*` and `footer.link-*` keys; "Contact link N" labels in panel.
11. **Promo banner CTA → promo section** — `defaultBannerLink` set at modal-open time; `#ap-promo-sa` toggle auto-sets `#ap-promo-section` when the section is turned on, reverts to `#contact` when off.
12. **Banner off = no gap** — `applyPromoData` uses `display:'block'`/`'none'` (never an empty-string gap).
13. **Accordion one-open, yellow groups, blue in-place** — existing system unchanged.
14. **Exit discards unsaved** — confirm dialog on exit with dirty state; no silent save.

## User preferences

- pnpm only (root `preinstall` script hard-fails if anything else is used).
- No Replit dependency of any kind — hosting, dev plugins, or tooling. If you find yourself reaching for a `@replit/*` package or Replit-specific env var (`REPL_ID`, etc.), stop and find the non-Replit equivalent instead.
- Prefers small, direct fixes over broad refactors — see commit history for the general style.
- Keep this file as the single source of truth for project memory — don't reintroduce a separate `.agents/memory/` (or similar) split; fold new durable notes in here instead.

## Gotchas

- **Always run `pnpm run build` from the repo root**, not `vite build` directly inside `artifacts/epic-learning-pro` — the root script runs the typecheck gate first, which Cloudflare's build also relies on.
- The root `build` script filters to `@workspace/epic-learning-pro` only. If another artifact ever needs to be part of the production deploy, that filter needs to change deliberately — don't switch it back to `pnpm -r` without checking every workspace package's build script actually works headless in CI (this is exactly how the original Cloudflare build broke, on `mockup-sandbox`'s then-unconditional `PORT` requirement).
- Cloudflare Workers Builds runs `pnpm install --frozen-lockfile` — any dependency change needs `pnpm install --no-frozen-lockfile` run locally first to update `pnpm-lock.yaml`, or the build fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` / out-of-date lockfile errors.
- `pnpm-workspace.yaml`'s `overrides` block strips non-Linux platform binaries (esbuild, rollup, lightningcss, etc.) — intentional, keeps installs fast. Don't "fix" missing macOS/Windows binaries by removing these; the Cloudflare build environment is Linux-only anyway.
- If the site ever renders blank when loaded from an unfamiliar URL, check `App.tsx`'s router-base fallback first before assuming it's a Cloudflare routing/deploy problem — see Architecture decisions above.
