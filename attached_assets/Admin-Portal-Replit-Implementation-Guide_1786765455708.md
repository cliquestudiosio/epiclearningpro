# Website Edit Admin Portal – Replit Implementation Guide (Path A)

**Purpose**  
Drop into a Replit project with an existing client site. Follow every rule. Do not improvise.

Path A = localStorage. Later Cloudflare. **Data attributes stay the same.**

---

## Non-negotiable principles

1. Do not break the existing site. Original HTML is fallback.
2. Editor top bar + Promo Banner push content down. Stack: **Editor bar → Promo Banner → site**. Banner off = no white gap.
3. Blue = in-place. Yellow = panel groups. Hover = bolder dash + light tint. Active blue clears on click-outside. No blue on children inside yellow groups.
4. Accordion: only one form open at a time in any panel list.
5. Add/remove cards + bullets update live DOM.
6. **Brand colors = every distinct hex used on the site** (not only 3 tokens). Changing a swatch updates every place that hex appears.
7. **Section backgrounds**: panel titled **Backgrounds**; per-section solid / gradient / image; **live apply on change** (no extra Preview click); correct autofill from computed styles.
8. Logo control edits **image + brand name text** together.
9. Promo banner CTA: if Promo Section is on → default scroll target is the Promo Section; if off → fallback CTA.
10. Exit discards unsaved. Save explicit. No silent-save.
11. “Website design by…” never editable.
12. Unbranded chrome.

---

## 1. Script tag

```html
<script src="/admin-portal.js" data-site-id="site_preview_001" defer></script>
```

---

## 2. Section order

1. Sticky Header  
2. Hero  
3. Temporary Promo (under Hero)  
4. Problem / Agitate  
5. Solution / Offer  
6. Social Proof  
7. About  
8. FAQ  
9. Final CTA  
10. Footer  

---

## 3. Logo + brand name (required)

Nav and footer logos that are the same asset share `data-key="logo"`.

**Edit-mode click on logo opens a small form / panel fields — not upload-only, not scroll:**

| Field | Purpose |
|--------|---------|
| Image | Replace upload (SVG/PNG) |
| Brand name text | Edit the text beside the logo |

Both must be editable from that control.  
`preventDefault` on logo link in edit mode so click never only scrolls to top.

```html
<img data-editable-image data-key="logo" src="...">
<span data-editable data-key="brand.name">Business Name</span>
```

Shared logo key updates nav + footer images together. Brand name can share `brand.name` in both places when it’s the same string.

---

## 4. Brand colors — all site hexes

**Do not limit the palette to Primary/Secondary/Accent only.**

### Behavior
1. Scan computed styles / CSS for distinct hex (and rgb that converts to hex) used on the page.
2. Build swatches for **every** distinct color found (cap at 12 if needed; prefer most-used first).
3. Labels: **Color 1, Color 2, Color 3…** ordered by frequency (most used at top). Optional short hint of role if obvious (e.g. Color 1) — no “Primary purple” style names.
4. Changing a swatch rewrites **every** occurrence of that old hex to the new hex (CSS variables if present, and inline/computed applications where the editor tracks them).
5. Gradient stop colors appear here only as hexes that exist; section gradient **editing** still lives under Backgrounds.

Empty slots only if under 12 colors found.

---

## 5. Backgrounds panel (required)

### UI
- Toolbar control label: **Backgrounds** (not “Sections”)
- Opens a panel with an **accordion list of sections** (Hero, About, Services, …) — only one open at a time
- Each section detects current background and autofills the correct mode:
  - solid → solid color picker filled with current color
  - gradient → gradient mode with **actual** start/end (and angle if available)
  - image → image mode with current image
- **Never** mis-detect a solid as gradient (About solid must show as solid)

### Modes per section
1. Solid color  
2. Gradient (start, end, optional angle)  
3. Image (upload/replace; cover/contain)

### Apply behavior (critical)
- Changes apply **immediately** when the user changes a color, gradient stop, or image  
- **No separate “Preview” button required** to see the result  
- Persist on Save to localStorage

```html
<section data-editable-section data-key="hero">...</section>
```

---

## 6. Contact links

- Group by placement: **Contact section** vs **Footer**
- Labels: Contact link 1, 2, 3… (never full email as title)
- Fields: Display text + URL (`mailto:`, `tel:`, `https://`)
- Display text **independent** per placement (footer “Email” ≠ contact block full address)
- Separate `data-key`s per instance

---

## 7. Promo Banner CTA default (required)

When the banner has a CTA / click action:

| Promo Section state | Default banner click target |
|---------------------|-----------------------------|
| **On (visible)** | Scroll to **Promo Section** |
| **Off** | Fallback (Final CTA / contact / configured link) |

Do not send users past the promo to the bottom CTA while the promo is visible. User can still override destination in the banner editor.

Banner: push content; off = height 0 no white gap; under editor bar when both on.

Promo Section: under Hero; first on = starter; after save = user content.

---

## 8. Icons on cards

1. Pick from icons already on this site (keeps section wrapper styling)  
2. Upload SVG/PNG  

No global icon library. Edit in panel only.

---

## 9. Lists / outlines / accordion

- Yellow groups for team, services, FAQs, testimonials, pain points  
- Add/remove/reorder + bullets + photos + icons → live DOM  
- Populate all fields from DOM (FAQ question **and** answer)  
- One accordion item open at a time  
- Blue in-place only for true in-place text; clear active on outside click  

---

## 10. Nav + Hero CTA

- Nav links + Nav button  
- Hero CTA: text + destination  
- High-contrast destination dropdowns  

---

## 11. Save / Exit

| Save | Explicit — “Saved (local preview mode)” |
|------|----------------------------------------|
| Exit + unsaved | Confirm → Discard loses changes |
| Never | Silent-save on exit |

---

## 12. Fail-safe text

Tag remaining visible text in main/footer (exclude credit).

---

## 13. Agent checklist

1. Read this document.  
2. Preserve layout.  
3. Script + site id.  
4. Logo: image **and** brand name editable; shared logo key; edit-mode click does not only scroll.  
5. **Backgrounds** panel (name exact): accordion sections; solid/gradient/image; correct autofill; **live apply, no Preview button**.  
6. Brand colors: **all** site hexes, frequency order, Color 1… labels; change updates all uses of that hex.  
7. Contact: separate keys/groups; Contact link 1… labels; independent display text.  
8. Promo banner CTA defaults to Promo Section when section is on.  
9. Banner no white gap; stack under editor bar.  
10. Icons, lists, outlines, accordion, Save/Exit per rules above.  
11. Run tests.

---

## 14. Test checklist

- [ ] Logo click in edit mode: replace **image** and edit **brand name text**  
- [ ] Nav + footer logos stay in sync  
- [ ] Panel labeled **Backgrounds** (not Sections)  
- [ ] Backgrounds accordion; one section open at a time  
- [ ] Solid section autofills solid (not wrongly gradient)  
- [ ] Gradient autofills real start/end  
- [ ] Changing background color/image applies **immediately** (no Preview click)  
- [ ] Brand panel lists all major site hexes (Color 1, 2, …)  
- [ ] Changing a brand hex updates every use of that hex  
- [ ] Contact link display texts independent per placement  
- [ ] Promo banner CTA scrolls to Promo Section when section is on  
- [ ] Banner off = no white gap  
- [ ] Accordion one-open; blue active clears; yellow on card groups  
- [ ] Exit discards unsaved  

---

## 15. Later backend

Change script `src` only. Replace localStorage with API.

---

**End of guide.**  
Live background apply. Full hex palette. Logo = image + text. Banner CTA prefers open Promo Section.
