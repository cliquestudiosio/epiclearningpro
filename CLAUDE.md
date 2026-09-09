# Epic Learning Pro

Marketing site for Epic Learning Pro (tutoring/coaching business, run by Olivia). Single-page site with a built-in visual editor ("admin portal") so Olivia can edit text, images, colors, and backgrounds directly in the browser, with no code deploys needed for content changes. The editor is a separate, licensable product (personal IP, unbranded in the client-facing UI) — this site is its first real deployment, not something built one-off for Epic Learning Pro.

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
- **Admin portal**: vanilla JS (`artifacts/epic-learning-pro/public/admin-portal.js` + `.css`), loaded directly by the built `index.html`, not part of the React bundle. Backed entirely by this site's own Cloudflare Worker (D1 + KV + R2 — see Backend section below) — localStorage is now just the working cache the editing UI reads/writes; it's hydrated on load from `window.__AP_CONTENT__` (inlined into the page server-side, no network call needed) and pushed back up to the Worker's own API on every save, using plain `fetch()` calls, same-origin, no external API keys on the page.
- **Contact form**: handled entirely by `worker/index.ts` (`POST /epiclearningpro/api/contact`), which calls the Resend API directly over `fetch`. No Express server involved in production.
- **Deploy**: Cloudflare Workers (static assets + the contact-form route), via `wrangler.jsonc` + `worker/index.ts`.
- **Legacy, not in the production path**: `artifacts/api-server` (Express contact-form backend) and `lib/db` (Drizzle/Postgres, empty schema scaffold) predate the Cloudflare setup — kept as reference/local-dev tools, not deployed anywhere. `render.yaml` was removed once the contact form moved to Cloudflare.

## Where things live

- `artifacts/epic-learning-pro/` — the actual deployed site (React app + admin portal). `src/` is the React app; `public/` is served as-is (admin-portal.js/css, favicon, robots.txt).
- `artifacts/mockup-sandbox/` — internal design-preview sandbox for building/reviewing UI mockup components before wiring them into the real site. Dev-only; never built or deployed (root `build` script deliberately skips it).
- `artifacts/api-server/` — legacy Express contact-form backend, superseded by `worker/index.ts`. Not wired into the Cloudflare deploy; kept only as reference.
- `lib/api-client-react`, `lib/api-zod`, `lib/api-spec`, `lib/db` — shared libraries, consumed as raw TS source (no build step — `exports` point straight at `src/`). Mostly unused scaffolding right now (`lib/db`'s schema is empty).
- `wrangler.jsonc` + `worker/index.ts` — Cloudflare Workers deploy config and the Worker itself. Jobs: strip the `/epiclearningpro` path prefix before handing static-asset requests to the assets binding; handle `POST /api/contact` (Resend email); handle the admin portal's own API (`/api/auth/login`, `/api/site-content`, `/api/upload-image`, `/api/images/*`) against D1/KV/R2; and inject the site's current content into every HTML response server-side (see Backend section).
- `attached_assets/` — original build inputs from the Replit-agent build (source copy doc, logo/photos actually used via the `@assets` Vite alias). Keep this to just what's actually referenced or has real reference value — it was previously a large pile of duplicate guide drafts and stray screenshots.

## Architecture decisions

- **Subpath deploy via a Worker script, not a Pages custom domain.** The site lives at `portfolio.cliquestudios.io/epiclearningpro`, a *path* on a domain that serves other things too — so it's a Cloudflare Workers **route** (`portfolio.cliquestudios.io/epiclearningpro*`), not a full custom domain. Cloudflare passes the full path through to the Worker, but the built assets live at the top level of the assets directory, so `worker/index.ts` strips the `/epiclearningpro` prefix before calling `env.ASSETS.fetch()`. If you ever change the deploy path, update `wrangler.jsonc`'s route pattern, the `BASE_PATH` constant in `worker/index.ts`, and the default in `vite.config.ts` together — they have to agree.
- **The client-side router defends against being loaded outside `/epiclearningpro`.** `App.tsx` only applies wouter's `base` when `window.location.pathname` actually starts with it; otherwise it routes from `/`. Without this, loading the site from *any* URL that doesn't start with `/epiclearningpro` — e.g. Cloudflare's own `*.workers.dev` preview URL for this Worker — silently matched no route and rendered a blank white page. This was a real bug, not just a preview quirk: verified via `wrangler dev` + headless Chromium that the bare Worker root rendered nothing before this fix, and the full page after it.
- **Cloudflare "Runtime variables and secrets" ≠ build-time env vars.** Cloudflare's dashboard vars populate the deployed Worker's `env` at *request time*, not `process.env` during the git-connected *build* shell — they're two different execution contexts. `vite.config.ts` no longer depends on any dashboard-configured env var for a production build — `BASE_PATH` defaults to `/epiclearningpro/` in code, and `PORT` is only required for `vite dev`/`vite preview` (never touched by `vite build`). Runtime vars/secrets (like `RESEND_API_KEY`) are the right tool for anything read inside `worker/index.ts`'s `fetch` handler — that code genuinely runs per-request, so `env.RESEND_API_KEY` works correctly there.
- **Contact form: Resend over the Workers `fetch` API, no SMTP.** Workers can't hold raw SMTP sockets the way `nodemailer` needs, so the contact form calls Resend's HTTPS API directly instead. Requires `RESEND_API_KEY` set on the deployed Worker (Workers Builds → Settings → Variables, add it as a **Secret** so its value stays encrypted — not a plain Variable). Optional: `CONTACT_TO_EMAIL` (defaults to `contact@epiclearningpro.com`), `CONTACT_FROM_EMAIL` (defaults to `onboarding@resend.dev`, Resend's shared sandbox sender — for real production delivery, verify a sending domain in Resend and set this to an address on it). Since frontend and API are same-origin now, no CORS handling is needed (the old Express version needed the `cors` package for exactly this reason).
- **Admin portal is Path C: Cloudflare-backed (D1 + KV + R2), not Supabase.** Two earlier passes tried Supabase, then a client-side "hide the page, fetch content, reveal" trick on top of it — both replaced. Data attributes (`data-key`, `data-editable*`) in the site markup stayed stable through all of it — only `admin-portal.js`'s persistence layer and `worker/index.ts` changed. See the Backend section below for the schema, auth model, and what's still deferred.
- **Content is inlined into the page server-side — no client-side hide/reveal trick, because none is needed.** The original bug: content loaded asynchronously *after* React's own initial paint, so every visitor briefly saw hardcoded defaults before their real edits appeared. The first fix (hide the page with `opacity:0` until a client-side fetch resolved) just relocated the problem — visitors saw a blank flash instead of a wrong-content flash. The actual fix: `worker/index.ts` reads the site's current content from its KV cache and injects it as `window.__AP_CONTENT__` directly into `<head>` via `HTMLRewriter`, before the response ever reaches the browser. `admin-portal.js`'s `boot()` reads that global synchronously — no network round trip, no hide/reveal needed, nothing to paper over. **This only works because it inlines *data*, not markup** — rewriting the static HTML's own text server-side would not work here: this is a client-rendered (not server-rendered) React app, so React would just overwrite any server-injected markup the instant it mounts. Inlining a data blob for the existing client-side overlay logic to consume sidesteps that entirely.
- **`run_worker_first: true` is required in `wrangler.jsonc`'s `assets` config for this to work.** Without it, an actual browser navigation (which sends `Sec-Fetch-Mode: navigate`) gets served the SPA-fallback HTML *directly by Cloudflare's static-assets system, bypassing the Worker's `fetch()` handler entirely* — the content injection (and any other per-request Worker logic) silently never runs for real page loads, even though it works fine for a plain `curl` (no such header) or for the `/api/*` routes (which don't match a static asset in the first place, so they always reach the Worker regardless of this flag). Caught this exact way in local testing: `curl` showed the injected content correctly, a real headless-browser navigation didn't, until this flag was set.
- **`admin-portal.js`'s DOM-patch functions must wait for an actual DOM-ready signal, not a guessed frame count.** React's initial commit is not guaranteed to finish within a single `requestAnimationFrame` for a tree this size — measured directly: `injectGear()` ran with `document.getElementById('ap-gear-anchor')` still `null` when gated by only one rAF. Fixed with `whenDomReady()`, which polls (rAF-driven, capped at 60 attempts) until a real React-rendered footer element exists before calling `init()` at all — see `admin-portal.js`. Don't replace this with a fixed setTimeout/rAF count; it'll pass most of the time and fail unpredictably under load, which is exactly how the original 420ms/60ms/80ms delays this replaced came to exist in the first place.
- **`pnpm-workspace.yaml` enforces a 24h minimum package release age** (supply-chain guard). A `pnpm install --no-frozen-lockfile` for a package released in the last day will fail with `ERR_PNPM_NO_MATURE_MATCHING_VERSION` — pin an older patch version rather than disabling the check.

## Product

Single-page marketing site: hero, services, about/credentials, testimonials, contact form. The differentiator is the admin portal — Olivia (non-technical) can log in (email + password) and click into edit mode, and change text, swap images, edit brand colors (auto-detected from the page, applied everywhere those hexes appear), edit section backgrounds, and manage a promo banner — all live, no code changes, no redeploy, visible to every site visitor immediately (not just her own browser).

## Backend (Cloudflare — D1 + KV + R2)

The admin portal's entire backend lives in Cloudflare, in the same account as the site's own Worker — deliberately **not Supabase** (tried first, then dropped: same-platform-as-frontend was the deciding factor, plus it enables the server-side content injection described above, which a cross-network Supabase call couldn't support cleanly) and deliberately **not** `Clique_Studios_Admin_Portal`-equivalent shared infra either. Resources, shared across every client site this editor gets embedded in (not epiclearningpro-specific):

- **D1 database** `client-facing-tools` (`6a0fb82e-a992-4639-a148-76606e79f4b3`) — source of truth for accounts, access, and content.
- **KV namespace** `client-facing-tools-content` (`dde5b372d4a14fc6bf71946391934808`) — read-through cache of `site_content` rows, keyed by site slug. Populated lazily on a read miss and kept in sync on every save (see `getSiteContent`/`saveSiteContent` in `worker/index.ts`). This is what the per-request content injection reads — an edge-local KV read, not a cross-network call, is what keeps that injection fast.
- **R2 bucket** `client-facing-tools-images` — **not yet enabled.** R2 requires a one-time manual "Enable R2" step in the Cloudflare dashboard (billing/terms acceptance the API can't do on your behalf) — `r2_bucket_create` failed with a 403 asking for exactly this. Image upload/replace code is written and wired (`env.IMAGES` in `worker/index.ts`) but returns a 503 until this is done; no images are in use on any site yet, so nothing is blocked by this. **Follow-up: enable R2 in the dashboard, then create the bucket** (`r2_bucket_create` via the Cloudflare MCP tools, or `wrangler r2 bucket create client-facing-tools-images`) and add an `r2_buckets` entry to `wrangler.jsonc` binding it as `IMAGES`.

### Schema (`client-facing-tools` D1 database)

- `sites` — one row per client site (`slug`, `name`, `url`, `subscription_active`). `slug` is the site's public **Site ID** (the `data-site-id` attribute on the `admin-portal.js` script tag — for this site, `site_elp_7f3a9c2e`). `subscription_active` is a manual flag for now (not yet wired to Stripe); intent per product spec is "script silently does nothing if subscription inactive" — **not yet enforced, still to do.**
- `site_content` — one row per site: `content`, `hex_colors`, `promo`, `section_bg`, `images` (all JSON stored as TEXT — D1/SQLite has no native jsonb), `updated_at`, `updated_by`.
- `users` — one row per login: `email`, `password_hash` (PBKDF2, see Auth model below), `username` (display name, for attribution), `is_disabled`, `is_staff`.
- `sessions` — `token` (opaque, 32 random bytes hex-encoded) → `user_id`, `expires_at` (24h from login — generous on purpose, see Auth model).
- `site_editors` — `(user_id, site_slug)` grants: a **client** account can only write to sites it's explicitly assigned to here. Doesn't apply to staff — see below.

Access control is enforced in `worker/index.ts` (`authenticate()` + `canEditSite()`), not by a database-level policy layer the way Supabase's RLS worked — D1 has no equivalent, so the Worker's own code is the single enforcement point for every `/api/site-content` and `/api/upload-image` call. `GET /api/site-content` is public (the site needs to render for every visitor); `PATCH` requires a valid, non-expired session for a non-disabled user who is either `is_staff` or has a matching `site_editors` row for that `site_slug`.

### Auth model

**One login page, for everyone — clients and Clique Studios staff alike.** There's no separate "developer" login flow; the gear icon always shows the same email + password form (`POST /api/auth/login`). What an account can do is purely a database question, not a UI one:

- **Client accounts** (e.g. Olivia's) are scoped via `site_editors` — they can only ever write to sites explicitly granted to them.
- **Staff accounts** have `users.is_staff = true`, which grants write access to *every* site automatically — no `site_editors` row needed per site, so a new site launching doesn't require manually re-granting every developer. Each developer still gets their **own named account** (`users.username` holds their display name) rather than a shared credential, specifically so `site_content.updated_by` gives real attribution — "who made this change" — even when it's staff, not the client. This intentionally replaces the original spec's shared "Developer PIN" concept (see below) — named accounts give per-person attribution that a shared PIN structurally cannot, and cost nothing extra since the whole auth mechanism is already built.
- Passwords are hashed with **PBKDF2-SHA256** (210,000 iterations, per-user random salt; format `pbkdf2$<iterations>$<salt-hex>$<hash-hex>`) via Web Crypto's `crypto.subtle` — Workers has no native bcrypt, and PBKDF2 at this iteration count is an accepted, well-supported alternative. Verified with a constant-time comparison (`timingSafeEqual` in `worker/index.ts`).
- Session tokens are opaque random values stored in D1 (`sessions` table), sent as `Authorization: Bearer <token>`, cached client-side in `sessionStorage` (not `localStorage`) — so the session ends when the browser closes, per product spec, without needing a short server-side expiry or a refresh-token dance. Server-side expiry is a generous 24h (`SESSION_TTL_MS` in `worker/index.ts`); it's `sessionStorage` clearing, not token expiry, that does the real work of "log in again next time you open the browser."
- Magic-link/OTP login was considered and deliberately rejected: it makes every login depend on email being reachable and fast, which is a bad property specifically on a live client support call, and it doesn't help with the access-scoping problem at all (that's what `is_staff`/`site_editors` solve).

Olivia's login: `contact@epiclearningpro.com`. Staff logins: one per developer, `is_staff = true` (e.g. `onnae@cliquestudios.io`). All passwords were freshly issued when these accounts were created in D1 (Supabase password hashes weren't portable — different hashing scheme — so this was a clean-slate credential reissue during the migration, not a preserved carryover). There's no self-service password reset yet (no email-sending wired to auth) — rotating a password today means generating a new PBKDF2 hash and updating the `users` row directly via `d1_database_query`.

`admin-portal.js` talks to the Worker via plain same-origin `fetch()` calls (`SB` object near the top of the file) — `API_BASE` is `BASE_PATH + 'api/'`, so no CORS handling and no external API keys/URLs on the page at all (an improvement over the Supabase pass, which needed a publishable key and URL in `index.html`).

### Deferred (spec'd, not built)

Per the product design doc (`Website Edit Admin Portal — Durable Extract`, kept up to date in Google Drive as `Website_Edit_Portal.md`), two more pieces are real requirements but explicitly out of scope for this pass — don't assume they exist:

- **Client Tools site** — a page on Clique Studios' own site where clients use a 6-8 digit **Site Code** for account actions (can't-log-in, billing, change email). Separate site, not built.
- **Stripe/entitlement wiring** — `sites.subscription_active` exists as a flag but isn't checked by `admin-portal.js` yet, and isn't connected to Stripe.

The original spec's shared **Developer PIN** (staff-only, rate-limited, masked, validated against Site ID) is **superseded, not deferred** — see Auth model above for why named staff accounts replace it.

### Admin portal storage layout (local working cache)

localStorage keys (all suffixed `-site_elp_7f3a9c2e`) are still used as the editing UI's working cache — hydrated from `window.__AP_CONTENT__` on every page load (no fetch), pushed back up (debounced) to the Worker after every save:

- `ap-content-*` — text content snapshot (→ `site_content.content`)
- `ap-original-*` — original snapshot (first load) — **still local-only**, used for the 14-day "restore to original" feature; not synced to the backend
- `ap-colors-*` — OLD format `{ '--brand-primary': '#hex' }` (CSS vars) — legacy, not synced to the backend
- `ap-hexcolors-*` — NEW format `{ '#oldHex': '#newHex' }` (all site hexes) (→ `site_content.hex_colors`)
- `ap-promo-*` — promo banner + section data (→ `site_content.promo`)
- `ap-img-*<key>` — image per data-key; a `data:` URL until the next save uploads it via the Worker to R2 and swaps the cached value for the resulting public URL (→ `site_content.images`) — currently a no-op until R2 is enabled, see Backend section
- `ap-section-bg-*` — per-section background objects (→ `site_content.section_bg`)

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
- **`wrangler dev --local` emulates D1/KV/R2 with empty local state, separate from the real remote resources** — the IDs in `wrangler.jsonc` just name the local emulation files, they don't fetch real data unless you pass `--remote`. After any schema change, re-seed local state with `wrangler d1 execute client-facing-tools --local --command "..."` before testing (or `wrangler kv key put --local`/`wrangler r2 object put --local` for KV/R2), or every request will 500 on `no such table`. This is actually an upgrade over the old Supabase setup, where local testing needed real network access to a remote Postgres instance — D1/KV/R2 local emulation needs no network at all, so full end-to-end testing (login, save, content injection) works even in network-restricted sandboxes.
- **Don't forget to `pnpm run build` before testing `wrangler dev`** — `wrangler.jsonc`'s assets directory is the *built* `dist/public`, not the source `public/` folder. Editing `admin-portal.js` and testing immediately without rebuilding serves the stale pre-edit bundle with no error or warning — this cost real debugging time once already (chased a phantom "gear icon missing" bug that was actually just an unbuilt edit).
- **R2 image uploads are stubbed pending a one-time manual step**: `env.IMAGES` isn't bound in `wrangler.jsonc` yet because the bucket doesn't exist yet, because R2 needs to be manually enabled in the Cloudflare dashboard first (see Backend section). `handleImageUpload`/`handleImageGet` in `worker/index.ts` return a 503 until this is done and the binding is added.
