# Website Edit Admin Portal – Replit Implementation Guide (Path A)

**Purpose**  
Drop this into a Replit project that already has a client website.  
Follow every rule below. Do not improvise around them.

Path A = localStorage so the site is testable today.  
Later: swap storage/auth for Cloudflare. **Data attributes stay the same.**

---

## Non-negotiable principles

1. **Do not break the existing site.** Script only adds behavior. Original HTML is the permanent fallback.
2. **Never cover the navigation.**  
   - Editor top bar pushes the page down.  
   - Promo Banner pushes the page down.  
   - When both are visible: **Editor top bar is always the absolute top**, Promo Banner is directly under it, then the site. Both push content; neither overlays the sticky nav.
3. **Structured cards are never contenteditable on the page.** Edit only via side-panel forms.
4. **Blue vs yellow outlines (required visual language)**
   - **Blue** dashed = in-place editable (type on the page). Hover = bolder outline + light blue tint.
   - **Yellow** outline = side-panel group. Click opens the content panel for that group.
   - Selecting an item in the panel highlights that specific card on the page (stronger yellow).
   - FAQ cards, service cards, pain-point cards, testimonials = **yellow only**, never blue.
   - Outline colors must stay visible on light and dark backgrounds.
5. **Promo Section always sits directly under the Hero.**
6. **First promo toggle-on = branded starter content. After save = user’s version.**
7. **Brand colors, images, logos must actually work.**
8. **Add / remove cards and bullets must update the live page**, not only the panel UI.
9. **Exit discards unsaved changes (with warning). Save is explicit.**
10. Only floating side panels are movable. Editor top bar and Promo Banner push content; they do not move.
11. Completely unbranded editor chrome.
12. **Do not make the “Website design by [Company]” credit editable.**

---

## 1. Script tag

Every page, before `</body>`:

```html
<script src="/admin-portal.js" data-site-id="site_preview_001" defer></script>
```

Unique alphanumeric Site ID per client.

---

## 2. Standard section order

1. Sticky Header  
2. Hero  
3. **Temporary Promo** ← always under Hero when present  
4. Problem / Agitate  
5. Solution / Offer  
6. Social Proof  
7. About  
8. FAQ  
9. Final CTA  
10. Footer  

Promo Section = first sibling after Hero. Move it if it’s elsewhere.

---

## 3. Data attributes

### In-place text (blue outlines only)
Headings, paragraphs, simple labels, quote text, quote attribution, any plain text not inside a structured card.

```html
<h1 data-editable data-key="home.hero-title">...</h1>
<p data-editable data-key="about.quote">...</p>
<p data-editable data-key="about.quote-attribution">...</p>
```

### Images + logos (must work)
```html
<img data-editable-image data-key="logo" src="..." alt="Logo">
```

**Logo sync rule:** Nav logo and footer logo that represent the same brand asset must share the **same `data-key`** (e.g. `logo`). Replacing one updates both.

**Logo + business name:**  
If the logo is an image next to business name text, tag **both**:
- Image: `data-editable-image data-key="logo"`
- Name text: `data-editable data-key="brand.name"` (in-place)  
Do this in **both** nav and footer.

### Structured lists (yellow outlines, side-panel only)
```html
<div data-editable-list="team" data-key="team.members">...</div>
<div data-editable-list="services" data-key="services.items">...</div>
<div data-editable-list="testimonials" data-key="testimonials.items">...</div>
<div data-editable-list="faqs" data-key="faqs.items">...</div>
<div data-editable-list="agitate" data-key="agitate.items">...</div>
```

**Required list operations (must update the live DOM):**
- Add card
- Remove card
- Reorder cards (drag forms)
- Add / remove bullet points inside a card  
If the panel UI changes but the page does not, it is broken.

### Contact + social (side panel: display text + link)
```html
<a data-editable-contact data-key="contact.phone" href="tel:...">...</a>
<a data-editable-contact data-key="contact.email" href="mailto:...">...</a>
<a data-editable-contact data-key="social.instagram" href="...">...</a>
```

Footer contact, social links, and email must be editable this way.

### Navigation (side panel)
Every nav item including the **CTA button**:

```html
<nav data-editable-nav data-key="nav.items">
  <a href="#services">Services</a>
  <a href="#about">About</a>
  <a class="btn" href="#contact">Book Now</a>  <!-- CTA = still a nav item -->
</nav>
```

Panel fields per item:
- Label in panel: “Nav link 1”, “Nav link 2”, … and **“Nav button”** for the CTA-style item
- Display text
- Destination type: Scroll to section / Internal page / External URL
- Destination value  
For scroll: **dropdown of real section ids** on the page (readable contrast, not gray-on-gray).

Footer nav-style links: same pattern (`data-editable-nav` or contact-style as appropriate).

### Brand colors
```css
:root {
  --brand-primary: #...;
  --brand-secondary: #...;
  --brand-accent: #...;
}
```
Max 12. Swatches update CSS variables live. Color panel movable.

### Promo Banner
Must **push page down**, never cover nav.  
Closing/dismissing must **remove the space** (no leftover white gap).  
If a close (X) control exists, it toggles the banner off cleanly and collapses height to 0.

### Promo Section
Under Hero. Hidden by default.  
First toggle-on → starter content. After save → restore user content on toggle.

---

## 4. Fail-safe: no missing text

After tagging known regions, run a **coverage pass**:

1. Find visible text nodes in `main` / content areas / footer (exclude script, style, the “Website design by” credit).
2. If a text node is not already inside a `data-editable`, `data-editable-list`, `data-editable-contact`, or `data-editable-nav` region, tag it as `data-editable` with a generated stable key.
3. Quote + attribution, small labels, eyebrow text, footer business name, etc. must not be left untagged.
4. Prefer yellow group editing when text is clearly part of a repeating card; otherwise blue in-place.

Goal: **every piece of customer-facing text is editable either in-place or in a panel.**

---

## 5. Path A editor behavior

### On load
- Read `data-site-id`
- Load `localStorage` `admin-portal-content-{siteId}`
- Apply content + brand color overrides
- No save yet → original HTML is the snapshot

### Gear
- Inline with “Website design by [Company]” credit, after the name
- Vertically centered, muted, hover spin, tooltip “Admin editor”
- Desktop only
- Credit itself is **not** editable

### Login
- Email/password mock or Developer PIN (`123456` ok for Path A)

### Stacking when edit mode is on
```
[ Editor top bar ]     ← always absolute top, pushes content
[ Promo Banner ]       ← if toggled on, directly under editor bar, pushes content
[ Rest of website ]
```

### Side panel rules
- Movable + collapsible
- Stable labels: “Service 1”, “Pain point 2”, “Nav link 3”, “Nav button”
- Not live titles as labels
- Add/remove/reorder **must mutate the live DOM** and persist to localStorage on Save
- Bullets: each bullet a field; +/− must add/remove real DOM nodes in the card
- Testimonials: include Source when the card has it
- Dropdowns/selects: high-contrast text (not low-contrast gray on gray)

### Images
- Every `data-editable-image` opens file picker and replaces src
- Team photos, nav logo, footer logo all work
- Shared `data-key="logo"` keeps nav + footer logos in sync

### Save / Exit (required)
| Action | Behavior |
|--------|----------|
| **Save** | Explicit. Path A message: “Saved (local preview mode)”. Later real: “This will go live for everyone” with confirm. |
| **Exit** with unsaved changes | Confirm: “You have unsaved changes. Discard or Stay?” **Discard = lose changes** (reload last saved / original). Do **not** silent-save on exit. |
| **Exit** with no unsaved changes | Just leave edit mode |

### Preview
Hides chrome; small “Back to Edit” remains.

---

## 6. Editor UI visual spec

| Element | Spec |
|--------|------|
| Gear | Inline with footer credit, vertically centered |
| In-place | **Blue** dashed outline; hover = bolder + light blue tint |
| Side-panel group | **Yellow** outline on the group; selected item = stronger yellow on that card |
| FAQ / services / etc. | Yellow only — never blue in-place |
| Editor top bar | Pushes page down; always above Promo Banner |
| Promo Banner | Pushes page down; close must collapse space (no white gap) |
| Side panels | Movable + collapsible |
| Selects/dropdowns | Readable contrast |

---

## 7. Files

```
/
├── index.html (+ other pages)
├── admin-portal.js
├── admin-portal.css
└── (existing site)
```

---

## 8. Agent checklist (do in order)

1. Read this entire document.
2. Do not destroy existing layout.
3. Script tag + site id on every page.
4. Tag all regions; run **fail-safe text coverage pass**.
5. Brand CSS variables in `:root`.
6. Promo Section under Hero (move if wrong); starter content on first enable.
7. Promo Banner pushes content; close collapses space.
8. Editor top bar pushes content; stacks above Promo Banner.
9. Gear inline with credit; credit not editable.
10. Blue in-place only for true in-place fields.
11. Yellow + side panel for all structured lists; **add/remove/reorder and bullets update live DOM**.
12. Nav includes CTA button as “Nav button”; destinations + scroll dropdown with readable contrast.
13. Contact + social + footer email editable (text + href).
14. Logo image + brand name text editable in nav **and** footer; shared logo key.
15. Team photos replaceable.
16. Quote + attribution and other stray text covered by fail-safe.
17. FAQ = yellow group, not blue in-place.
18. Save explicit; Exit discards unsaved (with confirm), does not silent-save.
19. Run test checklist below.

---

## 9. Test checklist (all must pass)

- [ ] Editor top bar pushes page; sits above Promo Banner when both on  
- [ ] Promo Banner pushes page; X/close leaves **no white gap**  
- [ ] Promo Section under Hero; first on = starter; after save = user content  
- [ ] Blue = in-place only; yellow = panel groups; FAQ is yellow  
- [ ] Selecting item in panel highlights that card  
- [ ] Nav links + **Nav button (CTA)** editable (text + destination)  
- [ ] Scroll targets dropdown readable and lists real sections  
- [ ] Add/remove **service cards** updates the page  
- [ ] Add/remove **pain-point cards** updates the page  
- [ ] Add/remove **testimonials** updates the page  
- [ ] Add/remove **bullets** inside a card updates the page  
- [ ] Team photos replaceable  
- [ ] Nav logo + footer logo replaceable and stay in sync  
- [ ] Brand name text next to logo editable (nav and footer)  
- [ ] Quote attribution editable  
- [ ] Footer social + email editable  
- [ ] “Website design by…” credit NOT editable  
- [ ] Save is explicit; Exit with unsaved changes warns and discards if confirmed  
- [ ] Exit does not silent-save  

---

## 10. Later backend

Change script `src` only. Replace localStorage with API. Keep attributes identical.

---

**End of guide.**  
Add/remove cards and bullets must change the live page. Exit must discard. No silent save. No missing text. No blue outlines on FAQ/service cards.
