# Website Edit Admin Portal – Replit Implementation Guide (Path A)

**Purpose of this document**  
Drop this file into a Replit project that already contains a client website.  
The Replit Agent should follow these instructions to:

1. Add the correct script tag and data attributes
2. Implement a working **Path A** (localStorage) version of the editor
3. Make the site fully testable today without a backend

This Path A version is designed so that when we later switch to the real Cloudflare backend, **no existing data attributes need to change**.

---

## Important Principles

- All content keys and data attributes used here are permanent.
- Path A (localStorage) is only a temporary storage layer.
- Later we will replace the storage layer with the real API. The HTML tags stay exactly the same.
- Do not invent new attribute names or key patterns.

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
- For Path A the script will live inside the same Replit project (`/admin-portal.js`).
- Later we will change the `src` to your hosted version (e.g. `https://kit.yourdomain.com/admin-portal.js`).

---

## 2. Data Attribute Rules

### Text / Headings
```html
<h1 data-editable data-key="home.hero-title">Original Title Here</h1>
<p data-editable data-key="home.hero-subtitle">Original subtitle text</p>
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
Wrap the whole team section:
```html
<div data-editable-list="team" data-key="team.members">
  <!-- individual team member cards go here -->
</div>
```

Each team member card should have clear internal structure that the script can read (name, title, bio, photo). The exact internal markup can stay as-is; the script will learn the pattern from the first card.

### Services List
```html
<div data-editable-list="services" data-key="services.items">
  <!-- service cards -->
</div>
```

### Contact / Hours / Social
Use clear keys:
```html
<a data-editable data-key="contact.phone" href="tel:...">...</a>
<span data-editable data-key="contact.email">...</span>
<span data-editable data-key="contact.hours">...</span>
<a data-editable data-key="social.instagram" href="...">...</a>
```

### Brand Colors
Use CSS variables in `:root`:
```css
:root {
  --brand-primary: #1a73e8;
  --brand-secondary: #34a853;
  --brand-accent: #fbbc04;
  /* add more as needed */
}
```

### Promo Banner
```html
<div data-promo-banner data-key="promo.banner" style="display:none;">
  <!-- banner content -->
</div>
```

### Promo Section
```html
<section data-promo-section data-key="promo.section" style="display:none;">
  <!-- Will support two layouts: Cards or Hero -->
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

### Gear icon
- Inject a small, discreet gear icon in the footer (or fixed bottom-right)
- Only show on desktop (hide on mobile/tablet)

### Login (Path A simplified)
- For Path A we use a simple Developer PIN + temporary client password mock
- Later this will be replaced by real email/password + Developer PIN against the backend

### Editing
- Hover → soft outline on editable elements
- Click → make contenteditable or show appropriate editor (text, image replace, list manager, color swatches)
- Support the two Promo Section layouts: Cards and Hero

### Save
- Write current state back to localStorage
- Show confirmation: “Saved (local preview mode)”
- In the real version this will become “This will go live for everyone”

### Preview toggle
- Hide all editing chrome while keeping a small “Exit Preview” control

### Restore to Original
- Store the very first content state as the original snapshot
- Show “Restore to original version” for the first 14 days (can be simulated with a timestamp in localStorage)

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
4. Identify the main editable regions (hero text, about text, team section, services section, contact info, logo, social links, etc.) and add the correct `data-editable`, `data-key`, `data-editable-list`, and `data-editable-image` attributes.
5. Create `admin-portal.js` that implements the Path A behavior described above.
6. Create `admin-portal.css` for the gear icon, outlines, toolbar, and modals.
7. Make sure the original HTML content remains intact as the fallback.
8. Test that:
   - Gear appears on desktop
   - Clicking gear enters edit mode
   - Text can be edited and saved to localStorage
   - Refreshing the page restores the saved content
   - “Restore to original” works

---

## 6. Later Migration to Real Backend (no breakage)

When we move to Cloudflare Workers + D1 + R2:

- Change only the `src` of the script tag to the hosted version
- Replace the localStorage read/write functions inside the script with real API calls
- All existing `data-key` and `data-editable*` attributes stay exactly the same
- Existing client sites continue to work without re-tagging

---

## 7. Script Hosting (for the real version later)

To keep the script less casually copyable:

- Host it on your own domain or Cloudflare (e.g. `https://kit.yourdomain.com/admin-portal.js`)
- Serve it minified
- Optionally add light obfuscation
- The real protection is the backend entitlement check + authentication, not hiding the file

The script will always be visible in the browser Network tab. That is normal and unavoidable for any client-side editor.

---

**End of guide.**  
This document is ready to be dropped into a Replit project. The agent should follow the steps in section 5 in order.
