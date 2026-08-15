---
name: Deployment Target
description: Where Epic Learning Pro is deployed (NOT Replit hosting)
---

**Frontend:** GitHub Pages — repo `takalla.github.io/epiclearningpro`, base path `/epiclearningpro/`. GitHub Actions (`deploy.yml`) builds on push and deploys.

**API:** Render.com free web service — configured via `render.yaml`. Contact form uses nodemailer/SMTP. Env vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `TO_EMAIL` must be set on Render dashboard.

**Frontend → API:** `VITE_API_URL` GitHub Actions secret must be set to the Render service URL.

**Why:** Olivia wants free hosting with no ongoing Replit dependency after handoff. Data attributes in HTML stay identical; only the admin-portal.js `src` would change for a future Cloudflare backend.

**Admin PIN:** 8421 (hardcoded in admin-portal.js CONFIG section)
