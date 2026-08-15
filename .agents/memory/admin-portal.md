---
name: Admin Portal Architecture
description: Key decisions and storage layout for Epic Learning Pro admin portal (Path A localStorage)
---

**Storage keys** (all suffixed `-site_preview_001`):
- `ap-content-*` — text content snap
- `ap-original-*` — original snap (first load)
- `ap-colors-*` — OLD format `{ '--brand-primary': '#hex' }` (CSS vars)
- `ap-hexcolors-*` — NEW format `{ '#oldHex': '#newHex' }` (all site hexes)
- `ap-promo-*` — promo banner + section data
- `ap-img-*<key>` — base64 images per data-key
- `ap-section-bg-*` — per-section background objects

**Why:** Data attributes (`data-key`, `data-editable*`) stay identical for future Cloudflare backend swap; only the script `src` changes.

**Logo key:** `data-key="logo"` shared by nav + footer `<img>`. Click opens small floating panel with image replace + brand.name text field. React onClick suppressed via capture-phase listener on the wrapper button.

**Stacking:** Editor bar (z:100000, top:0) → Promo Banner (z:99997, top:toolbarH) → Sticky header (top:toolbarH+bannerH) → body (paddingTop = sum). All set via `updatePageOffsets()`.

**PIN:** 8421
