---
name: Deployment Target
description: Where Epic Learning Pro is deployed (NOT Replit hosting)
---

**Frontend:** Cloudflare Workers (static assets), served at `portfolio.cliquestudios.io/epiclearningpro`. Configured via root `wrangler.jsonc` — `assets.directory` points to `artifacts/epic-learning-pro/dist/public`, and `worker/index.ts` strips the `/epiclearningpro` prefix before serving assets (the Worker route is a path match on the `cliquestudios.io` zone, not a full custom domain). Cloudflare Workers Builds runs `pnpm run build` (root script, filtered to `@workspace/epic-learning-pro` only — other artifacts like `mockup-sandbox` are dev-only and never built for deploy) then `wrangler deploy`. Build requires `PORT` and `BASE_PATH=/epiclearningpro/` set as build-time env vars in the Cloudflare dashboard (Workers Builds → Settings → Variables) — `PORT` is unused at build time but the Vite config requires it to be set.

**API:** Not yet decided. `render.yaml` exists (Render.com free web service, `buildCommand`/`startCommand` for `@workspace/api-server`) for the contact form's SMTP/nodemailer email sending — env vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO_EMAIL` are set on Render's dashboard, not in this repo. It's unconfirmed whether Render is actually deployed/active.

**Admin portal:** Client-side, localStorage-backed (Path A, see `admin-portal.md`). Planned: migrate to Supabase as the backend once the Cloudflare frontend deploy is confirmed working.

**Superseded:** GitHub Pages (`.github/workflows/deploy.yml`) and all Replit-hosting config (`.replit`, `.replitignore`, `@replit/vite-plugin-*`, `@replit/connectors-sdk`) have been removed — the code was originally built on Replit and exported, but Replit itself is no longer used for hosting or dev tooling.

**Admin PIN:** 8421 (hardcoded in admin-portal.js CONFIG section)
