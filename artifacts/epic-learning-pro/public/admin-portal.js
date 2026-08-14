/**
 * Epic Learning Pro — Admin Portal (Path A · localStorage)
 *
 * All data-key values and data-editable* attributes are permanent.
 * Only the storage layer (localStorage) is temporary — it will be
 * replaced with real API calls when the Cloudflare backend is ready.
 * Nothing in the site HTML needs to change at that point.
 *
 * Path A PIN: 8421  (share only with authorised users)
 */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────── */
  var script = document.currentScript
    || document.querySelector('script[data-site-id]');
  var SITE_ID     = script ? script.getAttribute('data-site-id') : 'site_unknown';
  var STORAGE_KEY = 'ap-content-'      + SITE_ID;
  var ORIG_KEY    = 'ap-original-'     + SITE_ID;
  var ORIG_DATE   = 'ap-orig-date-'    + SITE_ID;
  var PIN         = '8421';            // Path A — replace with real auth later
  var REACT_DELAY = 350;              // ms to wait for React first paint

  /* ── State ──────────────────────────────────────────────────────── */
  var editMode    = false;
  var previewMode = false;
  var activeEl    = null;

  /* ── Helpers ────────────────────────────────────────────────────── */
  function isDesktop() { return window.innerWidth >= 1024; }

  function editables() {
    return Array.from(document.querySelectorAll('[data-editable][data-key]'));
  }

  function toast(msg) {
    var existing = document.getElementById('ap-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'ap-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { t.classList.add('ap-toast-visible'); });
    });
    setTimeout(function () {
      t.classList.remove('ap-toast-visible');
      setTimeout(function () { if (t.parentNode) t.remove(); }, 400);
    }, 3000);
  }

  /* ── Storage ────────────────────────────────────────────────────── */
  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (e) { return null; }
  }

  function snapshot() {
    var out = {};
    editables().forEach(function (el) {
      out[el.getAttribute('data-key')] = el.innerHTML;
    });
    return out;
  }

  function applySnap(snap) {
    if (!snap) return;
    Object.keys(snap).forEach(function (key) {
      var el = document.querySelector('[data-key="' + key + '"][data-editable]');
      if (el) el.innerHTML = snap[key];
    });
  }

  function saveContent() {
    var snap = snapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  }

  /* ── Init ───────────────────────────────────────────────────────── */
  function init() {
    /* Inject stylesheet */
    if (!document.getElementById('ap-css')) {
      var link = document.createElement('link');
      link.id  = 'ap-css';
      link.rel = 'stylesheet';
      link.href = '/admin-portal.css';
      document.head.appendChild(link);
    }

    /* Apply saved content */
    var saved = readJSON(STORAGE_KEY);
    if (saved) applySnap(saved);

    /* Capture original snapshot (once, then never overwrite) */
    if (!localStorage.getItem(ORIG_DATE)) {
      localStorage.setItem(ORIG_KEY, JSON.stringify(snapshot()));
      localStorage.setItem(ORIG_DATE, String(Date.now()));
    }

    /* Inject gear icon — desktop only */
    if (isDesktop()) injectGear();
  }

  /* ── Gear ───────────────────────────────────────────────────────── */
  function injectGear() {
    if (document.getElementById('ap-gear')) return;
    var btn = document.createElement('button');
    btn.id    = 'ap-gear';
    btn.title = 'Admin Editor';
    btn.setAttribute('aria-label', 'Open admin editor');
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25' +
      'a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 ' +
      '2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 ' +
      '0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a' +
      '2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 ' +
      '1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a' +
      '2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74' +
      'l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2' +
      ' 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>' +
      '<circle cx="12" cy="12" r="3"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener('click', function () {
      if (!editMode) showLogin();
    });
  }

  /* ── Login modal ────────────────────────────────────────────────── */
  function showLogin() {
    var overlay = document.createElement('div');
    overlay.id = 'ap-login-overlay';
    overlay.innerHTML =
      '<div id="ap-login-modal">' +
        '<div id="ap-login-logo">⚙ Admin Editor</div>' +
        '<p id="ap-login-sub">Epic Learning Pro · Local Preview Mode</p>' +
        '<div id="ap-login-error" style="display:none">Incorrect PIN — please try again.</div>' +
        '<label for="ap-pin-input">Developer PIN</label>' +
        '<input type="password" id="ap-pin-input" placeholder="Enter PIN" ' +
          'autocomplete="off" maxlength="12" />' +
        '<button id="ap-login-btn">Enter Edit Mode</button>' +
        '<button id="ap-login-cancel">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var input  = overlay.querySelector('#ap-pin-input');
    var errBox = overlay.querySelector('#ap-login-error');
    input.focus();

    function attempt() {
      if (input.value === PIN) {
        overlay.remove();
        enterEditMode();
      } else {
        errBox.style.display = 'block';
        input.value = '';
        input.focus();
      }
    }

    overlay.querySelector('#ap-login-btn').addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  attempt();
      if (e.key === 'Escape') overlay.remove();
    });
    overlay.querySelector('#ap-login-cancel').addEventListener('click', function () {
      overlay.remove();
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  /* ── Edit mode ──────────────────────────────────────────────────── */
  function enterEditMode() {
    editMode = true;
    document.body.classList.add('ap-edit-mode');
    editables().forEach(function (el) {
      el.addEventListener('click', handleClick, true);
    });
    showToolbar();
    toast('Edit mode active — click any highlighted text to edit.');
  }

  function exitEditMode() {
    editMode    = false;
    previewMode = false;
    commitActive();
    document.body.classList.remove('ap-edit-mode', 'ap-preview-mode');
    editables().forEach(function (el) {
      el.contentEditable = 'false';
      el.removeEventListener('click', handleClick, true);
    });
    ['ap-toolbar', 'ap-preview-bar', 'ap-toast'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    activeEl = null;
  }

  function commitActive() {
    if (activeEl) {
      activeEl.contentEditable = 'false';
      activeEl.classList.remove('ap-editing');
      activeEl = null;
    }
  }

  function handleClick(e) {
    if (previewMode) return;
    e.stopPropagation();
    var el = e.currentTarget;

    if (activeEl && activeEl !== el) commitActive();

    activeEl = el;
    el.contentEditable = 'true';
    el.classList.add('ap-editing');
    el.focus();

    /* Place cursor at click position */
    if (document.caretRangeFromPoint) {
      var range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  /* ── Toolbar ────────────────────────────────────────────────────── */
  function showToolbar() {
    if (document.getElementById('ap-toolbar')) return;

    var origDate = localStorage.getItem(ORIG_DATE);
    var ageDays  = origDate
      ? (Date.now() - parseInt(origDate, 10)) / 86400000
      : 0;
    var canRestore = ageDays < 14;

    var tb = document.createElement('div');
    tb.id = 'ap-toolbar';
    tb.innerHTML =
      '<div id="ap-toolbar-inner">' +
        '<span id="ap-toolbar-label">⚙ Admin Editor ' +
          '<span id="ap-toolbar-mode">· Editing</span></span>' +
        '<div id="ap-toolbar-actions">' +
          (canRestore
            ? '<button id="ap-btn-restore" class="ap-btn-danger">' +
                '↩ Restore Original</button>'
            : '') +
          '<button id="ap-btn-preview">👁 Preview</button>' +
          '<button id="ap-btn-save" class="ap-btn-primary">💾 Save</button>' +
          '<button id="ap-btn-exit">✕ Exit</button>' +
        '</div>' +
      '</div>';
    document.body.prepend(tb);

    document.getElementById('ap-btn-save').addEventListener('click', function () {
      commitActive();
      saveContent();
      toast('Saved (local preview mode)');
    });

    document.getElementById('ap-btn-preview').addEventListener('click', enterPreview);
    document.getElementById('ap-btn-exit').addEventListener('click', exitEditMode);

    var restoreBtn = document.getElementById('ap-btn-restore');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', function () {
        if (!confirm('Restore to the original version?\nAll saved edits will be removed.')) return;
        localStorage.removeItem(STORAGE_KEY);
        toast('Restored — reloading…');
        setTimeout(function () { location.reload(); }, 1200);
      });
    }
  }

  /* ── Preview mode ───────────────────────────────────────────────── */
  function enterPreview() {
    previewMode = true;
    commitActive();
    document.body.classList.add('ap-preview-mode');
    var tb = document.getElementById('ap-toolbar');
    if (tb) tb.style.display = 'none';

    var bar = document.createElement('div');
    bar.id = 'ap-preview-bar';
    bar.innerHTML =
      '<span>👁 Preview Mode</span>' +
      '<button id="ap-exit-preview">Exit Preview</button>';
    document.body.appendChild(bar);

    document.getElementById('ap-exit-preview').addEventListener('click', function () {
      previewMode = false;
      document.body.classList.remove('ap-preview-mode');
      bar.remove();
      var tb = document.getElementById('ap-toolbar');
      if (tb) tb.style.display = '';
    });
  }

  /* ── Boot ───────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, REACT_DELAY);
    });
  } else {
    setTimeout(init, REACT_DELAY);
  }

}());
