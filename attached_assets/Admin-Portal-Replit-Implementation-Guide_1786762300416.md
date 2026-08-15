# Website Edit Admin Portal – Replit Implementation Guide (Path A)

**Purpose**  
Drop into a Replit project that already has a client website.  
Follow every rule. Do not improvise.

Path A = localStorage for testing today.  
Later: Cloudflare backend. **Data attributes stay identical.**

---

## Non-negotiable principles

1. Do not break the existing site. Script only adds behavior. Original HTML is fallback.
2. **Never cover the nav.** Editor top bar and Promo Banner both **push content down**.  
   Stack when both on: **Editor top bar (absolute top) → Promo Banner → site**.
3. Promo Banner off = **zero leftover gap** above sticky header (no white strip).
4. Structured cards = side-panel only. **Never** blue in-place outlines on them.
5. **Blue** = in-place text. **Yellow** = panel groups.  
   Hover = **bolder dashed border** (preferred), not heavy opaque fills.  
   Active blue state **clears on click-outside / blur** — must not stick.
6. Inside a yellow group, **do not** put blue outlines on child photos/icons/fields. Those edit inside the panel.
7. Add/remove cards and bullets must update the **live DOM**.
8. Side-panel accordion: **only one form expanded at a time** (expanding one collapses others).
9. Brand palette labels: **Primary, Secondary, Accent, … only** — no color names (“purple”, “teal”).
10. Gradients / section backgrounds are **not** brand swatches. Edit per-section, separately.
11. Exit discards unsaved (confirm). Save is explicit. No silent-save.
12. “Website design by [Company]” credit is **never** editable.
13. Completely unbranded editor chrome.

---

## 1. Script tag

```html
<script src="/admin-portal.js" data-site-id="site_preview_001" defer></script>
```

Unique Site ID per client. Every page.

---

## 2. Section order

1. Sticky Header  
2. Hero  
3. **Temporary Promo** (always under Hero)  
4. Problem / Agitate  
5. Solution / Offer  
6. Social Proof  
7. About  
8. FAQ  
9. Final CTA  
10. Footer  

---

## 3. Edit modes and outlines

### Blue — in-place only
- Headings, paragraphs, simple button **labels**, quote, attribution, brand name text, etc.
- Default: dashed blue border (subtle).
- Hover: **bolder dashed border** + light blue tint (not heavy opacity fill).
- Focus/active: may strengthen slightly while editing.
- **On blur / click outside: fully clear active styling.** Never leave a stuck opaque state.

### Yellow — side-panel groups only
- Team, Services, Testimonials, FAQs, Agitate/pain-point cards, any repeating card group.
- Default: dashed yellow around the **group** (or each card in the group consistently).
- Hover: **bolder yellow dashed border** (not opacity wash).
- Click group/card → open content panel for that list.
- Selected item in panel → stronger yellow highlight on that specific card.
- **Children inside yellow (photos, icons, inner text) get NO blue outline.** Edit those fields in the panel only.

### FAQ / testimonials / team / services
Must be yellow. If any still show blue, that is a bug.

---

## 4. Data attributes

### In-place text
```html
<h1 data-editable data-key="home.hero-title">...</h1>
<a data-editable data-key="home.hero-cta-label" href="...">Button text</a>
<p data-editable data-key="about.quote">...</p>
<p data-editable data-key="about.quote-attribution">...</p>
<span data-editable data-key="brand.name">Business Name</span>
```

### Hero / any CTA button (text + destination)
Hero primary button and similar CTAs need **both**:
- Display text (in-place or small form)
- Destination (scroll section / internal / external)  
Prefer side-panel or a compact control so text **and** link are editable. Same pattern as nav links.

### Images / logos
```html
<img data-editable-image data-key="logo" src="..." alt="Logo">
```
- Nav logo and footer logo **same `data-key="logo"`** → editing one updates both.
- Logo image is editable via replace control.
- If logo is wrapped in `<a href="#">` for scroll-to-top, **edit mode must not let the click only scroll**. In edit mode: click logo → replace image (or open logo fields). Scroll-to-top behavior only outside edit mode.
- Brand name text beside logo: `data-editable data-key="brand.name"` in nav and footer.

### Structured lists (yellow, panel only)
```html
<div data-editable-list="team" data-key="team.members">...</div>
<div data-editable-list="services" data-key="services.items">...</div>
<div data-editable-list="testimonials" data-key="testimonials.items">...</div>
<div data-editable-list="faqs" data-key="faqs.items">...</div>
<div data-editable-list="agitate" data-key="agitate.items">...</div>
```

**Every list must support:**
- Add card → new card appears on page
- Remove card → removed from page
- Reorder via dragging forms
- **Populate all fields from existing DOM** (FAQ answer must load; not empty)

### Card fields (generic — detect from existing markup)
Whatever the card already has, expose in the form:
- Title, description, body
- Photo (replace)
- **Icon** (if present — see Icons below)
- **Bullets** (if present): each bullet a field; +/− adds/removes real DOM bullets
- CTA label + href if present
- Testimonial: review, name, **source**, stars if present
- FAQ: **question and answer** (both populated from DOM)

### Icons on cards
When a card has an icon (`<img>`, inline SVG, or icon-font class):
- Panel field: **Icon**
- Path A options (use what fits the markup):
  1. If `<img>` or SVG image → file replace (same as photos)
  2. If inline SVG → replace with uploaded SVG or pick from icons already used on the site
  3. If icon-font / class → dropdown of icon classes **already detected on this site** (keep brand style; do not invent a huge external icon set)
- Do not put a blue outline on the icon in the page; edit only in panel.

### Nav (including CTA button)
```html
<nav data-editable-nav data-key="nav.items">...</nav>
```
- Every link + the CTA button (“Nav button”)
- Fields: display text, destination type, destination value
- Scroll targets: dropdown of real section ids, **high contrast** labels

### Footer links / contact / social
- Editable as contact-style (display text + href) or nav-style
- **Labels in the panel must reflect the link’s purpose from current text or URL**  
  e.g. if href is Instagram → label “Instagram”, not “Alignable link” forever  
  Derive label from link text first; if text is generic, derive from hostname
- Email, phone, social all editable
- Credit “Website design by…” **not** editable

### Brand colors (palette only)
- Swatches labeled **Primary, Secondary, Accent, Brand 4, …** only  
  **Never** “Primary purple” or “Secondary teal”
- Pull from CSS variables and solid theme colors used for text, buttons, accents, borders
- **Do not list gradient stop tokens** (Hero Gradient Start/End) as brand swatches
- Changing Primary/Secondary/Accent updates all uses of those variables site-wide
- Max 12

### Section backgrounds (separate from brand palette)
- Backgrounds (solid or gradient) are edited **per section**, not as global brand swatches
- Control: when a section is targeted, allow:
  - Solid color, or
  - Gradient start + gradient end
- Does not dump “Hero Gradient Start” into the main brand list
- Must work for Hero and other sections that use gradient/solid backgrounds

### Promo Banner
- Pushes page down; never covers nav
- Under editor top bar when both visible
- **When turned off / closed: height 0, no white gap above sticky header**
- Sticky header must sit flush under editor bar (or under top of viewport when editor closed)

### Promo Section
- Under Hero
- First on → starter content; after save → user content on toggle

---

## 5. Side panel UX

- **Accordion: only one item expanded at a time.** Opening one closes the others.
- Stable labels: “Service 1”, “Pain point 2”, “Team member 1”, “FAQ 3”, “Nav button”
- Not live titles as section headers
- High-contrast form controls (no gray-on-gray dropdowns)
- Add/remove/reorder and bullets/icons/photos all persist to live DOM on change (and to localStorage on Save)

---

## 6. Fail-safe: no missing text

After structured tagging, scan visible text in main + footer (exclude scripts, credit line).  
Any untagged customer-facing text → `data-editable` with stable key.  
Examples that often get missed: quote attribution, hero button, eyebrows, footer business name.

---

## 7. Save / Exit

| Action | Behavior |
|--------|----------|
| Save | Explicit. Path A: “Saved (local preview mode)” |
| Exit with unsaved | Confirm. **Discard** = lose changes. Never silent-save |
| Exit clean | Leave edit mode |

---

## 8. Editor UI summary

| Element | Behavior |
|--------|----------|
| Gear | Inline with footer credit, vertically centered; credit not editable |
| Blue outline | In-place only; hover bolder dash + light tint; **clears when inactive** |
| Yellow outline | Panel groups; hover bolder dash; no blue on children |
| Editor top bar | Pushes page; always above Promo Banner |
| Promo Banner | Pushes page; off = no gap |
| Side panels | Movable, collapsible; **one accordion open at a time** |
| Color panel | Brand labels Primary/Secondary/Accent only; no gradient tokens |
| Section background | Separate per-section solid/gradient editor |

---

## 9. Agent checklist

1. Read this document fully.
2. Preserve layout.
3. Script + site id every page.
4. Tag regions + fail-safe text pass (hero CTA, quote attribution, brand name, etc.).
5. Brand CSS variables; palette labels Primary/Secondary/Accent only; exclude gradient stops from brand list.
6. Section background editor for solid/gradient sections.
7. Promo under Hero; banner push + **no gap when off**; stack under editor bar.
8. Gear + non-editable credit.
9. Blue/yellow rules exact; no stuck active blue; no blue on yellow children (photos).
10. All lists: add/remove/reorder + populate all fields from DOM (FAQ answers!).
11. Icons on cards editable in panel.
12. Bullets +/− on **any** card that has bullets.
13. Team / FAQ / testimonials add-remove works on live page.
14. Logo shared key; edit mode click replaces image (doesn’t only scroll); brand name editable.
15. Nav + Nav button; footer links with smart labels.
16. Accordion: one open at a time.
17. Save explicit; Exit discards unsaved.
18. Run test checklist.

---

## 10. Test checklist (all must pass)

- [ ] Only one side-panel form open at a time  
- [ ] Blue hover = bolder dash + light tint; **active clears on click-outside**  
- [ ] Yellow hover = bolder dash; testimonials/FAQ/team/services show yellow  
- [ ] No blue outline on photos/icons inside yellow cards  
- [ ] Hero button: text + destination editable  
- [ ] Section backgrounds (incl. gradients) editable per section  
- [ ] Brand swatches labeled Primary/Secondary/Accent only (no “purple/teal”, no gradient tokens)  
- [ ] Promo Banner off = no white gap above sticky header  
- [ ] Editor bar above Promo Banner; both push content  
- [ ] Add/remove team, services, pain points, FAQs, testimonials updates live page  
- [ ] FAQ form shows **question and answer** populated from DOM  
- [ ] Bullets +/− work on any card that has bullets  
- [ ] Card icons editable in panel  
- [ ] Logo nav+footer synced; replace works in edit mode (not scroll-only)  
- [ ] Brand name text editable nav + footer  
- [ ] Footer social/email editable; panel labels match link purpose  
- [ ] Credit not editable  
- [ ] Exit discards unsaved; no silent-save  
- [ ] Nav scroll/hover styles not randomly changed by entering edit mode  

---

## 11. Later backend

Change script `src` only. Replace localStorage with API. Keep attributes.

---

**End of guide.**  
Generalize card logic (add/remove, bullets, icons, photos) so it works on every site structure—not only “services.”  
Outlines, gaps, stuck states, empty FAQ answers, and unsynced logos are release blockers.
