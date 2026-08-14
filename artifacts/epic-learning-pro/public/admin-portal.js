/**
 * Epic Learning Pro — Admin Portal (Path A · localStorage)
 *
 * All data-key values and data-editable* attributes are permanent.
 * Storage layer (localStorage) is temporary — replaced with real API later.
 * No re-tagging needed when backend is ready.
 *
 * Developer PIN: 8421
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════════════════════════ */
  var script     = document.currentScript || document.querySelector('script[data-site-id]');
  var SITE_ID    = script ? script.getAttribute('data-site-id') : 'site_unknown';
  var STORAGE_KEY = 'ap-content-'  + SITE_ID;
  var ORIG_KEY    = 'ap-original-' + SITE_ID;
  var ORIG_DATE   = 'ap-orig-date-'+ SITE_ID;
  var COLOR_KEY   = 'ap-colors-'   + SITE_ID;
  var PROMO_KEY   = 'ap-promo-'    + SITE_ID;
  var PIN         = '8421';
  var DELAY       = 380; // ms — let React paint first

  /* Derive base path from the script's own src so CSS loads in both dev & prod */
  var scriptSrc = (script && script.src) ? script.src : '';
  var BASE_PATH = scriptSrc ? scriptSrc.replace(/admin-portal\.js[^/]*$/, '') : '/';

  /* ── State ─────────────────────────────────────────────────────── */
  var S = {
    editMode:       false,
    previewMode:    false,
    panelOpen:      false,
    panelMinimized: false,
    panelSection:   'services',
    activeEl:       null,
  };

  /* ── Brand Color Definitions ───────────────────────────────────── */
  /* Maps swatch label → CSS var name → fallback hex */
  var BRAND_COLORS = [
    { label: 'Primary',    varName: '--brand-primary',    hslVar: '--primary',   hex: '#8B5FE6' },
    { label: 'Secondary',  varName: '--brand-secondary',  hslVar: '--secondary', hex: '#36A6DD' },
    { label: 'Accent',     varName: '--brand-accent',     hslVar: '--accent',    hex: '#CAA747' },
    { label: 'Hero Start', varName: '--brand-hero-start', hslVar: null,          hex: '#5B2DA8' },
    { label: 'Hero End',   varName: '--brand-hero-end',   hslVar: null,          hex: '#A472F0' },
    { label: 'Dark Tint',  varName: '--brand-tint',       hslVar: null,          hex: '#7a52d4' },
  ];

  /* ══════════════════════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════════════════════ */
  function hexToHSL(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.slice(0,2),16)/255;
    var g = parseInt(hex.slice(2,4),16)/255;
    var b = parseInt(hex.slice(4,6),16)/255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var h=0, s=0, l=(max+min)/2;
    if (max !== min) {
      var d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        case b: h=((r-g)/d+4)/6; break;
      }
    }
    return Math.round(h*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%';
  }

  function escH(str) {
    return String(str||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function trunc(str, n) {
    str = String(str||'');
    return str.length > n ? str.slice(0,n)+'…' : str;
  }

  function toast(msg) {
    var old = document.getElementById('ap-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.id = 'ap-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { t.classList.add('ap-toast-visible'); });
    });
    setTimeout(function() {
      t.classList.remove('ap-toast-visible');
      setTimeout(function() { if(t.parentNode) t.remove(); }, 400);
    }, 3000);
  }

  /* ══════════════════════════════════════════════════════════════════
     STORAGE HELPERS
  ══════════════════════════════════════════════════════════════════ */
  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)||'null'); }
    catch(e) { return null; }
  }

  /* Elements eligible for in-place editing (NOT inside a list container) */
  function simpleEditables() {
    return Array.from(document.querySelectorAll('[data-editable][data-key]')).filter(function(el) {
      return !el.closest('[data-editable-list]');
    });
  }

  function buildSnap() {
    var out = readJSON(STORAGE_KEY) || {};
    simpleEditables().forEach(function(el) {
      out[el.getAttribute('data-key')] = el.innerHTML;
    });
    document.querySelectorAll('[data-editable-list] [data-key]').forEach(function(el) {
      out[el.getAttribute('data-key')] = el.textContent;
    });
    document.querySelectorAll('[data-editable-nav] [data-key]').forEach(function(el) {
      out[el.getAttribute('data-key')] = el.textContent;
    });
    return out;
  }

  function applySnap(snap) {
    if (!snap) return;
    simpleEditables().forEach(function(el) {
      var v = snap[el.getAttribute('data-key')];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll('[data-editable-list] [data-key]').forEach(function(el) {
      var v = snap[el.getAttribute('data-key')];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll('[data-editable-nav] [data-key]').forEach(function(el) {
      var v = snap[el.getAttribute('data-key')];
      if (v !== undefined) el.textContent = v;
    });
    // Contact items stored as {text, href} objects
    document.querySelectorAll('[data-editable-contact][data-key]').forEach(function(el) {
      var v = snap[el.getAttribute('data-key')];
      if (v && typeof v === 'object') {
        if (v.text !== undefined) el.textContent = v.text;
        if (v.href !== undefined && el.tagName === 'A') el.href = v.href;
      }
    });
  }

  function applyColors(colors) {
    if (!colors) return;
    var root = document.documentElement;
    BRAND_COLORS.forEach(function(bc) {
      var hex = colors[bc.varName];
      if (!hex) return;
      root.style.setProperty(bc.varName, hex);
      if (bc.hslVar) root.style.setProperty(bc.hslVar, hexToHSL(hex));
    });
  }

  function saveAll() {
    var snap = buildSnap();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));

    /* Persist current rendered brand colors */
    var savedColors = readJSON(COLOR_KEY) || {};
    BRAND_COLORS.forEach(function(bc) {
      var v = document.documentElement.style.getPropertyValue(bc.varName).trim();
      if (v) savedColors[bc.varName] = v;
    });
    if (Object.keys(savedColors).length) {
      localStorage.setItem(COLOR_KEY, JSON.stringify(savedColors));
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════ */
  function init() {
    injectStylesheet();

    var saved = readJSON(STORAGE_KEY);
    if (saved) setTimeout(function() { applySnap(saved); }, 60);

    var savedColors = readJSON(COLOR_KEY);
    if (savedColors) applyColors(savedColors);

    if (!localStorage.getItem(ORIG_DATE)) {
      setTimeout(function() {
        localStorage.setItem(ORIG_KEY, JSON.stringify(buildSnap()));
        localStorage.setItem(ORIG_DATE, String(Date.now()));
      }, 200);
    }

    injectPromoElements();
    injectGear();
  }

  function injectStylesheet() {
    if (document.getElementById('ap-css')) return;
    var link = document.createElement('link');
    link.id  = 'ap-css';
    link.rel = 'stylesheet';
    link.href = BASE_PATH + 'admin-portal.css';
    document.head.appendChild(link);
  }

  /* ══════════════════════════════════════════════════════════════════
     GEAR (inline in footer credit, vertically centred, desktop only)
  ══════════════════════════════════════════════════════════════════ */
  function injectGear() {
    var anchor = document.getElementById('ap-gear-anchor');
    if (!anchor || document.getElementById('ap-gear')) return;
    var btn = document.createElement('button');
    btn.id = 'ap-gear';
    btn.title = 'Admin editor';
    btn.setAttribute('aria-label', 'Open admin editor');
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"'+
      ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08'+
      'a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74'+
      'l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1'+
      ' 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08'+
      'a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74'+
      'l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25'+
      'a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>'+
      '<circle cx="12" cy="12" r="3"/></svg>';
    anchor.appendChild(btn);
    btn.addEventListener('click', function() {
      if (!S.editMode) showLogin();
      else openPanel();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     LOGIN
  ══════════════════════════════════════════════════════════════════ */
  function showLogin() {
    if (document.getElementById('ap-login-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ap-login-overlay';
    ov.innerHTML =
      '<div id="ap-login-modal">'+
        '<div id="ap-login-logo">⚙ Admin Editor</div>'+
        '<p id="ap-login-sub">Local Preview Mode · '+escH(SITE_ID)+'</p>'+
        '<div id="ap-login-error" style="display:none">Incorrect PIN. Please try again.</div>'+
        '<label for="ap-pin-input">Developer PIN</label>'+
        '<input type="password" id="ap-pin-input" placeholder="Enter PIN" autocomplete="off" maxlength="12" />'+
        '<button id="ap-login-btn">Enter Edit Mode</button>'+
        '<button id="ap-login-cancel">Cancel</button>'+
      '</div>';
    document.body.appendChild(ov);
    var inp = ov.querySelector('#ap-pin-input');
    var err = ov.querySelector('#ap-login-error');
    setTimeout(function() { inp.focus(); }, 50);
    function attempt() {
      if (inp.value === PIN) { ov.remove(); enterEditMode(); }
      else { err.style.display='block'; inp.value=''; inp.focus(); }
    }
    ov.querySelector('#ap-login-btn').addEventListener('click', attempt);
    inp.addEventListener('keydown', function(e) {
      if (e.key==='Enter') attempt();
      if (e.key==='Escape') ov.remove();
    });
    ov.querySelector('#ap-login-cancel').addEventListener('click', function() { ov.remove(); });
    ov.addEventListener('click', function(e) { if(e.target===ov) ov.remove(); });
  }

  /* ══════════════════════════════════════════════════════════════════
     EDIT MODE
  ══════════════════════════════════════════════════════════════════ */
  function enterEditMode() {
    S.editMode = true;
    document.body.classList.add('ap-edit-mode');

    /* In-place editing for simple (non-list) editables */
    simpleEditables().forEach(function(el) {
      el.addEventListener('click', handleInPlace, true);
    });

    /* List containers → open side panel */
    document.querySelectorAll('[data-editable-list]').forEach(function(el) {
      el.addEventListener('click', handleListClick, true);
    });

    showToolbar();
    toast('Edit mode — click any highlighted element to edit.');
  }

  function exitEditMode() {
    S.editMode    = false;
    S.previewMode = false;
    commitActive();
    document.body.classList.remove('ap-edit-mode','ap-preview-mode');

    simpleEditables().forEach(function(el) {
      el.contentEditable='false';
      el.removeEventListener('click', handleInPlace, true);
    });
    document.querySelectorAll('[data-editable-list]').forEach(function(el) {
      el.removeEventListener('click', handleListClick, true);
    });

    ['ap-toolbar','ap-panel','ap-preview-bar','ap-toast',
     'ap-colors-modal','ap-promo-modal'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    S.activeEl    = null;
    S.panelOpen   = false;
  }

  function commitActive() {
    if (S.activeEl) {
      S.activeEl.contentEditable='false';
      S.activeEl.classList.remove('ap-editing');
      S.activeEl = null;
    }
  }

  /* In-place click handler */
  function handleInPlace(e) {
    if (S.previewMode) return;
    e.stopPropagation();
    var el = e.currentTarget;
    if (S.activeEl && S.activeEl !== el) commitActive();
    S.activeEl = el;
    el.contentEditable='true';
    el.classList.add('ap-editing');
    el.focus();
    if (document.caretRangeFromPoint) {
      var r = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (r) { var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    }
  }

  /* List click → panel */
  function handleListClick(e) {
    if (S.previewMode) return;
    e.stopPropagation();
    var listEl = e.currentTarget;
    var type   = listEl.getAttribute('data-editable-list');
    openPanel(type);
  }

  /* ══════════════════════════════════════════════════════════════════
     TOOLBAR
  ══════════════════════════════════════════════════════════════════ */
  function showToolbar() {
    if (document.getElementById('ap-toolbar')) return;
    var origDate  = localStorage.getItem(ORIG_DATE);
    var ageDays   = origDate ? (Date.now()-parseInt(origDate,10))/86400000 : 0;
    var canRestore = ageDays < 14;

    var tb = document.createElement('div');
    tb.id = 'ap-toolbar';
    tb.innerHTML =
      '<div id="ap-toolbar-inner">'+
        '<span id="ap-toolbar-label">⚙ Admin Editor '+
          '<span id="ap-toolbar-mode">· Editing</span></span>'+
        '<div id="ap-toolbar-actions">'+
          '<button id="ap-btn-content" class="ap-btn-secondary">☰ Content</button>'+
          '<button id="ap-btn-colors">🎨 Colors</button>'+
          '<button id="ap-btn-promo">✦ Promo</button>'+
          (canRestore?'<button id="ap-btn-restore" class="ap-btn-danger">↩ Restore</button>':'')+
          '<button id="ap-btn-preview">👁 Preview</button>'+
          '<button id="ap-btn-save" class="ap-btn-primary">💾 Save</button>'+
          '<button id="ap-btn-exit">✕ Exit</button>'+
        '</div>'+
      '</div>';
    document.body.prepend(tb);

    document.getElementById('ap-btn-content').addEventListener('click', function() { openPanel(); });
    document.getElementById('ap-btn-colors').addEventListener('click', openColorsModal);
    document.getElementById('ap-btn-promo').addEventListener('click', openPromoModal);
    document.getElementById('ap-btn-preview').addEventListener('click', enterPreview);
    document.getElementById('ap-btn-exit').addEventListener('click', exitEditMode);
    document.getElementById('ap-btn-save').addEventListener('click', function() {
      commitActive();
      saveAll();
      toast('Saved (local preview mode)');
    });

    var rb = document.getElementById('ap-btn-restore');
    if (rb) {
      rb.addEventListener('click', function() {
        if (!confirm('Restore to original version? All saved edits will be cleared.')) return;
        [STORAGE_KEY, COLOR_KEY, PROMO_KEY].forEach(function(k){ localStorage.removeItem(k); });
        toast('Restored — reloading…');
        setTimeout(function(){ location.reload(); }, 1200);
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     SIDE PANEL
  ══════════════════════════════════════════════════════════════════ */
  var SECTIONS = [
    { id:'services',     label:'Services'     },
    { id:'faqs',         label:'FAQs'         },
    { id:'agitate',      label:'Pain Points'  },
    { id:'testimonials', label:'Testimonials' },
    { id:'team',         label:'Team'         },
    { id:'nav',          label:'Nav Links'    },
    { id:'contact',      label:'Contact'      },
  ];

  function openPanel(sectionId) {
    if (sectionId) S.panelSection = sectionId;

    var existing = document.getElementById('ap-panel');
    if (existing) {
      if (sectionId) switchSection(sectionId);
      if (S.panelMinimized) expandPanel();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'ap-panel';
    panel.innerHTML =
      '<div id="ap-panel-header">'+
        '<span id="ap-panel-title">☰ Content Panel</span>'+
        '<div id="ap-panel-controls">'+
          '<button id="ap-panel-min" title="Minimize/Expand">–</button>'+
          '<button id="ap-panel-close" title="Close">✕</button>'+
        '</div>'+
      '</div>'+
      '<div id="ap-panel-tabs">'+
        SECTIONS.map(function(s){
          return '<button class="ap-tab'+(s.id===S.panelSection?' ap-tab-active':'')+
            '" data-sec="'+s.id+'">'+s.label+'</button>';
        }).join('')+
      '</div>'+
      '<div id="ap-panel-body"></div>';

    document.body.appendChild(panel);
    S.panelOpen = true;

    /* Tabs */
    panel.querySelectorAll('.ap-tab').forEach(function(tab) {
      tab.addEventListener('click', function() { switchSection(tab.getAttribute('data-sec')); });
    });

    /* Minimize */
    document.getElementById('ap-panel-min').addEventListener('click', function() {
      var body = document.getElementById('ap-panel-body');
      var tabs = document.getElementById('ap-panel-tabs');
      if (S.panelMinimized) {
        body.style.display=''; tabs.style.display='';
        document.getElementById('ap-panel-min').textContent='–';
        S.panelMinimized=false;
      } else {
        body.style.display='none'; tabs.style.display='none';
        document.getElementById('ap-panel-min').textContent='□';
        S.panelMinimized=true;
      }
    });

    /* Close */
    document.getElementById('ap-panel-close').addEventListener('click', function() {
      panel.remove();
      S.panelOpen=false; S.panelMinimized=false;
    });

    /* Drag */
    makeDraggable(panel, document.getElementById('ap-panel-header'));

    switchSection(S.panelSection);
  }

  function expandPanel() {
    var body=document.getElementById('ap-panel-body');
    var tabs=document.getElementById('ap-panel-tabs');
    var btn=document.getElementById('ap-panel-min');
    if(body) body.style.display='';
    if(tabs) tabs.style.display='';
    if(btn)  btn.textContent='–';
    S.panelMinimized=false;
  }

  function switchSection(id) {
    S.panelSection=id;
    var panel=document.getElementById('ap-panel');
    if (!panel) return;
    panel.querySelectorAll('.ap-tab').forEach(function(t){
      t.classList.toggle('ap-tab-active', t.getAttribute('data-sec')===id);
    });
    var body=document.getElementById('ap-panel-body');
    if (!body) return;
    switch(id) {
      case 'services':     body.innerHTML=buildServicesForms();     break;
      case 'faqs':         body.innerHTML=buildFAQForms();          break;
      case 'agitate':      body.innerHTML=buildAgitateForms();      break;
      case 'testimonials': body.innerHTML=buildTestimonialForms();  break;
      case 'team':         body.innerHTML=buildTeamForms();         break;
      case 'nav':          body.innerHTML=buildNavForms();          break;
      case 'contact':      body.innerHTML=buildContactForms();      break;
      default:             body.innerHTML='<p class="ap-empty">Section not found.</p>';
    }
    wireFormInputs(body);
  }

  /* ── Form builders ─────────────────────────────────────────────── */

  /* Generic: collect [data-key^=prefix], group by card index, build accordion */
  function buildKeyGroupForms(prefix, cardLabel) {
    var all = Array.from(document.querySelectorAll('[data-key^="'+prefix+'"]'));
    var indices = {};
    all.forEach(function(el) {
      var rest = el.getAttribute('data-key').slice(prefix.length);
      var idx  = parseInt(rest.split('-')[0], 10);
      if (!isNaN(idx)) indices[idx]=true;
    });
    var sorted = Object.keys(indices).map(Number).sort(function(a,b){return a-b;});
    if (!sorted.length) return '<p class="ap-empty">No items found in DOM.</p>';

    return sorted.map(function(idx) {
      var cardEls = all.filter(function(el) {
        return el.getAttribute('data-key').startsWith(prefix+idx+'-');
      });
      var titleEl = cardEls.find(function(el){
        return el.getAttribute('data-key').endsWith('-title') ||
               el.getAttribute('data-key').endsWith('-q');
      });
      var label = titleEl ? trunc(titleEl.textContent||'',42) : cardLabel+' '+(idx+1);
      return '<details class="ap-acc">'+ 
        '<summary class="ap-acc-hd">'+escH(label)+'</summary>'+
        '<div class="ap-acc-body">'+
          cardEls.map(function(el) {
            var key  = el.getAttribute('data-key');
            var fld  = key.slice((prefix+idx+'-').length).replace(/-/g,' ');
            var val  = el.textContent||'';
            var long = val.length > 80;
            return '<label class="ap-lbl">'+escH(fld)+'</label>'+
              (long
                ? '<textarea class="ap-inp" data-tk="'+escH(key)+'" rows="3">'+escH(val)+'</textarea>'
                : '<input class="ap-inp" type="text" data-tk="'+escH(key)+'" value="'+escH(val)+'" />');
          }).join('')+
        '</div></details>';
    }).join('');
  }

  function buildServicesForms() {
    return '<div class="ap-sec-title">Service Cards</div>'+
      buildKeyGroupForms('services.card-','Card');
  }

  function buildFAQForms() {
    return '<div class="ap-sec-title">FAQ Items</div>'+
      buildKeyGroupForms('faq.item-','Question');
  }

  function buildAgitateForms() {
    return '<div class="ap-sec-title">Pain Point Cards</div>'+
      buildKeyGroupForms('agitate.card-','Card');
  }

  function buildTestimonialForms() {
    var textEls = Array.from(document.querySelectorAll('[data-key^="testimonials.item-"][data-key$="-text"]'));
    if (!textEls.length) return '<p class="ap-empty">Tag testimonial text elements with data-key="testimonials.item-N-text".</p>';
    return '<div class="ap-sec-title">Testimonial Cards</div>'+
      textEls.map(function(tel, i) {
        var tKey  = tel.getAttribute('data-key');
        var idxM  = tKey.match(/item-(\d+)-/);
        var idx   = idxM ? idxM[1] : i;
        var nKey  = 'testimonials.item-'+idx+'-name';
        var nEl   = document.querySelector('[data-key="'+nKey+'"]');
        var name  = nEl ? (nEl.textContent||'') : '';
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">'+escH(name||'Review '+(i+1))+'</summary>'+
          '<div class="ap-acc-body">'+
            '<label class="ap-lbl">Reviewer Name</label>'+
            '<input class="ap-inp" type="text" data-tk="'+nKey+'" value="'+escH(name)+'" />'+
            '<label class="ap-lbl">Review Text</label>'+
            '<textarea class="ap-inp" data-tk="'+escH(tKey)+'" rows="3">'+escH(tel.textContent||'')+'</textarea>'+
          '</div></details>';
      }).join('');
  }

  function buildTeamForms() {
    var nameEls = Array.from(document.querySelectorAll('[data-key^="team.member-"][data-key$="-name"]'));
    if (!nameEls.length) return '<p class="ap-empty">No team data-key attributes found.</p>';
    return '<div class="ap-sec-title">Team Members</div>'+
      nameEls.map(function(nel, i) {
        var nKey = nel.getAttribute('data-key');
        var mch  = nKey.match(/member-(\d+)-/);
        var idx  = mch ? mch[1] : i;
        var tKey = 'team.member-'+idx+'-title';
        var tel  = document.querySelector('[data-key="'+tKey+'"]');
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">'+escH(nel.textContent||'Member '+(i+1))+'</summary>'+
          '<div class="ap-acc-body">'+
            '<label class="ap-lbl">Name</label>'+
            '<input class="ap-inp" type="text" data-tk="'+escH(nKey)+'" value="'+escH(nel.textContent||'')+'" />'+
            '<label class="ap-lbl">Title / Role</label>'+
            '<input class="ap-inp" type="text" data-tk="'+escH(tKey)+'" value="'+escH(tel?tel.textContent:'')+'" />'+
          '</div></details>';
      }).join('');
  }

  function buildNavForms() {
    var btns = Array.from(document.querySelectorAll('[data-editable-nav] [data-key]'));
    if (!btns.length) return '<p class="ap-empty">No nav links found. Add data-editable-nav to your &lt;nav&gt;.</p>';
    return '<div class="ap-sec-title">Navigation Links</div>'+
      '<p class="ap-hint">Edit display text. Scroll targets are defined in code.</p>'+
      btns.map(function(btn) {
        var key = btn.getAttribute('data-key');
        return '<label class="ap-lbl">'+escH(key)+'</label>'+
          '<input class="ap-inp" type="text" data-tk="'+escH(key)+'" value="'+escH(btn.textContent||'')+'" />';
      }).join('');
  }

  function buildContactForms() {
    var els = Array.from(document.querySelectorAll('[data-editable-contact][data-key]'));
    if (!els.length) return '<p class="ap-empty">No contact elements found. Add data-editable-contact attributes.</p>';
    var snap = readJSON(STORAGE_KEY)||{};
    return '<div class="ap-sec-title">Contact & Links</div>'+
      els.map(function(el) {
        var key   = el.getAttribute('data-key');
        var label = key.split('.').pop().replace(/-/g,' ');
        var saved = snap[key]||{};
        var text  = saved.text !== undefined ? saved.text : (el.textContent||'').trim();
        var href  = saved.href !== undefined ? saved.href : (el.getAttribute('href')||'');
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">'+escH(label)+'</summary>'+
          '<div class="ap-acc-body">'+
            '<label class="ap-lbl">Display Text</label>'+
            '<input class="ap-inp" type="text" data-tk="'+escH(key)+'" data-tf="text" value="'+escH(text)+'" />'+
            (href!==''
              ? '<label class="ap-lbl">Link / URL</label>'+
                '<input class="ap-inp" type="text" data-tk="'+escH(key)+'" data-tf="href" value="'+escH(href)+'" />'
              : '')+
          '</div></details>';
      }).join('');
  }

  /* ── Wire inputs → live DOM updates ────────────────────────────── */
  function wireFormInputs(container) {
    container.querySelectorAll('[data-tk]').forEach(function(inp) {
      inp.addEventListener('input', function() {
        var key = inp.getAttribute('data-tk');
        var tf  = inp.getAttribute('data-tf'); // 'text' | 'href' | null
        var val = inp.value;

        if (tf) {
          /* Contact item */
          var contEl = document.querySelector('[data-editable-contact][data-key="'+key+'"]');
          if (contEl) {
            if (tf==='text') contEl.textContent = val;
            if (tf==='href' && contEl.tagName==='A') contEl.href = val;
          }
          /* Persist immediately */
          var snap = readJSON(STORAGE_KEY)||{};
          if (!snap[key] || typeof snap[key]!=='object') snap[key]={};
          snap[key][tf] = val;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
        } else {
          /* All DOM elements with this data-key (handles duplicated marquee) */
          document.querySelectorAll('[data-key="'+key+'"]').forEach(function(el) {
            el.textContent = val;
          });
        }
      });
    });
  }

  /* ── Draggable panel ─────────────────────────────────────────────*/
  function makeDraggable(panel, handle) {
    var dr = { on:false, sx:0, sy:0, pr:0, pt:0 };
    handle.style.cursor='grab';
    handle.addEventListener('mousedown', function(e) {
      dr.on=true;
      dr.sx=e.clientX; dr.sy=e.clientY;
      var rect=panel.getBoundingClientRect();
      dr.pr=window.innerWidth-rect.right; dr.pt=rect.top;
      panel.style.transition='none';
      document.body.style.userSelect='none';
      handle.style.cursor='grabbing';
    });
    window.addEventListener('mousemove', function(e) {
      if (!dr.on) return;
      var dx=e.clientX-dr.sx, dy=e.clientY-dr.sy;
      var nr=Math.max(0,Math.min(dr.pr-dx, window.innerWidth-80));
      var nt=Math.max(0,Math.min(dr.pt+dy, window.innerHeight-120));
      panel.style.right=nr+'px'; panel.style.top=nt+'px'; panel.style.left='auto';
    });
    window.addEventListener('mouseup', function() {
      if (dr.on) { dr.on=false; document.body.style.userSelect=''; handle.style.cursor='grab'; }
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     BRAND COLORS MODAL
  ══════════════════════════════════════════════════════════════════ */
  function openColorsModal() {
    var ex = document.getElementById('ap-colors-modal');
    if (ex) { ex.remove(); return; }

    var saved = readJSON(COLOR_KEY)||{};
    var root  = document.documentElement;

    var modal = document.createElement('div');
    modal.id = 'ap-colors-modal';
    modal.innerHTML =
      '<div class="ap-modal-hd">'+
        '<span>🎨 Brand Colors</span>'+
        '<button class="ap-modal-close" id="ap-colors-close">✕</button>'+
      '</div>'+
      '<p class="ap-hint" style="padding:10px 16px 0">'+
        'Swatches update the page instantly. Hit Save to keep changes.'+
      '</p>'+
      '<div id="ap-swatches">'+
        BRAND_COLORS.map(function(bc) {
          var cur = saved[bc.varName] ||
            root.style.getPropertyValue(bc.varName).trim() ||
            getComputedStyle(root).getPropertyValue(bc.varName).trim() ||
            bc.hex;
          if (!cur||cur[0]!=='#') cur=bc.hex;
          return '<div class="ap-swatch-row">'+
            '<label class="ap-swatch-lbl">'+escH(bc.label)+'</label>'+
            '<div class="ap-swatch-ctrl">'+
              '<input type="color" class="ap-swatch-inp" data-var="'+bc.varName+'" value="'+escH(cur)+'" />'+
              '<span class="ap-swatch-hex">'+escH(cur)+'</span>'+
            '</div>'+
          '</div>';
        }).join('')+
      '</div>'+
      '<div style="padding:12px 16px 16px">'+
        '<button id="ap-colors-save" class="ap-btn-full-primary">Save Colors</button>'+
      '</div>';

    document.body.appendChild(modal);

    document.getElementById('ap-colors-close').addEventListener('click', function(){ modal.remove(); });

    modal.querySelectorAll('.ap-swatch-inp').forEach(function(inp) {
      inp.addEventListener('input', function() {
        var varName=inp.getAttribute('data-var');
        var hex=inp.value;
        root.style.setProperty(varName, hex);
        var bc=BRAND_COLORS.find(function(c){return c.varName===varName;});
        if (bc && bc.hslVar) root.style.setProperty(bc.hslVar, hexToHSL(hex));
        var row=inp.closest('.ap-swatch-row');
        if (row) { var hl=row.querySelector('.ap-swatch-hex'); if(hl) hl.textContent=hex; }
      });
    });

    document.getElementById('ap-colors-save').addEventListener('click', function() {
      var toSave={};
      modal.querySelectorAll('.ap-swatch-inp').forEach(function(inp){
        toSave[inp.getAttribute('data-var')]=inp.value;
      });
      localStorage.setItem(COLOR_KEY, JSON.stringify(toSave));
      toast('Colors saved');
      modal.remove();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     PROMO ELEMENTS (inject + manage)
  ══════════════════════════════════════════════════════════════════ */
  function injectPromoElements() {
    /* Banner */
    if (!document.getElementById('ap-promo-banner')) {
      var banner = document.createElement('div');
      banner.id = 'ap-promo-banner';
      banner.setAttribute('data-promo-banner','');
      banner.setAttribute('data-key','promo.banner');
      banner.style.display='none';
      banner.innerHTML =
        '<div id="ap-promo-banner-inner">'+
          '<span id="ap-promo-banner-text">✦ Special offer — limited time!</span>'+
          '<a id="ap-promo-banner-cta" href="#contact">Learn More</a>'+
        '</div>'+
        '<button id="ap-promo-banner-dismiss" title="Dismiss">✕</button>';
      var hdr=document.querySelector('header');
      if (hdr && hdr.parentNode) hdr.parentNode.insertBefore(banner, hdr.nextSibling);
      else document.body.prepend(banner);
      banner.querySelector('#ap-promo-banner-dismiss').addEventListener('click', function(){
        banner.style.display='none';
      });
    }

    /* Promo section (between services and testimonials) */
    if (!document.getElementById('ap-promo-section')) {
      var sec = document.createElement('section');
      sec.id = 'ap-promo-section';
      sec.setAttribute('data-promo-section','');
      sec.setAttribute('data-key','promo.section');
      sec.style.display='none';
      sec.innerHTML =
        '<div class="ap-promo-sec-inner">'+
          '<h2 id="ap-promo-sec-heading">Featured Offer</h2>'+
          '<p id="ap-promo-sec-sub">A special opportunity for you.</p>'+
          '<div id="ap-promo-cards"></div>'+
        '</div>';
      var svc = document.getElementById('services');
      var tp  = document.getElementById('social-proof');
      if (svc && tp && svc.parentNode) svc.parentNode.insertBefore(sec, tp);
    }

    /* Apply any saved promo state */
    var pData = readJSON(PROMO_KEY);
    if (pData) applyPromoData(pData);
  }

  function applyPromoData(d) {
    var banner = document.getElementById('ap-promo-banner');
    var sec    = document.getElementById('ap-promo-section');

    if (banner) {
      banner.style.display = d.bannerActive ? '' : 'none';
      if (d.bannerText) {
        var bt=banner.querySelector('#ap-promo-banner-text');
        if(bt) bt.textContent=d.bannerText;
      }
      if (d.bannerLink) {
        var bl=banner.querySelector('#ap-promo-banner-cta');
        if(bl) bl.href=d.bannerLink;
      }
    }

    if (sec) {
      sec.style.display = d.sectionActive ? '' : 'none';
      var sh=sec.querySelector('#ap-promo-sec-heading');
      var ss=sec.querySelector('#ap-promo-sec-sub');
      if(sh && d.sectionHeading) sh.textContent=d.sectionHeading;
      if(ss && d.sectionSub)     ss.textContent=d.sectionSub;
      var cards=sec.querySelector('#ap-promo-cards');
      if (cards && d.cards && d.cards.length) {
        renderPromoCards(cards, d.cards, d.layout||'cards');
      }
    }
  }

  function renderPromoCards(container, cards, layout) {
    if (layout==='hero' && cards[0]) {
      var c=cards[0];
      container.className='ap-promo-hero';
      container.innerHTML=
        (c.img?'<img class="ap-promo-hero-img" src="'+escH(c.img)+'" alt="" />':'')+
        '<div class="ap-promo-hero-body">'+
          '<h3>'+escH(c.title||'')+'</h3>'+
          '<p>'+escH(c.desc||'')+'</p>'+
          (c.ctaLabel?'<a class="ap-promo-cta" href="'+escH(c.ctaLink||'#contact')+'">'+escH(c.ctaLabel)+'</a>':'')+
        '</div>';
    } else {
      container.className='ap-promo-cards-grid';
      container.innerHTML=cards.map(function(c){
        return '<div class="ap-promo-card">'+
          (c.img?'<img class="ap-promo-card-img" src="'+escH(c.img)+'" alt="" />':'')+
          '<div class="ap-promo-card-body">'+
            '<h3>'+escH(c.title||'')+'</h3>'+
            '<p>'+escH(c.desc||'')+'</p>'+
            (c.ctaLabel?'<a class="ap-promo-cta" href="'+escH(c.ctaLink||'#contact')+'">'+escH(c.ctaLabel)+'</a>':'')+
          '</div>'+
        '</div>';
      }).join('');
    }
  }

  /* ── Promo Editor Modal ──────────────────────────────────────────*/
  function openPromoModal() {
    var ex = document.getElementById('ap-promo-modal');
    if (ex) { ex.remove(); return; }

    var d = readJSON(PROMO_KEY) || {
      bannerActive:false, bannerText:'✦ Special offer — limited time!', bannerLink:'#contact',
      sectionActive:false, sectionHeading:'Featured Offer', sectionSub:'A special opportunity for you.',
      layout:'cards',
      cards:[{ title:'New Offer', desc:'Describe your offer here.', ctaLabel:'Learn More', ctaLink:'#contact' }]
    };

    var modal = document.createElement('div');
    modal.id='ap-promo-modal';
    modal.innerHTML=
      '<div class="ap-modal-hd">'+
        '<span>✦ Promo Editor</span>'+
        '<button class="ap-modal-close" id="ap-promo-close">✕</button>'+
      '</div>'+
      '<div class="ap-promo-block">'+
        '<label class="ap-toggle-row">'+
          '<input type="checkbox" id="ap-promo-ba" '+(d.bannerActive?'checked':'')+' />'+
          ' Show Promo Banner'+
        '</label>'+
        '<div class="ap-promo-sub" id="ap-promo-bfields" style="display:'+(d.bannerActive?'':'none')+'">'+
          '<label class="ap-lbl">Banner Text</label>'+
          '<input class="ap-inp" id="ap-promo-btxt" value="'+escH(d.bannerText||'')+'" />'+
          '<label class="ap-lbl">Banner Link / URL</label>'+
          '<input class="ap-inp" id="ap-promo-blnk" value="'+escH(d.bannerLink||'')+'" />'+
        '</div>'+
      '</div>'+
      '<div class="ap-promo-block">'+
        '<label class="ap-toggle-row">'+
          '<input type="checkbox" id="ap-promo-sa" '+(d.sectionActive?'checked':'')+' />'+
          ' Show Promo Section'+
        '</label>'+
        '<div class="ap-promo-sub" id="ap-promo-sfields" style="display:'+(d.sectionActive?'':'none')+'">'+
          '<label class="ap-lbl">Heading</label>'+
          '<input class="ap-inp" id="ap-promo-shd" value="'+escH(d.sectionHeading||'')+'" />'+
          '<label class="ap-lbl">Subtext</label>'+
          '<input class="ap-inp" id="ap-promo-ssub" value="'+escH(d.sectionSub||'')+'" />'+
          '<label class="ap-lbl">Layout</label>'+
          '<select class="ap-inp" id="ap-promo-layout">'+
            '<option value="cards" '+(d.layout==='cards'?'selected':'')+'>Cards (max 3 recommended)</option>'+
            '<option value="hero" '+(d.layout==='hero'?'selected':'')+'>Hero (single)</option>'+
          '</select>'+
          '<div id="ap-promo-card-editor">'+buildPromoCardEditor(d.cards||[], d.layout||'cards')+'</div>'+
        '</div>'+
      '</div>'+
      '<div style="padding:12px 16px 16px">'+
        '<button id="ap-promo-save" class="ap-btn-full-primary">Save Promo</button>'+
      '</div>';

    document.body.appendChild(modal);

    document.getElementById('ap-promo-close').addEventListener('click',function(){modal.remove();});
    document.getElementById('ap-promo-ba').addEventListener('change',function(e){
      document.getElementById('ap-promo-bfields').style.display=e.target.checked?'':'none';
    });
    document.getElementById('ap-promo-sa').addEventListener('change',function(e){
      document.getElementById('ap-promo-sfields').style.display=e.target.checked?'':'none';
    });
    document.getElementById('ap-promo-layout').addEventListener('change',function(){
      var lyt=document.getElementById('ap-promo-layout').value;
      document.getElementById('ap-promo-card-editor').innerHTML=
        buildPromoCardEditor(collectPromoCards(), lyt);
      wirePromoButtons();
    });
    wirePromoButtons();

    document.getElementById('ap-promo-save').addEventListener('click',function(){
      var newData={
        bannerActive: document.getElementById('ap-promo-ba').checked,
        bannerText:   document.getElementById('ap-promo-btxt').value,
        bannerLink:   document.getElementById('ap-promo-blnk').value,
        sectionActive:document.getElementById('ap-promo-sa').checked,
        sectionHeading:document.getElementById('ap-promo-shd').value,
        sectionSub:   document.getElementById('ap-promo-ssub').value,
        layout:       document.getElementById('ap-promo-layout').value,
        cards:        collectPromoCards(),
      };
      localStorage.setItem(PROMO_KEY, JSON.stringify(newData));
      applyPromoData(newData);
      toast('Promo saved');
      modal.remove();
    });
  }

  function buildPromoCardEditor(cards, layout) {
    if (layout==='hero') {
      var c=cards[0]||{};
      return '<div class="ap-promo-card-form" data-ci="0">'+
        '<div class="ap-promo-card-form-title">Hero Card</div>'+
        '<label class="ap-lbl">Headline</label>'+
        '<input class="ap-inp" data-cf="title" value="'+escH(c.title||'')+'" />'+
        '<label class="ap-lbl">Supporting Text</label>'+
        '<textarea class="ap-inp" data-cf="desc" rows="2">'+escH(c.desc||'')+'</textarea>'+
        '<label class="ap-lbl">CTA Label</label>'+
        '<input class="ap-inp" data-cf="ctaLabel" value="'+escH(c.ctaLabel||'')+'" />'+
        '<label class="ap-lbl">CTA Link / URL</label>'+
        '<input class="ap-inp" data-cf="ctaLink" value="'+escH(c.ctaLink||'')+'" />'+
        '</div>';
    }
    var max=3;
    return cards.slice(0,max).map(function(c,i){
      return '<div class="ap-promo-card-form" data-ci="'+i+'">'+
        '<div class="ap-promo-card-form-title">Card '+(i+1)+
          ' <button class="ap-rm-card" data-ri="'+i+'">–</button></div>'+
        '<label class="ap-lbl">Title</label>'+
        '<input class="ap-inp" data-cf="title" value="'+escH(c.title||'')+'" />'+
        '<label class="ap-lbl">Description</label>'+
        '<textarea class="ap-inp" data-cf="desc" rows="2">'+escH(c.desc||'')+'</textarea>'+
        '<label class="ap-lbl">CTA Label</label>'+
        '<input class="ap-inp" data-cf="ctaLabel" value="'+escH(c.ctaLabel||'')+'" />'+
        '<label class="ap-lbl">CTA Link / URL</label>'+
        '<input class="ap-inp" data-cf="ctaLink" value="'+escH(c.ctaLink||'')+'" />'+
        '</div>';
    }).join('')+
    (cards.length<max
      ? '<button id="ap-add-card" class="ap-add-btn">+ Add Card'+(cards.length===max-1?' (max 3 recommended)':'')+'</button>'
      : '<p class="ap-hint" style="padding:6px 0">3 cards recommended. Save and toggle layout for more.</p>');
  }

  function collectPromoCards() {
    return Array.from(document.querySelectorAll('.ap-promo-card-form')).map(function(form){
      var card={};
      form.querySelectorAll('[data-cf]').forEach(function(inp){
        card[inp.getAttribute('data-cf')]=inp.value;
      });
      return card;
    });
  }

  function wirePromoButtons() {
    var addBtn=document.getElementById('ap-add-card');
    if (addBtn) {
      addBtn.addEventListener('click',function(){
        var cards=collectPromoCards();
        cards.push({title:'New Card',desc:'',ctaLabel:'Learn More',ctaLink:'#contact'});
        var lyt=document.getElementById('ap-promo-layout').value;
        document.getElementById('ap-promo-card-editor').innerHTML=buildPromoCardEditor(cards,lyt);
        wirePromoButtons();
      });
    }
    document.querySelectorAll('.ap-rm-card').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var idx=parseInt(btn.getAttribute('data-ri'),10);
        var cards=collectPromoCards();
        cards.splice(idx,1);
        var lyt=document.getElementById('ap-promo-layout').value;
        document.getElementById('ap-promo-card-editor').innerHTML=buildPromoCardEditor(cards,lyt);
        wirePromoButtons();
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     PREVIEW
  ══════════════════════════════════════════════════════════════════ */
  function enterPreview() {
    S.previewMode=true;
    commitActive();
    document.body.classList.add('ap-preview-mode');
    var tb=document.getElementById('ap-toolbar');
    if(tb) tb.style.display='none';
    var panel=document.getElementById('ap-panel');
    if(panel) panel.style.display='none';

    var bar=document.createElement('div');
    bar.id='ap-preview-bar';
    bar.innerHTML='<span>👁 Preview Mode</span><button id="ap-exit-preview">Exit Preview</button>';
    document.body.appendChild(bar);

    document.getElementById('ap-exit-preview').addEventListener('click',function(){
      S.previewMode=false;
      document.body.classList.remove('ap-preview-mode');
      bar.remove();
      var tb=document.getElementById('ap-toolbar'); if(tb) tb.style.display='';
      var panel=document.getElementById('ap-panel'); if(panel) panel.style.display='';
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════════ */
  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, DELAY); });
  } else {
    setTimeout(init, DELAY);
  }

}());
