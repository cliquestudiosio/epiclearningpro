# Website Edit Admin Portal – Replit Implementation Guide (Path A)

**Purpose**  
Drop this into a Replit project that already has a client website.  
Follow every rule below. Do not improvise around them.

This Path A version uses localStorage so the site is testable today.  
Later we swap storage/auth for Cloudflare. **Data attributes stay the same.**

---

## Non-negotiable principles

1. **Do not break the existing site.** Script only adds behavior. Original HTML is the permanent fallback.
2. **Never cover the navigation.** The Promo Banner AND the editor top bar both push the entire page content down. They never overlay the sticky header/nav.
3. **Structured cards are never contenteditable on the page.** They edit only via side-panel forms.
4. **Clear visual language for edit modes:**
   - **Blue** dashed outline = in-place editable (type directly on the page)
   - **Yellow** outline = side-panel editable (group of cards; edit via pop-up panel)
   - Blue hover: stronger outline + light blue background tint
   - Yellow: when a specific item is selected in the side panel, highlight that card on the page
   - Outline colors must stay visible on both light and dark section backgrounds
5. **Promo Section always sits directly under the Hero.**
6. **First time Promo is toggled on = branded starter content. After that = whatever the user last saved.**
7. **Brand color editing must work.** Auto-extract site colors, show swatches, update CSS variables live.
8. **Images (including team photos and logos) must be replaceable.**
9. Completely unbranded editor chrome.
10. **Only floating side panels need to be movable.** The editor top bar and Promo Banner do not move — they push content down.

---

## 1. Script tag

Every page, just before `</body>`:

```html
<script 
  src="/admin-portal.js" 
  data-site-id="site_preview_001"
  defer>
</script>
```

Use a unique alphanumeric Site ID per client.

---

## 2. Standard section order

Default outline (do not reorder an existing site unless asked):

1. Sticky Header  
2. Hero  
3. **Temporary Promo** ← always here when present  
4. Problem / Agitate  
5. Solution / Offer  
6. Social Proof  
7. About  
8. FAQ  
9. Final CTA  
10. Footer  

**Promo Section placement rule (required):**  
Always insert/move the Promo Section so it is the **first sibling after the Hero**.  
Never leave it under Services, About, or anywhere else.

---

## 3. Data attributes

### In-place text (simple only)
```html
<h1 data-editable data-key="home.hero-title">...</h1>
<p data-editable data-key="home.hero-subtitle">...</p>
<button data-editable data-key="home.cta-label">...</button>
```

### Images (must be replaceable)
```html
<img data-editable-image data-key="logo" src="..." alt="Logo">
<img data-editable-image data-key="team.member-1.photo" src="..." alt="...">
```

### Structured lists (side-panel forms ONLY)
```html
<div data-editable-list="team" data-key="team.members">...</div>
<div data-editable-list="services" data-key="services.items">...</div>
<div data-editable-list="testimonials" data-key="testimonials.items">...</div>
<div data-editable-list="faqs" data-key="faqs.items">...</div>
<div data-editable-list="agitate" data-key="agitate.items">...</div>
```

### Contact (text + link pairs → side panel)
```html
<a data-editable-contact data-key="contact.phone" href="tel:...">...</a>
<a data-editable-contact data-key="contact.email" href="mailto:...">...</a>
```

### Navigation (text + destination → side panel)
```html
<nav data-editable-nav data-key="nav.items">
  <a href="#services">Services</a>
  ...
</nav>
```

### Brand colors
```css
:root {
  --brand-primary: #...;
  --brand-secondary: #...;
  --brand-accent: #...;
  /* max 12 */
}
```

### Promo Banner (must NOT cover nav)
```html
<div data-promo-banner data-key="promo.banner" style="display:none;">
  ...
</div>
```

**Banner layout rule (required):**  
When the banner is visible it must **push the entire page content down** by its own height.  
It must never overlay or sit on top of the sticky header/nav.  
No absolute/fixed overlay that covers navigation.

### Promo Section (under Hero, with starter content)
```html
<section data-promo-section data-key="promo.section" data-promo-layout="cards" style="display:none;">
  <!-- starter content required -->
</section>
```

If missing from the site: **add it directly under the Hero**, hidden by default.

---

## 4. Path A editor behavior

### On load
1. Read `data-site-id`
2. Load `localStorage` key `admin-portal-content-{siteId}`
3. Apply saved content + brand color overrides
4. If nothing saved, leave original HTML (this is the original snapshot)

### Gear icon (exact)
- Inline with "Website design by [Company]" footer credit, immediately after the company name
- Vertically centered with that text
- Small, low opacity, muted
- Hover: slight spin + color shift
- Tooltip: "Admin editor"
- Desktop only
- Never fixed bottom-right

### Login (Path A)
- Email/password mock OR "Developer access" → masked PIN
- For testing, accept a simple mock PIN (e.g. `123456`) stored or hardcoded

### Two editing modes (strict)

**In-place only:**
- Headings, paragraphs, simple button labels, plain non-linked text

**Side-panel forms only (NO page outlines that invite typing):**
- Team, Services, Testimonials, FAQs, Agitate cards
- Promo featured cards
- Contact items with href
- Navigation links
- Any card that has internal structure (bullets, stars, source, photo, etc.)

**Outline / highlight system (required):**
- **Blue** dashed outline = truly in-place editable. On hover: bolder blue outline + light blue background tint.
- **Yellow** outline = side-panel editable group (e.g. all service cards together, all FAQs together). Does not invite typing on the page.
- When the user selects a specific item inside the side panel (e.g. Service 2), highlight that individual card on the page (stronger yellow).
- Outline colors must remain visible on both light and dark backgrounds (use semi-transparent fills + contrasting stroke).
- Never put a blue type-here outline on a yellow/side-panel-only region.

### Side panel rules (required)
- Movable by dragging the header
- Collapsible / minimizable
- Never permanently covers nav
- Every structured list uses collapsible accordion forms
- Form **labels** are generic and stable:
  - "Pain point 1", "Pain point 2"…  
  - "Service 1", "Service 2"…  
  - "Testimonial 1"…  
  - NOT the current title text (titles change; labels must not)
- Fields mirror existing card structure
- Placeholder / helper text in fields
- Soft character guidance from existing lengths
- Drag forms to reorder
- Add / remove items
- **Bullet lists inside a card:** each bullet is its own field; user can add/remove bullets
- Visual cards re-render from form data only

### Testimonials fields (required when structure exists)
- Review text
- Name
- Source (Google, Instagram, website, etc.) — **must be editable if present on the card**
- Stars / rating if present

### Navigation editing (required)
Side-panel form per nav item:
- Display text
- Destination type: Scroll to section / Internal page / External URL
- Destination value
- For "Scroll to section": provide a **dropdown of existing section ids** on the page (do not say "defined in code only")

### Contact editing (required)
Side-panel form:
- Display text
- Link/URL (`tel:`, `mailto:`, or full URL)

### Images (required — currently broken)
- Any `data-editable-image` must open a replace/upload control
- Team member photos must be replaceable
- Logo must be replaceable
- Path A: use file input → object URL or base64 into localStorage for preview
- Later: real upload to R2

### Brand colors (required — currently partial)
- Toolbar control: "Colors"
- Auto-extract hexes from CSS variables and prominent computed colors
- Canva-style swatches, max 12
- Changing a swatch updates the CSS variable across the page
- Color panel must be **movable** (same as content panel)
- Fix accent consistency: if service cards use paired accent colors (eyebrow + bullets), changing a brand color must keep those pairs coherent or expose both tokens clearly

### Editor top bar behavior (required)
- When edit mode is active, the editor top bar **pushes the entire page content down** by its own height
- Never overlays or covers the sticky header/nav
- Does not need to be movable or collapsible
- Only floating side panels (content forms, color panel, etc.) are movable

### Promo Banner behavior (required)
- Toggle on/off
- When on: **pushes entire page down** by banner height
- Never overlays sticky header/nav
- Editable text + optional link
- Optional background color

### Promo Section behavior (required)
- Placement: first element after Hero
- Toggle on/off
- **First time toggled on (no saved promo content):** show branded starter content  
  - Cards: 2–3 sample cards using site brand colors and realistic placeholder copy for this business type  
  - Hero: sample background + headline + text + CTA  
- **After user saves promo content:** toggling off/on restores their saved version (not blank, not re-seeded starter)
- Layout switcher: Cards | Hero (one active)
- Cards: soft max 3 (recommend 3, allow more); independent list; side-panel forms
- Hero: background image, headline, text, one CTA
- All promo panels movable + collapsible

### Save / Exit behavior (required)
- Explicit **Save** action
- Closing/exiting with unsaved changes → confirmation: "You have unsaved changes. Discard or Save?"
- Do not silently write on every exit
- Path A confirmation text: "Saved (local preview mode)"
- Later real version: "This will go live for everyone"

### Preview
- Hides all editor chrome
- Small "Back to Edit" control remains

### Restore original
- First-load content = original snapshot
- "Restore to original version" available (simulate 14-day window in Path A)

---

## 5. Editor UI visual spec (fixed design system)

Do **not** theme editor chrome to each client’s brand.

| Element | Spec |
|--------|------|
| Gear | Inline with footer credit, vertically centered, muted, hover spin + tooltip |
| In-place highlight | **Blue** dashed outline; hover = bolder outline + light blue tint |
| Side-panel group highlight | **Yellow** outline around the whole group; selected item in panel = stronger yellow on that card |
| Editor top bar | Dark neutral; **pushes entire page content down** (same rule as Promo Banner). Does not overlay nav. Does not need to be movable. |
| Side panel (content / promo forms) | Dark neutral; drag header to move; collapse/minimize |
| Color panel | Movable + collapsible |
| Promo Banner | Pushes entire page down; never covers nav |

---

## 6. Files to create

```
/
├── index.html (and other pages)
├── admin-portal.js
├── admin-portal.css
└── (existing site files)
```

---

## 7. Replit agent checklist (do in order)

1. Read this entire document.
2. Scan HTML. Do not destroy existing layout.
3. Add script tag + unique `data-site-id` on every page.
4. Tag editable regions with correct attributes.
5. Ensure `:root` brand CSS variables exist (create from site colors if missing).
6. **Promo Section:** if missing, insert directly under Hero, hidden, with Cards starter content. If present in wrong place, **move it under Hero**.
7. **Promo Banner:** implement so it pushes page content down; never covers nav.
8. Gear: inline with footer credit, vertically centered.
9. Implement in-place editing only for simple text.
10. Implement side-panel forms for all structured lists; form labels = "Item 1", "Item 2" style, not live titles.
11. Testimonials: include Source field when the card has it.
12. Nav links: display text + destination type + destination value; scroll targets as dropdown of real section ids.
13. Contact: display text + link fields.
14. Images: replace control for every `data-editable-image` including team photos and logo.
15. Brand colors: working swatches, live CSS variable updates, movable color panel.
16. Bullet lists inside cards: add/remove bullets in the form.
17. Content/promo/color side panels: movable and collapsible. Editor top bar and Promo Banner: push content down (not overlay, not required to move).
18. Save is explicit; exit with unsaved changes warns.
19. First promo toggle = starter content; later toggles = last saved promo content.
20. Test the full checklist at the end of this doc.

---

## 8. Test checklist (must all pass)

- [ ] Gear inline with footer credit, vertically centered, desktop only  
- [ ] Promo Banner when on pushes page down; does not cover nav  
- [ ] Promo Section sits under Hero  
- [ ] First promo toggle shows realistic starter content (not blank)  
- [ ] After save, toggle off/on restores user content  
- [ ] Service / pain-point / FAQ / testimonial forms use stable labels ("Pain point 1")  
- [ ] Testimonial Source field editable when present  
- [ ] Team photos replaceable  
- [ ] Logo replaceable  
- [ ] Nav: can change text AND destination; scroll targets selectable from real sections  
- [ ] Contact: can change display text AND href  
- [ ] Blue outlines only on in-place fields; yellow outlines on side-panel groups; selected panel item highlights its card  
- [ ] Bullet add/remove works inside card forms  
- [ ] Brand color swatches change the site; panel is movable  
- [ ] Content panel, promo panel, color panel all movable/collapsible  
- [ ] Editor top bar and Promo Banner push page content down; neither covers nav  
- [ ] Exit with unsaved changes prompts; does not silent-save  
- [ ] Refresh restores last explicit save from localStorage  

---

## 9. Later backend migration

- Change script `src` only  
- Replace localStorage with API  
- Keep all data attributes identical  
- No re-tagging of existing client sites  

---

**End of guide.**  
Implement every rule. Do not leave images, brand colors, nav destinations, promo placement, or panel mobility half-done.
