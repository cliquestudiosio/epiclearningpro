---
name: Admin Portal Guide §14 Checklist
description: Implementation status of all guide checklist items for Epic Learning Pro admin portal
---

All items verified against code (JS syntax passes `node --check`):

1. **Logo click** → `showLogoEditor(imgEl, wrapperEl)` — small floating panel with "Replace Logo Image" button + brand name text input. Both editable. Click does not scroll.
2. **Nav + footer logos in sync** — shared `data-key="logo"` + `querySelectorAll('[data-editable-image][data-key="logo"]')` updates all.
3. **Panel labeled "Backgrounds"** — toolbar button id=`ap-btn-backgrounds`, calls `openBgPanel()`.
4. **Backgrounds accordion one-open** — `wireAccordionOneOpen(panel)` called on panel open.
5. **Solid autofills solid** — `detectCurrentBgFromEl` reads inline `style` attribute first (React sets it there), parses with regex; solid→solid, gradient→gradient, never mis-detected.
6. **Gradient autofills real start/end** — `parseGradientStr` splits gradient parts, extracts first/last hex/rgb color stops.
7. **Live apply, no Preview button** — `.ap-bg-live` class on all color/number inputs; wired to `applySectionBgAccRow` on both `input` and `change`. Type-switcher also calls it immediately.
8. **All site hexes, Color 1/2/3 labels** — `getSiteColors()` scans section inline styles (weight 10), all inline styles (weight 3), :root (weight 5), stylesheet rules (weight 1). Skips near-white/near-black noise. Returns top 12 sorted by frequency. Labels: "Color 1", "Color 2"…
9. **Changing hex updates all uses** — `updateAllHexUses(old, new)` regex-replaces old hex in :root inline style, brand CSS vars, and all `[style]` element attrs.
10. **Contact links independent** — separate `contact.section.link-*` and `footer.link-*` keys; "Contact link N" labels in panel.
11. **Promo banner CTA → promo section** — `defaultBannerLink` set at modal open time; `#ap-promo-sa` toggle handler auto-sets `#ap-promo-section` when section turned on, reverts to `#contact` when turned off.
12. **Banner off = no gap** — `applyPromoData` uses `display:'block'`/`'none'` (no empty string gap).
13. **Accordion one-open, yellow groups, blue in-place** — existing system unchanged.
14. **Exit discards unsaved** — confirm dialog on exit with dirty state; no silent save.

**Why:** Guide §14 is the acceptance gate. Any future change to logo, backgrounds, colors, promo, or contacts must re-verify against this list.
