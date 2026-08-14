# Website Edit Admin Portal – Replit Implementation Guide (Path A)

**Purpose of this document**  
Drop this file into a Replit project that already contains a client website.  
The Replit Agent should follow these instructions to:

1. Add the correct script tag and data attributes
2. Implement a working **Path A** (localStorage) version of the editor
3. Make the site fully testable today without a backend
4. Include brand color editing, promo banner/section, structured side-panel forms, and Developer PIN access

This Path A version is designed so that when we later switch to the real Cloudflare backend, **no existing data attributes need to change**.

---

## Important Principles

- All content keys and data attributes used here are permanent.
- Path A (localStorage) is only a temporary storage layer.
- Later we will replace the storage layer with the real API. The HTML tags stay exactly the same.
- Do not invent new attribute names or key patterns.
- **Do not break the existing site.** The script only adds behavior. Original HTML content stays as the fallback.
- The editor is completely unbranded. No studio name in the editor UI.

---

## 1. Add the Script Tag

In every HTML page (or in the main layout), add this script tag just before `</body>`:

```html
<script 
  src="/admin-portal.js" 
  data-site-id="site_preview_001"
  defer>
</script>
```

Notes:
- Replace `site_preview_001` with a unique Site ID for this client (alphanumeric, e.g. `site_7f3a9c2e`).
- For Path A the script lives inside the same Replit project (`/admin-portal.js`).
- Later change the `src` to the hosted version (e.g. `https://kit.yourdomain.com/admin-portal.js`).

---

## 2. Data Attribute Rules

### Text / Headings / Button labels
```html
<h1 data-editable data-key="home.hero-title">Original Title Here</h1>
<p data-editable data-key="home.hero-subtitle">Original subtitle text</p>
<button data-editable data-key="home.cta-label">Get Started</button>
```

### Images
```html
<img 
  data-editable-image 
  data-key="logo" 
  src="/assets/logo.png" 
  alt="Logo">
```

### Team Members (list)
```html
<div data-editable-list="team" data-key="team.members">
  <!-- individual team member cards go here -->
</div>
```

Each team member card should keep its existing internal structure (photo, name, title, bio). The script must learn fields from the existing card structure and edit via side-panel forms — never contenteditable on the whole card.

### Services List
```html
<div data-editable-list="services" data-key="services.items">
  <!-- service cards -->
</div>
```

Same rule: side-panel form editing, not contenteditable on the card.

### Testimonials / FAQs / Agitate cards
```html
<div data-editable-list="testimonials" data-key="testimonials.items">...</div>
<div data-editable-list="faqs" data-key="faqs.items">...</div>
<div data-editable-list="agitate" data-key="agitate.items">...</div>
```

Same side-panel form approach. Auto-generate form fields from the existing card structure.

### Contact / Hours / Social (text + link pairs)
Contact items often have display text AND an href (`tel:`, `mailto:`, or URL). Edit these via side-panel forms with two fields:
- Display text
- Link/URL

```html
<a data-editable-contact data-key="contact.phone" href="tel:...">...</a>
<a data-editable-contact data-key="contact.email" href="mailto:...">...</a>
<span data-editable data-key="contact.hours">Mon–Fri 9–5</span>
<a data-editable-contact data-key="social.instagram" href="...">...</a>
```

### Navigation links
Nav items have display text + destination. Edit via side-panel forms:
- Display text
- Destination type: Scroll to section / Internal page / External URL
- Destination value

```html
<nav data-editable-nav data-key="nav.items">
  <a href="#services">Services</a>
  <a href="#about">About</a>
  <a href="/contact">Contact</a>
</nav>
```

### Brand Colors (REQUIRED — must work)
Use CSS variables in `:root`. The editor MUST let the user edit these.

```css
:root {
  --brand-primary: #1a73e8;
  --brand-secondary: #34a853;
  --brand-accent: #fbbc04;
  /* add more as needed, max 12 */
}
```

Brand color editor behavior:
- On first open, auto-extract hex values used on the site (from CSS variables and computed styles where practical)
- Show as Canva-style swatches
- Hard cap of 12 brand colors
- Empty slots available if fewer than 12 found
- Changing a brand color updates every element using that CSS variable
- Individual elements can be reassigned to a different brand color
- No free-form color picker outside the brand palette for most controls
- Soft guidance only

### Promo Banner
```html
<div data-promo-banner data-key="promo.banner" style="display:none;">
  <!-- banner content -->
</div>
```

### Promo Section
```html
<section data-promo-section data-key="promo.section" style="display:none;">
  <!-- Supports two layouts: Cards or Hero -->
</section>
```

---

## 3. Path A Editor Behavior (localStorage)

The `admin-portal.js` file must implement the following for Path A:

### On page load
1. Read `data-site-id`
2. Load any saved content from `localStorage` under the key `admin-portal-content-{siteId}`
3. Apply saved values to all elements that have matching `data-key`
4. If no saved content exists, leave the original HTML content in place (this becomes the “original snapshot”)
5. Apply any saved brand color CSS variable overrides

### Gear icon (exact placement — required)
- Place **inline with the “Website design by [Company]” credit in the footer**, immediately after the company name
- Vertically centered with the credit text (not dropped below the baseline)
- Small, low opacity, muted/gray color that fits the footer
- On hover: slight spin + color shift
- Hover tooltip: “Admin editor”
- Only show on desktop (completely hide on mobile/tablet)
- Example visual: `Website design by Your Company ⚙️`
- Do NOT place it fixed bottom-right or anywhere else

### Login (Path A simplified)
- Email + password mock OR Developer PIN
- Developer PIN path: gear → “Developer access” → masked PIN field → enter pin → edit mode
- For Path A, accept a simple mock PIN stored in localStorage or hardcoded for testing (e.g. `123456`)
- Later this is replaced by real auth against the backend

### Two editing modes (required distinction)

1. **In-place editing** (click directly on the page)
   - Headings
   - Paragraphs
   - Simple button labels
   - Simple link text
   - Plain contact text with no href complexity

2. **Side-panel form editing** (required for structured content)
   - Team members
   - Services
   - Testimonials
   - FAQs
   - Agitate / pain-point cards
   - Promo featured cards
   - Contact items with display text + link (`tel:`, `mailto:`, URL)
   - Navigation links (display text + destination)

### Side panel rules (required)
- Movable (drag by header)
- Collapsible / minimizable
- Must NOT permanently cover the navigation
- Lists each item as a collapsible accordion form
- Form fields mirror the existing card structure on the site
- Placeholder/helper text in every field
- Soft character guidance based on existing content lengths
- Drag forms to reorder cards on the page
- Add / remove with + and –
- Visual cards re-render from form data (never contenteditable on the card itself)

### Brand color editing (REQUIRED — must work in this pass)
- Add a Colors control in the editor toolbar
- Auto-extract hex values from CSS variables and prominent site colors
- Show Canva-style swatches
- Cap at 12 total brand colors
- Changing a swatch updates the corresponding CSS variable across the page
- Allow assigning a specific element to a different brand color
- Do not allow free-form color picking outside the brand palette for most controls

### Promo Section behavior (required)
- Toggle section on/off
- Layout switcher: **Cards** or **Hero** (only one active)
- **Cards layout:**
  - Independent list of featured items (not pulled from main Services)
  - Soft maximum of 3 cards (strong recommendation in UI; allow more if user insists)
  - Each card edited via side-panel forms: image, title, description, CTA label, CTA link
  - Add / remove / reorder via side panel
- **Hero layout:**
  - Background image upload/replace
  - Headline, supporting text, one CTA label + CTA link
- Banner click can scroll to the promo section or open a URL

### Navigation links
Edit via side-panel forms:
- Display text
- Destination type: Scroll to section / Internal page / External URL
- Destination value

### Contact information
Edit via side-panel forms when the item has both text and link:
- Display text
- Link/URL (`tel:`, `mailto:`, or URL)

### Save
- Write current state back to localStorage
- Show confirmation: “Saved (local preview mode)”
- In the real version this becomes “This will go live for everyone”

### Preview toggle
- Hide all editing chrome while keeping a small “Exit Preview” control

### Restore to Original
- Store the very first content state as the original snapshot
- Show “Restore to original version” for the first 14 days

### Character guidance
- Soft recommendations based on existing content lengths
- Helper/placeholder text in form fields
- Warning when content is significantly longer than existing items
- No hard character locks in most cases

---

## 4. Editor UI Visual Spec (REQUIRED — consistent on every site)

The editor chrome is a **fixed design system**. It does NOT try to match each client’s brand colors. This keeps it visible on every site.

### Gear icon (exact)
- Place **inline with the “Website design by [Company]” credit in the footer**, immediately after the company name
- Vertically centered with the credit text
- Small, low opacity, muted/gray color
- On hover: slight spin + color shift
- Tooltip: “Admin editor”
- Desktop only
- Example: `Website design by Your Company ⚙️`
- Do NOT place fixed bottom-right

### Hover highlights
- Soft semi-transparent outline + very light tint
- Must be visible on both light and dark sections
- Do not use pure black or pure white outlines

### Floating toolbar
- Dark neutral (near-black, slight transparency)
- White icons/text
- Always readable on any background
- Contains: Preview, Save, Colors, Account/Billing (mock), Logout

### Side panel
- Same dark neutral treatment
- **Movable** (drag by header)
- **Collapsible / minimizable**
- Must never permanently cover the navigation
- Accordion forms for structured lists

### Structured content rule (required)
- Team, Services, Testimonials, FAQs, Agitate cards, Promo cards → **side-panel forms only**
- Do NOT make whole cards contenteditable
- Forms mirror existing card fields
- Drag forms to reorder
- Soft max of 3 cards in Promo Cards layout (recommend 3, allow more)

### Contact + Nav rule (required)
- Contact items with `tel:`, `mailto:`, or URL → side-panel form with Display text + Link
- Nav links → side-panel form with Display text + Destination type + Destination value

---

## 4. File Structure to Create in Replit

```
/
├── index.html (and other pages)
├── admin-portal.js          ← main editor script (Path A)
├── admin-portal.css         ← editor UI styles
└── (existing site files)
```

---

## 5. What the Replit Agent Should Do (in order)

1. Read this entire document.
2. Scan all HTML files in the project.
3. Add the script tag with a unique `data-site-id` to every page.
4. Identify editable regions and add correct data attributes:
   - Hero text, about text, headings, paragraphs, button labels
   - Logo and key images
   - Team section
   - Services section
   - Testimonials, FAQs, agitate cards (if present)
   - Contact info (phone, email, hours, address)
   - Social links
   - Navigation links
   - Promo banner + promo section (if present; add markup if missing)
5. Ensure brand color CSS variables exist in `:root`. If missing, create them from prominent colors used in the site.
6. Place the gear icon **inline with the “Website design by [Company]” footer credit**, vertically centered.
7. Create `admin-portal.js` implementing Path A behavior above.
8. Create `admin-portal.css` for gear, outlines, toolbar, side panel, modals.
9. Implement brand color swatch editor (REQUIRED).
10. Implement side-panel form editing for structured cards.
11. Implement movable + collapsible side panel.
12. Keep original HTML content intact as fallback.
13. Test:
    - Gear appears in footer, vertically centered, desktop only
    - Click gear → login / Developer PIN mock works
    - Text editable in place
    - Team/services/testimonials/FAQs editable via side panel forms
    - Images replaceable
    - Brand colors editable via swatches and update the page
    - Promo banner + promo section work with Cards/Hero layouts
    - Nav links editable (text + destination)
    - Contact info editable (text + link)
    - Panel does not permanently cover nav (movable/collapsible)
    - Save to localStorage + refresh restores content
    - Restore to original works

---

## 6. Editor UI Visual Spec (required)

Fixed design system — same on every site. Do NOT try to match each client’s brand colors for the chrome.

- **Gear**: inline with footer credit, vertically centered, small, low opacity, muted; hover spin + color shift; tooltip “Admin editor”
- **Hover highlights**: soft semi-transparent outline + light tint (visible on light and dark sections)
- **Toolbar**: dark neutral near-black with white icons/text
- **Side panel**: dark neutral, movable by header, collapsible/minimizable
- **Modals**: dark neutral, clear confirmations

---

## 7. Later Migration to Real Backend (no breakage)

When moving to Cloudflare Workers + D1 + R2:
- Change only the script `src` to the hosted version
- Replace localStorage read/write with real API calls
- Keep all existing `data-key` and `data-editable*` attributes exactly the same
- Existing client sites continue to work without re-tagging

---

## 8. Script Hosting (real version later)

- Host on your own domain or Cloudflare
- Serve minified
- Real protection is backend entitlement + auth, not hiding the file

---

**End of guide.**  
Drop this into the Replit project and instruct the agent to follow section 5 in order.  
Priority fixes for the next pass: brand color editing, side-panel forms for cards, contact/nav text+link editing, movable panel, gear vertical alignment, promo Cards/Hero layouts.
