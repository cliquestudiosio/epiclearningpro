/**
 * Epic Learning Pro — Admin Portal (Path A · localStorage)
 *
 * All data-key / data-editable* attributes are permanent.
 * Storage layer (localStorage) is temporary — replaced with real API later.
 * PIN: 8421
 *
 * Stacking order (guide section 5):
 *   [Editor top bar]   ← ALWAYS absolute top (z:100000)
 *   [Promo Banner]     ← directly under toolbar when both on (z:99997)
 *   [Sticky Header]    ← top = toolbarH + bannerH
 *   [Page content]     ← body padding-top = toolbarH + bannerH
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════════════════════════ */
  var script      = document.currentScript || document.querySelector('script[data-site-id]');
  var SITE_ID     = script ? script.getAttribute('data-site-id') : 'site_unknown';
  var STORAGE_KEY = 'ap-content-'  + SITE_ID;
  var ORIG_KEY    = 'ap-original-' + SITE_ID;
  var ORIG_DATE   = 'ap-orig-date-'+ SITE_ID;
  var COLOR_KEY   = 'ap-colors-'   + SITE_ID;
  var PROMO_KEY   = 'ap-promo-'    + SITE_ID;
  var IMG_KEY     = 'ap-img-'      + SITE_ID + '-';
  var PIN         = '8421';
  var DELAY       = 420;

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
    dirty:          false,
  };

  /* ── Brand Colors ──────────────────────────────────────────────── */
  var BRAND_COLORS = [
    { label: 'Primary (Purple)',    varName: '--brand-primary',    hslVar: '--primary',   hex: '#8B5FE6' },
    { label: 'Secondary (Teal)',    varName: '--brand-secondary',  hslVar: '--secondary', hex: '#36A6DD' },
    { label: 'Accent (Gold)',       varName: '--brand-accent',     hslVar: '--accent',    hex: '#CAA747' },
    { label: 'Hero Gradient Start', varName: '--brand-hero-start', hslVar: null,          hex: '#5B2DA8' },
    { label: 'Hero Gradient End',   varName: '--brand-hero-end',   hslVar: null,          hex: '#A472F0' },
    { label: 'Dark Tint',           varName: '--brand-tint',       hslVar: null,          hex: '#7a52d4' },
  ];

  /* ══════════════════════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════════════════════ */
  function hexToHSL(hex) {
    hex = hex.replace('#','');
    if (hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r=parseInt(hex.slice(0,2),16)/255, g=parseInt(hex.slice(2,4),16)/255, b=parseInt(hex.slice(4,6),16)/255;
    var max=Math.max(r,g,b), min=Math.min(r,g,b), h=0, s=0, l=(max+min)/2;
    if(max!==min){
      var d=max-min;
      s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        case b: h=((r-g)/d+4)/6; break;
      }
    }
    return Math.round(h*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%';
  }

  function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function toast(msg){
    var old=document.getElementById('ap-toast'); if(old) old.remove();
    var t=document.createElement('div'); t.id='ap-toast'; t.textContent=msg;
    document.body.appendChild(t);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ t.classList.add('ap-toast-visible'); }); });
    setTimeout(function(){ t.classList.remove('ap-toast-visible'); setTimeout(function(){ if(t.parentNode) t.remove(); },400); },3000);
  }

  function getPageSectionIds(){
    return Array.from(document.querySelectorAll('[id]'))
      .map(function(el){ return el.id; })
      .filter(function(id){ return id && !id.startsWith('ap-'); });
  }

  /* ── Find a card's direct-child wrapper inside its list container ── */
  function findCardWrapper(childEl){
    var listEl = childEl.closest('[data-editable-list]');
    if(!listEl) return null;
    var node = childEl;
    while(node.parentElement && node.parentElement !== listEl) node = node.parentElement;
    return (node.parentElement === listEl) ? node : null;
  }

  /* ══════════════════════════════════════════════════════════════════
     STORAGE HELPERS
  ══════════════════════════════════════════════════════════════════ */
  function readJSON(key){ try{ return JSON.parse(localStorage.getItem(key)||'null'); } catch(e){ return null; } }

  /* Elements with data-editable that are NOT inside a list — these get in-place blue editing */
  function simpleEditables(){
    return Array.from(document.querySelectorAll('[data-editable][data-key]')).filter(function(el){
      return !el.closest('[data-editable-list]');
    });
  }

  function buildSnap(){
    var out = readJSON(STORAGE_KEY)||{};
    simpleEditables().forEach(function(el){ out[el.getAttribute('data-key')]=el.innerHTML; });
    return out;
  }

  function applySnap(snap){
    if(!snap) return;
    simpleEditables().forEach(function(el){
      var v=snap[el.getAttribute('data-key')];
      if(v!==undefined) el.innerHTML=v;
    });
    /* Structured list items (read-only — value comes from panel forms) */
    document.querySelectorAll('[data-editable-list] [data-key]').forEach(function(el){
      var v=snap[el.getAttribute('data-key')];
      if(v!==undefined && typeof v==='string') el.textContent=v;
    });
    /* Contact */
    document.querySelectorAll('[data-editable-contact][data-key]').forEach(function(el){
      var v=snap[el.getAttribute('data-key')];
      if(v && typeof v==='object'){
        if(v.text!==undefined) el.textContent=v.text;
        if(v.href!==undefined && el.tagName==='A') el.href=v.href;
      }
    });
    /* Nav */
    document.querySelectorAll('[data-editable-nav] [data-key]').forEach(function(el){
      var key=el.getAttribute('data-key');
      var v=snap[key];
      if(v && typeof v==='object'){ if(v.text!==undefined) el.textContent=v.text; }
      else if(typeof v==='string') el.textContent=v;
    });
    /* Hidden (removed) cards */
    var hidden=snap['__ap_hidden__'];
    if(hidden && Array.isArray(hidden)){
      hidden.forEach(function(key){
        var el=document.querySelector('[data-key="'+key+'"]');
        if(el){ var w=findCardWrapper(el); if(w){ w.style.display='none'; w.setAttribute('data-ap-removed','true'); } }
      });
    }
  }

  function applyColors(colors){
    if(!colors) return;
    var root=document.documentElement;
    BRAND_COLORS.forEach(function(bc){
      var hex=colors[bc.varName]; if(!hex) return;
      root.style.setProperty(bc.varName,hex);
      if(bc.hslVar) root.style.setProperty(bc.hslVar,hexToHSL(hex));
    });
  }

  function applyImages(){
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k && k.startsWith(IMG_KEY)){
        var dataKey=k.slice(IMG_KEY.length);
        var src=localStorage.getItem(k);
        if(src) document.querySelectorAll('[data-editable-image][data-key="'+dataKey+'"]').forEach(function(img){ img.src=src; });
      }
    }
  }

  function saveAll(){
    var snap=buildSnap();
    /* Nav */
    document.querySelectorAll('[data-editable-nav] [data-key]').forEach(function(el){
      var key=el.getAttribute('data-key');
      var ex=snap[key]||{}; if(typeof ex!=='object') ex={};
      ex.text=el.textContent; snap[key]=ex;
    });
    /* Contact */
    document.querySelectorAll('[data-editable-contact][data-key]').forEach(function(el){
      var key=el.getAttribute('data-key');
      if(!snap[key]||typeof snap[key]!=='object') snap[key]={};
      snap[key].text=(el.textContent||'').trim();
      snap[key].href=el.getAttribute('href')||el.getAttribute('data-href')||'';
    });
    /* Hidden cards */
    var hidden=[];
    document.querySelectorAll('[data-ap-removed="true"] [data-key]').forEach(function(el){
      var k=el.getAttribute('data-key');
      if(k.match(/\.card-\d+-title$/) && hidden.indexOf(k)===-1) hidden.push(k);
    });
    if(hidden.length) snap['__ap_hidden__']=hidden;
    else delete snap['__ap_hidden__'];

    /* List content */
    document.querySelectorAll('[data-editable-list] [data-key]').forEach(function(el){
      var w=findCardWrapper(el); if(w && w.getAttribute('data-ap-removed')==='true') return;
      var key=el.getAttribute('data-key');
      if(!snap[key]) snap[key]=el.textContent;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    /* Colors */
    var savedColors=readJSON(COLOR_KEY)||{};
    BRAND_COLORS.forEach(function(bc){
      var v=document.documentElement.style.getPropertyValue(bc.varName).trim();
      if(v) savedColors[bc.varName]=v;
    });
    if(Object.keys(savedColors).length) localStorage.setItem(COLOR_KEY,JSON.stringify(savedColors));
    S.dirty=false;
  }

  /* ══════════════════════════════════════════════════════════════════
     PAGE OFFSETS  (guide section 5 — toolbar ALWAYS at absolute top)

     [ Editor top bar ]   z:100000  top:0
     [ Promo Banner   ]   z:99997   top: toolbarH  (when both on)
     [ Sticky Header  ]             top: toolbarH + bannerH
     [ Body content   ]   padding-top: toolbarH + bannerH
  ══════════════════════════════════════════════════════════════════ */
  function updatePageOffsets(){
    var toolbar=document.getElementById('ap-toolbar');
    var banner=document.getElementById('ap-promo-banner');
    var hdr=document.querySelector('header');

    var toolbarH=(toolbar && S.editMode) ? (toolbar.offsetHeight||44) : 0;
    var bannerVisible=banner && banner.style.display!=='none';
    var bannerH=bannerVisible ? (banner.offsetHeight||40) : 0;

    /* Toolbar pinned at top */
    if(toolbar) toolbar.style.top='0';

    /* Banner directly below toolbar */
    if(banner) banner.style.top=toolbarH+'px';

    /* Sticky header below both */
    if(hdr) hdr.style.top=(toolbarH+bannerH)+'px';

    /* Push body down */
    document.body.style.paddingTop=(toolbarH+bannerH)+'px';
  }

  /* ══════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════ */
  function init(){
    injectStylesheet();

    var saved=readJSON(STORAGE_KEY);
    if(saved) setTimeout(function(){ applySnap(saved); },60);

    var savedColors=readJSON(COLOR_KEY);
    if(savedColors) applyColors(savedColors);

    applyImages();

    if(!localStorage.getItem(ORIG_DATE)){
      setTimeout(function(){
        localStorage.setItem(ORIG_KEY, JSON.stringify(buildSnap()));
        localStorage.setItem(ORIG_DATE, String(Date.now()));
      },300);
    }

    injectPromoElements();
    injectGear();

    var pData=readJSON(PROMO_KEY);
    if(pData){ applyPromoData(pData); updatePageOffsets(); }
  }

  function injectStylesheet(){
    if(document.getElementById('ap-css')) return;
    var link=document.createElement('link');
    link.id='ap-css'; link.rel='stylesheet';
    link.href=BASE_PATH+'admin-portal.css';
    document.head.appendChild(link);
  }

  /* ══════════════════════════════════════════════════════════════════
     GEAR
  ══════════════════════════════════════════════════════════════════ */
  function injectGear(){
    var anchor=document.getElementById('ap-gear-anchor');
    if(!anchor||document.getElementById('ap-gear')) return;
    var btn=document.createElement('button');
    btn.id='ap-gear'; btn.title='Admin editor'; btn.setAttribute('aria-label','Open admin editor');
    btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"'+
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
    btn.addEventListener('click',function(){ if(!S.editMode) showLogin(); else openPanel(); });
  }

  /* ══════════════════════════════════════════════════════════════════
     LOGIN
  ══════════════════════════════════════════════════════════════════ */
  function showLogin(){
    if(document.getElementById('ap-login-overlay')) return;
    var ov=document.createElement('div'); ov.id='ap-login-overlay';
    ov.innerHTML=
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
    var inp=ov.querySelector('#ap-pin-input');
    var err=ov.querySelector('#ap-login-error');
    setTimeout(function(){ inp.focus(); },50);
    function attempt(){ if(inp.value===PIN){ ov.remove(); enterEditMode(); } else { err.style.display='block'; inp.value=''; inp.focus(); } }
    ov.querySelector('#ap-login-btn').addEventListener('click',attempt);
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter') attempt(); if(e.key==='Escape') ov.remove(); });
    ov.querySelector('#ap-login-cancel').addEventListener('click',function(){ ov.remove(); });
    ov.addEventListener('click',function(e){ if(e.target===ov) ov.remove(); });
  }

  /* ══════════════════════════════════════════════════════════════════
     EDIT MODE
  ══════════════════════════════════════════════════════════════════ */
  function enterEditMode(){
    S.editMode=true; S.dirty=false;
    document.body.classList.add('ap-edit-mode');

    simpleEditables().forEach(function(el){ el.addEventListener('click',handleInPlace,true); });
    document.querySelectorAll('[data-editable-list]').forEach(function(el){ el.addEventListener('click',handleListClick,true); });
    document.querySelectorAll('[data-editable-contact]').forEach(function(el){ el.addEventListener('click',handleContactClick,true); });
    document.querySelectorAll('[data-editable-nav]').forEach(function(el){ el.addEventListener('click',handleNavClick,true); });
    document.querySelectorAll('[data-editable-image]').forEach(function(el){ el.addEventListener('click',handleImageClick,true); });

    showToolbar();
    updatePageOffsets();
    toast('Edit mode — click any highlighted element to edit.');
  }

  function exitEditMode(skipDirtyCheck){
    if(!skipDirtyCheck && S.dirty){
      /* OK = Discard and exit | Cancel = Stay */
      var choice=confirm('You have unsaved changes.\n\nOK = Discard changes and exit\nCancel = Stay in editor');
      if(!choice) return;
      /* Discard: reload last saved state */
      var saved=readJSON(STORAGE_KEY);
      if(saved) applySnap(saved);
    }
    S.editMode=false; S.previewMode=false; S.dirty=false;
    commitActive();
    document.body.classList.remove('ap-edit-mode','ap-preview-mode');
    document.body.style.paddingTop='';

    simpleEditables().forEach(function(el){
      el.contentEditable='false';
      el.removeEventListener('click',handleInPlace,true);
    });
    document.querySelectorAll('[data-editable-list]').forEach(function(el){ el.removeEventListener('click',handleListClick,true); });
    document.querySelectorAll('[data-editable-contact]').forEach(function(el){ el.removeEventListener('click',handleContactClick,true); });
    document.querySelectorAll('[data-editable-nav]').forEach(function(el){ el.removeEventListener('click',handleNavClick,true); });
    document.querySelectorAll('[data-editable-image]').forEach(function(el){ el.removeEventListener('click',handleImageClick,true); });

    var hdr=document.querySelector('header'); if(hdr) hdr.style.top='';
    ['ap-toolbar','ap-panel','ap-preview-bar','ap-toast','ap-colors-modal','ap-promo-modal'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.remove();
    });
    S.activeEl=null; S.panelOpen=false;
    updatePageOffsets();
  }

  function commitActive(){
    if(S.activeEl){ S.activeEl.contentEditable='false'; S.activeEl.classList.remove('ap-editing'); S.activeEl=null; }
  }

  /* ── Click handlers ─────────────────────────────────────────────*/
  function handleInPlace(e){
    if(S.previewMode) return;
    e.stopPropagation();
    var el=e.currentTarget;
    if(S.activeEl && S.activeEl!==el) commitActive();
    S.activeEl=el; el.contentEditable='true'; el.classList.add('ap-editing'); el.focus();
    el.addEventListener('input',function(){ S.dirty=true; },{once:false});
    if(document.caretRangeFromPoint){
      var r=document.caretRangeFromPoint(e.clientX,e.clientY);
      if(r){ var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    }
  }

  function handleListClick(e){
    if(S.previewMode) return;
    /* Don't fire if user clicked a button inside (e.g. accordion trigger) */
    if(e.target.closest('button:not([data-editable-nav])')) return;
    e.stopPropagation();
    openPanel(e.currentTarget.getAttribute('data-editable-list'));
  }

  function handleContactClick(e){
    if(S.previewMode) return;
    e.stopPropagation(); e.preventDefault();
    openPanel('contact');
  }

  function handleNavClick(e){
    if(S.previewMode) return;
    e.stopPropagation(); e.preventDefault();
    openPanel('nav');
  }

  function handleImageClick(e){
    if(S.previewMode) return;
    e.stopPropagation(); e.preventDefault();
    var imgEl=e.currentTarget; var key=imgEl.getAttribute('data-key');
    var inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.addEventListener('change',function(){
      var file=inp.files && inp.files[0]; if(!file) return;
      var reader=new FileReader();
      reader.onload=function(ev){
        var dataUrl=ev.target.result;
        document.querySelectorAll('[data-editable-image][data-key="'+key+'"]').forEach(function(img){ img.src=dataUrl; });
        localStorage.setItem(IMG_KEY+key,dataUrl);
        S.dirty=true; toast('Image updated — hit Save to keep it.');
      };
      reader.readAsDataURL(file);
    });
    inp.click();
  }

  /* ══════════════════════════════════════════════════════════════════
     TOOLBAR  (z:100000, top:0 — always absolute top per guide)
  ══════════════════════════════════════════════════════════════════ */
  function showToolbar(){
    if(document.getElementById('ap-toolbar')) return;
    var origDate=localStorage.getItem(ORIG_DATE);
    var ageDays=origDate?(Date.now()-parseInt(origDate,10))/86400000:0;
    var canRestore=ageDays<14;

    var tb=document.createElement('div'); tb.id='ap-toolbar';
    tb.innerHTML=
      '<div id="ap-toolbar-inner">'+
        '<span id="ap-toolbar-label">⚙ Admin Editor <span id="ap-toolbar-mode">· Editing</span></span>'+
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
    updatePageOffsets();

    document.getElementById('ap-btn-content').addEventListener('click',function(){ openPanel(); });
    document.getElementById('ap-btn-colors').addEventListener('click',openColorsModal);
    document.getElementById('ap-btn-promo').addEventListener('click',openPromoModal);
    document.getElementById('ap-btn-preview').addEventListener('click',enterPreview);
    document.getElementById('ap-btn-exit').addEventListener('click',function(){ exitEditMode(false); });
    document.getElementById('ap-btn-save').addEventListener('click',function(){
      commitActive(); saveAll(); toast('Saved (local preview mode)');
    });
    var rb=document.getElementById('ap-btn-restore');
    if(rb){
      rb.addEventListener('click',function(){
        if(!confirm('Restore to original version? All saved edits will be cleared.')) return;
        [STORAGE_KEY,COLOR_KEY,PROMO_KEY].forEach(function(k){ localStorage.removeItem(k); });
        for(var i=localStorage.length-1;i>=0;i--){
          var k2=localStorage.key(i); if(k2 && k2.startsWith(IMG_KEY)) localStorage.removeItem(k2);
        }
        toast('Restored — reloading…'); setTimeout(function(){ location.reload(); },1200);
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     SIDE PANEL
  ══════════════════════════════════════════════════════════════════ */
  var SECTIONS=[
    {id:'services',     label:'Services'},
    {id:'faqs',         label:'FAQs'},
    {id:'agitate',      label:'Pain Points'},
    {id:'testimonials', label:'Testimonials'},
    {id:'team',         label:'Team'},
    {id:'nav',          label:'Nav Links'},
    {id:'contact',      label:'Contact'},
  ];

  function openPanel(sectionId){
    if(sectionId) S.panelSection=sectionId;
    var existing=document.getElementById('ap-panel');
    if(existing){
      if(sectionId) switchSection(sectionId);
      if(S.panelMinimized) expandPanel();
      return;
    }
    var panel=document.createElement('div'); panel.id='ap-panel';
    panel.innerHTML=
      '<div id="ap-panel-header">'+
        '<span id="ap-panel-title">☰ Content Panel</span>'+
        '<div id="ap-panel-controls">'+
          '<button id="ap-panel-min" title="Minimize">–</button>'+
          '<button id="ap-panel-close" title="Close">✕</button>'+
        '</div>'+
      '</div>'+
      '<div id="ap-panel-tabs">'+
        SECTIONS.map(function(s){ return '<button class="ap-tab'+(s.id===S.panelSection?' ap-tab-active':'')+'" data-sec="'+s.id+'">'+s.label+'</button>'; }).join('')+
      '</div>'+
      '<div id="ap-panel-body"></div>';
    document.body.appendChild(panel);
    S.panelOpen=true;

    panel.querySelectorAll('.ap-tab').forEach(function(tab){
      tab.addEventListener('click',function(){ switchSection(tab.getAttribute('data-sec')); });
    });
    document.getElementById('ap-panel-min').addEventListener('click',function(){
      var body=document.getElementById('ap-panel-body');
      var tabs=document.getElementById('ap-panel-tabs');
      var btn=document.getElementById('ap-panel-min');
      if(S.panelMinimized){ body.style.display=''; tabs.style.display=''; btn.textContent='–'; S.panelMinimized=false; }
      else { body.style.display='none'; tabs.style.display='none'; btn.textContent='□'; S.panelMinimized=true; }
    });
    document.getElementById('ap-panel-close').addEventListener('click',function(){ panel.remove(); S.panelOpen=false; S.panelMinimized=false; });
    makeDraggable(panel, document.getElementById('ap-panel-header'));
    switchSection(S.panelSection);
  }

  function expandPanel(){
    var body=document.getElementById('ap-panel-body'); if(body) body.style.display='';
    var tabs=document.getElementById('ap-panel-tabs'); if(tabs) tabs.style.display='';
    var btn=document.getElementById('ap-panel-min'); if(btn) btn.textContent='–';
    S.panelMinimized=false;
  }

  function switchSection(id){
    S.panelSection=id;
    var panel=document.getElementById('ap-panel'); if(!panel) return;
    panel.querySelectorAll('.ap-tab').forEach(function(t){ t.classList.toggle('ap-tab-active',t.getAttribute('data-sec')===id); });
    var body=document.getElementById('ap-panel-body'); if(!body) return;
    switch(id){
      case 'services':     body.innerHTML=buildServicesForms();    break;
      case 'faqs':         body.innerHTML=buildFAQForms();         break;
      case 'agitate':      body.innerHTML=buildAgitateForms();     break;
      case 'testimonials': body.innerHTML=buildTestimonialForms(); break;
      case 'team':         body.innerHTML=buildTeamForms();        break;
      case 'nav':          body.innerHTML=buildNavForms();         break;
      case 'contact':      body.innerHTML=buildContactForms();     break;
      default:             body.innerHTML='<p class="ap-empty">Section not found.</p>';
    }
    wireFormInputs(body);
  }

  /* ══════════════════════════════════════════════════════════════════
     LIVE DOM ADD / REMOVE CARDS + BULLETS
  ══════════════════════════════════════════════════════════════════ */

  /* Remove a card from the live page by hiding its wrapper */
  function removeCardFromPage(listType, cardIdx){
    var titleEl=document.querySelector('[data-key="'+listType+'.card-'+cardIdx+'-title"]');
    if(!titleEl) return;
    var w=findCardWrapper(titleEl);
    if(w){ w.style.display='none'; w.setAttribute('data-ap-removed','true'); }
    S.dirty=true;
  }

  /* Add a new card to the live page by cloning card-0 and re-indexing */
  function addCardToPage(listType){
    /* Find how many cards currently exist (including hidden) */
    var i=0;
    while(document.querySelector('[data-key="'+listType+'.card-'+i+'-title"]')) i++;
    var newIdx=i;

    var sourceEl=document.querySelector('[data-key="'+listType+'.card-0-title"]');
    if(!sourceEl) return newIdx;
    var sourceWrapper=findCardWrapper(sourceEl);
    if(!sourceWrapper) return newIdx;

    var listEl=sourceWrapper.parentElement;
    var clone=sourceWrapper.cloneNode(true);
    /* Update all data-key attrs from card-0 to card-newIdx */
    clone.querySelectorAll('[data-key]').forEach(function(el){
      var oldKey=el.getAttribute('data-key');
      var newKey=oldKey.replace(listType+'.card-0',listType+'.card-'+newIdx);
      el.setAttribute('data-key',newKey);
      el.textContent='New item';
    });
    clone.removeAttribute('data-ap-removed');
    clone.style.display='';
    listEl.appendChild(clone);
    /* Wire in-place handlers to new editable children */
    clone.querySelectorAll('[data-editable]').forEach(function(el){
      el.addEventListener('click',handleInPlace,true);
    });
    S.dirty=true;
    return newIdx;
  }

  /* Remove a bullet from the live page */
  function removeBulletFromPage(key){
    var el=document.querySelector('[data-key="'+key+'"]');
    if(el){ var li=el.closest('li'); if(li) li.remove(); }
    S.dirty=true;
  }

  /* Add a bullet to the live page */
  function addBulletToPage(cardPrefix, newIdx){
    /* Find the ul in the card */
    var anyBullet=document.querySelector('[data-key="'+cardPrefix+'-bullet-0"]');
    if(!anyBullet) return;
    var ul=anyBullet.closest('ul'); if(!ul) return;
    /* Clone last li */
    var lastLi=ul.querySelector('li:last-child'); if(!lastLi) return;
    var clone=lastLi.cloneNode(true);
    var span=clone.querySelector('[data-key]');
    if(span){ span.setAttribute('data-key',cardPrefix+'-bullet-'+newIdx); span.textContent='New bullet'; }
    /* Wire click handler */
    if(span && span.hasAttribute('data-editable')) span.addEventListener('click',handleInPlace,true);
    ul.appendChild(clone);
    S.dirty=true;
  }

  /* ── Bullet fields builder ──────────────────────────────────────*/
  function getBulletEls(cardPrefix){
    var all=[]; var i=0;
    while(true){
      var el=document.querySelector('[data-key="'+cardPrefix+'-bullet-'+i+'"]');
      if(!el) break;
      /* skip if its card wrapper is removed */
      var w=findCardWrapper(el);
      if(w && w.getAttribute('data-ap-removed')==='true'){ i++; continue; }
      all.push({el:el,idx:i}); i++;
    }
    return all;
  }

  function buildBulletFields(cardPrefix){
    var bullets=getBulletEls(cardPrefix);
    if(!bullets.length) return '';
    var html='<label class="ap-lbl">Bullet Points</label>'+
      '<div class="ap-bullets" data-bullet-prefix="'+escH(cardPrefix)+'">';
    bullets.forEach(function(b){
      html+='<div class="ap-bullet-row">'+
        '<input class="ap-inp ap-bullet-inp" type="text" data-tk="'+escH(cardPrefix+'-bullet-'+b.idx)+'" value="'+escH(b.el.textContent||'')+'" placeholder="Bullet item" />'+
        '<button class="ap-rm-bullet" data-bullet-key="'+escH(cardPrefix+'-bullet-'+b.idx)+'" title="Remove">−</button>'+
      '</div>';
    });
    html+='</div><button class="ap-add-bullet ap-add-btn-sm" data-bullet-prefix="'+escH(cardPrefix)+'">+ Add bullet</button>';
    return html;
  }

  /* ── Form: Services ─────────────────────────────────────────────*/
  function buildServicesForms(){
    var cards=[]; var i=0;
    while(true){
      var el=document.querySelector('[data-key="services.card-'+i+'-title"]');
      if(!el) break;
      var w=findCardWrapper(el);
      var removed=w && w.getAttribute('data-ap-removed')==='true';
      cards.push({idx:i,removed:removed}); i++;
    }
    if(!cards.length) return '<p class="ap-empty">No service cards found in DOM.</p>';
    return '<div class="ap-sec-title">Service Cards</div>'+
      cards.map(function(c){
        var idx=c.idx; var prefix='services.card-'+idx;
        var titleEl=document.querySelector('[data-key="'+prefix+'-title"]');
        var subtitleEl=document.querySelector('[data-key="'+prefix+'-subtitle"]');
        var descEl=document.querySelector('[data-key="'+prefix+'-desc"]');
        var sectionEl=document.querySelector('[data-key="'+prefix+'-section"]');
        var noteEl=document.querySelector('[data-key="'+prefix+'-note"]');
        return '<details class="ap-acc'+(c.removed?' ap-acc-removed':'')+'" data-card-idx="'+idx+'" data-list="services">'+
          '<summary class="ap-acc-hd">'+
            (c.removed?'<s>':'')+'Service '+(idx+1)+(c.removed?' (hidden)':'')+(c.removed?'</s>':'')+
            ' <button class="ap-'+(c.removed?'restore':'rm')+'-card-btn ap-icon-btn" data-list="services" data-idx="'+idx+'">'+(c.removed?'↩':'−')+'</button>'+
          '</summary>'+
          (c.removed?'<div class="ap-acc-body"><p class="ap-hint">This card is hidden from the page. Click ↩ to restore it.</p></div>':
          '<div class="ap-acc-body">'+
            fld('Title','text',prefix+'-title',titleEl?titleEl.textContent:'')+
            fld('Subtitle','text',prefix+'-subtitle',subtitleEl?subtitleEl.textContent:'')+
            fldTA('Description',prefix+'-desc',descEl?descEl.textContent:'')+
            fld('Section Label','text',prefix+'-section',sectionEl?sectionEl.textContent:'')+
            fld('Footer Note','text',prefix+'-note',noteEl?noteEl.textContent:'')+
            buildBulletFields(prefix)+
          '</div>')+
        '</details>';
      }).join('')+
      '<button class="ap-add-card-btn ap-add-btn" data-list="services">+ Add Service Card</button>';
  }

  /* ── Form: FAQs ─────────────────────────────────────────────────*/
  function buildFAQForms(){
    var items=[]; var i=0;
    while(true){
      var el=document.querySelector('[data-key="faq.item-'+i+'-q"]'); if(!el) break;
      items.push(i); i++;
    }
    if(!items.length) return '<p class="ap-empty">No FAQ items found in DOM.</p>';
    return '<div class="ap-sec-title">FAQ Items</div>'+
      items.map(function(idx){
        var qEl=document.querySelector('[data-key="faq.item-'+idx+'-q"]');
        var aEl=document.querySelector('[data-key="faq.item-'+idx+'-a"]');
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">Question '+(idx+1)+'</summary>'+
          '<div class="ap-acc-body">'+
            fld('Question','text','faq.item-'+idx+'-q',qEl?qEl.textContent:'')+
            fldTA('Answer','faq.item-'+idx+'-a',aEl?aEl.textContent:'')+
          '</div></details>';
      }).join('');
  }

  /* ── Form: Pain Points ──────────────────────────────────────────*/
  function buildAgitateForms(){
    var items=[]; var i=0;
    while(true){
      var el=document.querySelector('[data-key="agitate.card-'+i+'-title"]'); if(!el) break;
      var w=findCardWrapper(el);
      var removed=w && w.getAttribute('data-ap-removed')==='true';
      items.push({idx:i,removed:removed}); i++;
    }
    if(!items.length) return '<p class="ap-empty">No pain point cards found in DOM.</p>';
    return '<div class="ap-sec-title">Pain Point Cards</div>'+
      items.map(function(c){
        var idx=c.idx;
        var titleEl=document.querySelector('[data-key="agitate.card-'+idx+'-title"]');
        var descEl=document.querySelector('[data-key="agitate.card-'+idx+'-desc"]');
        return '<details class="ap-acc'+(c.removed?' ap-acc-removed':'')+'" data-card-idx="'+idx+'" data-list="agitate">'+
          '<summary class="ap-acc-hd">'+
            (c.removed?'<s>':'')+'Pain Point '+(idx+1)+(c.removed?' (hidden)':'')+(c.removed?'</s>':'')+
            ' <button class="ap-'+(c.removed?'restore':'rm')+'-card-btn ap-icon-btn" data-list="agitate" data-idx="'+idx+'">'+(c.removed?'↩':'−')+'</button>'+
          '</summary>'+
          (c.removed?'<div class="ap-acc-body"><p class="ap-hint">Hidden from page. Click ↩ to restore.</p></div>':
          '<div class="ap-acc-body">'+
            fld('Title','text','agitate.card-'+idx+'-title',titleEl?titleEl.textContent:'')+
            fldTA('Description','agitate.card-'+idx+'-desc',descEl?descEl.textContent:'')+
          '</div>')+
        '</details>';
      }).join('')+
      '<button class="ap-add-card-btn ap-add-btn" data-list="agitate">+ Add Pain Point Card</button>';
  }

  /* ── Form: Testimonials ─────────────────────────────────────────*/
  function buildTestimonialForms(){
    var textEls=Array.from(document.querySelectorAll('[data-key^="testimonials.item-"][data-key$="-text"]'));
    if(!textEls.length) return '<p class="ap-empty">No testimonial data-key attributes found.</p>';
    /* Only first set (not the duplicated marquee items) */
    var seen={}; var uniq=textEls.filter(function(el){
      var k=el.getAttribute('data-key'); if(seen[k]) return false; seen[k]=true; return true;
    });
    return '<div class="ap-sec-title">Testimonial Cards</div>'+
      '<p class="ap-hint" style="margin-bottom:8px">Testimonials display in a scrolling marquee.</p>'+
      uniq.map(function(tel,i){
        var tKey=tel.getAttribute('data-key');
        var idxM=tKey.match(/item-(\d+)-/); var idx=idxM?idxM[1]:i;
        var nKey='testimonials.item-'+idx+'-name';
        var sKey='testimonials.item-'+idx+'-source';
        var nEl=document.querySelector('[data-key="'+nKey+'"]');
        var sEl=document.querySelector('[data-key="'+sKey+'"]');
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">Testimonial '+(parseInt(idx)+1)+'</summary>'+
          '<div class="ap-acc-body">'+
            fld('Reviewer Name','text',nKey,nEl?(nEl.textContent||''):'')+ 
            fldTA('Review Text',tKey,tel.textContent||'')+
            (sEl?fld('Source (e.g. Google, Alignable)','text',sKey,sEl.textContent||''):'<p class="ap-hint">Add data-key to source element to enable.</p>')+
          '</div></details>';
      }).join('');
  }

  /* ── Form: Team ─────────────────────────────────────────────────*/
  function buildTeamForms(){
    var nameEls=Array.from(document.querySelectorAll('[data-key^="team.member-"][data-key$="-name"]'));
    if(!nameEls.length) return '<p class="ap-empty">No team data-key attributes found.</p>';
    return '<div class="ap-sec-title">Team Members</div>'+
      nameEls.map(function(nel,i){
        var nKey=nel.getAttribute('data-key');
        var mch=nKey.match(/member-(\d+)-/); var idx=mch?mch[1]:i;
        var tKey='team.member-'+idx+'-title';
        var iKey='team.member-'+idx+'-photo';
        var tel=document.querySelector('[data-key="'+tKey+'"]');
        var imgEl=document.querySelector('[data-editable-image][data-key="'+iKey+'"]');
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">Member '+(parseInt(idx)+1)+'</summary>'+
          '<div class="ap-acc-body">'+
            fld('Name','text',nKey,nel.textContent||'')+
            fld('Title / Role','text',tKey,tel?tel.textContent:'')+
            (imgEl
              ? '<label class="ap-lbl">Photo</label><button class="ap-img-replace-btn ap-add-btn-sm" data-img-key="'+escH(iKey)+'">🖼 Replace Photo</button>'
              : '<p class="ap-hint">Add data-editable-image to the team photo to enable replacement.</p>')+
          '</div></details>';
      }).join('');
  }

  /* ── Form: Nav Links ────────────────────────────────────────────*/
  function buildNavForms(){
    var btns=Array.from(document.querySelectorAll('[data-editable-nav] [data-key]'));
    if(!btns.length) return '<p class="ap-empty">No nav links found. Add data-editable-nav to your &lt;nav&gt;.</p>';
    var sections=getPageSectionIds();
    var snap=readJSON(STORAGE_KEY)||{};
    return '<div class="ap-sec-title">Navigation Links</div>'+
      '<p class="ap-hint" style="margin-bottom:8px">Edit display text and destination for each link. Scroll targets list the page sections.</p>'+
      btns.map(function(btn,i){
        var key=btn.getAttribute('data-key');
        var isCta=key==='nav.cta';
        var label=isCta ? 'Nav button (CTA)' : 'Nav link '+(i+1);
        var saved=snap[key]; if(typeof saved!=='object') saved={};
        var text=saved.text!==undefined?saved.text:(btn.textContent||'').trim();
        var destType=saved.destType||'scroll';
        var destVal=saved.destVal||'';
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">'+escH(label)+'</summary>'+
          '<div class="ap-acc-body">'+
            '<label class="ap-lbl">Display Text</label>'+
            '<input class="ap-inp" type="text" data-nk="'+escH(key)+'" data-nf="text" value="'+escH(text)+'" />'+
            '<label class="ap-lbl">Destination Type</label>'+
            '<select class="ap-inp ap-dest-type" data-nk="'+escH(key)+'" data-nf="destType">'+
              '<option value="scroll"'+(destType==='scroll'?' selected':'')+'>Scroll to section</option>'+
              '<option value="url"'+(destType==='url'?' selected':'')+'>External URL</option>'+
            '</select>'+
            '<div class="ap-dest-scroll-wrap"'+(destType!=='scroll'?' style="display:none"':'')+'>'+
              '<label class="ap-lbl">Scroll target (section)</label>'+
              '<select class="ap-inp ap-sel-contrast" data-nk="'+escH(key)+'" data-nf="destVal">'+
                '<option value="">— choose section —</option>'+
                sections.map(function(sid){
                  return '<option value="'+escH(sid)+'"'+(destVal===sid?' selected':'')+'>'+escH('#'+sid)+'</option>';
                }).join('')+
              '</select>'+
            '</div>'+
            '<div class="ap-dest-url-wrap"'+(destType!=='url'?' style="display:none"':'')+'>'+
              '<label class="ap-lbl">URL</label>'+
              '<input class="ap-inp" type="text" data-nk="'+escH(key)+'" data-nf="destValUrl" placeholder="https://..." value="'+escH(destType==='url'?destVal:'')+'" />'+
            '</div>'+
          '</div></details>';
      }).join('');
  }

  /* ── Form: Contact ──────────────────────────────────────────────*/
  function buildContactForms(){
    var els=Array.from(document.querySelectorAll('[data-editable-contact][data-key]'));
    if(!els.length) return '<p class="ap-empty">No contact elements found.</p>';
    /* Deduplicate by key (same email key appears in contact section + footer) */
    var seen={}; var uniq=els.filter(function(el){
      var k=el.getAttribute('data-key'); if(seen[k]) return false; seen[k]=true; return true;
    });
    var snap=readJSON(STORAGE_KEY)||{};
    return '<div class="ap-sec-title">Contact & Social Links</div>'+
      '<p class="ap-hint" style="margin-bottom:8px">Edit both the visible text and the link destination for each item.</p>'+
      uniq.map(function(el){
        var key=el.getAttribute('data-key');
        var rawLabel=key.split('.').pop().replace(/-/g,' ');
        /* Friendly label */
        var label={'email':'Email address','phone':'Phone number','alignable':'Alignable link','alignable-footer':'Alignable (footer)'}[rawLabel]||rawLabel;
        var saved=snap[key]||{};
        var text=saved.text!==undefined?saved.text:(el.textContent||'').trim();
        var href=saved.href!==undefined?saved.href:(el.getAttribute('href')||el.getAttribute('data-href')||'');
        return '<details class="ap-acc">'+
          '<summary class="ap-acc-hd">'+escH(label.charAt(0).toUpperCase()+label.slice(1))+'</summary>'+
          '<div class="ap-acc-body">'+
            '<label class="ap-lbl">Display Text</label>'+
            '<input class="ap-inp" type="text" data-tk="'+escH(key)+'" data-tf="text" value="'+escH(text)+'" />'+
            '<label class="ap-lbl">Link (tel: / mailto: / https://)</label>'+
            '<input class="ap-inp" type="text" data-tk="'+escH(key)+'" data-tf="href" placeholder="mailto:you@example.com" value="'+escH(href)+'" />'+
          '</div></details>';
      }).join('');
  }

  /* ── Shared field helpers ───────────────────────────────────────*/
  function fld(label,type,key,val){
    return '<label class="ap-lbl">'+escH(label)+'</label>'+
      '<input class="ap-inp" type="'+type+'" data-tk="'+escH(key)+'" value="'+escH(val)+'" />';
  }
  function fldTA(label,key,val){
    return '<label class="ap-lbl">'+escH(label)+'</label>'+
      '<textarea class="ap-inp" data-tk="'+escH(key)+'" rows="3">'+escH(val)+'</textarea>';
  }

  /* ══════════════════════════════════════════════════════════════════
     WIRE FORM INPUTS → live DOM + panel feedback
  ══════════════════════════════════════════════════════════════════ */
  function wireFormInputs(container){
    /* Standard data-tk inputs → update matching DOM elements live */
    container.querySelectorAll('[data-tk]').forEach(function(inp){
      inp.addEventListener('input',function(){
        var key=inp.getAttribute('data-tk');
        var tf=inp.getAttribute('data-tf');
        var val=inp.value;
        S.dirty=true;
        if(tf){
          /* Contact: update text or href */
          var snap=readJSON(STORAGE_KEY)||{};
          if(!snap[key]||typeof snap[key]!=='object') snap[key]={};
          snap[key][tf]=val;
          localStorage.setItem(STORAGE_KEY,JSON.stringify(snap));
          document.querySelectorAll('[data-editable-contact][data-key="'+key+'"]').forEach(function(el){
            if(tf==='text') el.textContent=val;
            if(tf==='href' && el.tagName==='A') el.href=val;
          });
        } else {
          /* Simple key → update all matching elements on page */
          document.querySelectorAll('[data-key="'+key+'"]').forEach(function(el){ el.textContent=val; });
        }
      });
    });

    /* Nav data-nk inputs */
    container.querySelectorAll('[data-nk]').forEach(function(inp){
      inp.addEventListener('input',function(){
        var key=inp.getAttribute('data-nk');
        var nf=inp.getAttribute('data-nf');
        var val=inp.value;
        S.dirty=true;
        var snap=readJSON(STORAGE_KEY)||{};
        if(!snap[key]||typeof snap[key]!=='object') snap[key]={};
        if(nf==='destValUrl') snap[key].destVal=val;
        else snap[key][nf]=val;
        localStorage.setItem(STORAGE_KEY,JSON.stringify(snap));
        if(nf==='text'){
          document.querySelectorAll('[data-editable-nav] [data-key="'+key+'"]').forEach(function(el){ el.textContent=val; });
        }
      });
    });

    /* Nav destination type switcher */
    container.querySelectorAll('.ap-dest-type').forEach(function(sel){
      sel.addEventListener('change',function(){
        var wrap=sel.closest('.ap-acc-body'); if(!wrap) return;
        var sw=wrap.querySelector('.ap-dest-scroll-wrap');
        var uw=wrap.querySelector('.ap-dest-url-wrap');
        if(sel.value==='scroll'){ if(sw) sw.style.display=''; if(uw) uw.style.display='none'; }
        else { if(sw) sw.style.display='none'; if(uw) uw.style.display=''; }
      });
    });

    /* Remove card buttons */
    container.querySelectorAll('.ap-rm-card-btn').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault(); e.stopPropagation();
        var list=btn.getAttribute('data-list');
        var idx=parseInt(btn.getAttribute('data-idx'),10);
        removeCardFromPage(list,idx);
        switchSection(S.panelSection);
      });
    });

    /* Restore card buttons */
    container.querySelectorAll('.ap-restore-card-btn').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault(); e.stopPropagation();
        var list=btn.getAttribute('data-list');
        var idx=parseInt(btn.getAttribute('data-idx'),10);
        var titleEl=document.querySelector('[data-key="'+list+'.card-'+idx+'-title"]');
        if(titleEl){ var w=findCardWrapper(titleEl); if(w){ w.style.display=''; w.removeAttribute('data-ap-removed'); } }
        S.dirty=true;
        switchSection(S.panelSection);
      });
    });

    /* Add card buttons */
    container.querySelectorAll('.ap-add-card-btn').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var list=btn.getAttribute('data-list');
        addCardToPage(list);
        switchSection(S.panelSection);
      });
    });

    /* Remove bullet — also removes from live page */
    container.querySelectorAll('.ap-rm-bullet').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var bkey=btn.getAttribute('data-bullet-key');
        var row=btn.closest('.ap-bullet-row'); if(row) row.remove();
        if(bkey) removeBulletFromPage(bkey);
      });
    });

    /* Add bullet — also adds to live page */
    container.querySelectorAll('.ap-add-bullet').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var prefix=btn.getAttribute('data-bullet-prefix');
        var bulletsWrap=container.querySelector('[data-bullet-prefix="'+prefix+'"]'); if(!bulletsWrap) return;
        var rows=bulletsWrap.querySelectorAll('.ap-bullet-row');
        var nextIdx=rows.length;
        /* Add to live page first */
        addBulletToPage(prefix,nextIdx);
        /* Add form row */
        var row=document.createElement('div'); row.className='ap-bullet-row';
        var newKey=prefix+'-bullet-'+nextIdx;
        row.innerHTML=
          '<input class="ap-inp ap-bullet-inp" type="text" data-tk="'+escH(newKey)+'" value="" placeholder="New bullet" />'+
          '<button class="ap-rm-bullet ap-icon-btn" data-bullet-key="'+escH(newKey)+'" title="Remove">−</button>';
        bulletsWrap.appendChild(row);
        row.querySelector('.ap-inp').addEventListener('input',function(ev){
          document.querySelectorAll('[data-key="'+newKey+'"]').forEach(function(el){ el.textContent=ev.target.value; });
          S.dirty=true;
        });
        row.querySelector('.ap-rm-bullet').addEventListener('click',function(){
          removeBulletFromPage(newKey); row.remove(); S.dirty=true;
        });
      });
    });

    /* Team photo replace */
    container.querySelectorAll('.ap-img-replace-btn').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var imgKey=btn.getAttribute('data-img-key');
        var inp2=document.createElement('input'); inp2.type='file'; inp2.accept='image/*';
        inp2.addEventListener('change',function(){
          var file=inp2.files && inp2.files[0]; if(!file) return;
          var reader=new FileReader();
          reader.onload=function(ev){
            var dataUrl=ev.target.result;
            document.querySelectorAll('[data-editable-image][data-key="'+imgKey+'"]').forEach(function(img){ img.src=dataUrl; });
            localStorage.setItem(IMG_KEY+imgKey,dataUrl);
            S.dirty=true; toast('Photo updated — hit Save to keep it.');
          };
          reader.readAsDataURL(file);
        });
        inp2.click();
      });
    });
  }

  /* ── Draggable panels ─────────────────────────────────────────── */
  function makeDraggable(panel,handle){
    var dr={on:false,sx:0,sy:0,pr:0,pt:0};
    handle.style.cursor='grab';
    handle.addEventListener('mousedown',function(e){
      if(e.target.closest('button')) return;
      dr.on=true; dr.sx=e.clientX; dr.sy=e.clientY;
      var rect=panel.getBoundingClientRect();
      dr.pr=window.innerWidth-rect.right; dr.pt=rect.top;
      panel.style.transition='none'; document.body.style.userSelect='none'; handle.style.cursor='grabbing';
    });
    window.addEventListener('mousemove',function(e){
      if(!dr.on) return;
      var dx=e.clientX-dr.sx, dy=e.clientY-dr.sy;
      panel.style.right=Math.max(0,Math.min(dr.pr-dx,window.innerWidth-80))+'px';
      panel.style.top=Math.max(0,Math.min(dr.pt+dy,window.innerHeight-80))+'px';
      panel.style.left='auto';
    });
    window.addEventListener('mouseup',function(){
      if(dr.on){ dr.on=false; document.body.style.userSelect=''; handle.style.cursor='grab'; }
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     BRAND COLORS MODAL
  ══════════════════════════════════════════════════════════════════ */
  function openColorsModal(){
    var ex=document.getElementById('ap-colors-modal'); if(ex){ ex.remove(); return; }
    var saved=readJSON(COLOR_KEY)||{};
    var root=document.documentElement;
    var modal=document.createElement('div'); modal.id='ap-colors-modal';
    modal.innerHTML=
      '<div class="ap-modal-hd" id="ap-colors-hd">'+
        '<span>🎨 Brand Colors</span>'+
        '<button class="ap-modal-close" id="ap-colors-close">✕</button>'+
      '</div>'+
      '<p class="ap-hint" style="padding:8px 16px 0;font-size:11px">Swatches update the page live. Save to keep.</p>'+
      '<div id="ap-swatches">'+
        BRAND_COLORS.map(function(bc){
          var cur=saved[bc.varName]||root.style.getPropertyValue(bc.varName).trim()||getComputedStyle(root).getPropertyValue(bc.varName).trim()||bc.hex;
          if(!cur||cur[0]!=='#') cur=bc.hex;
          return '<div class="ap-swatch-row">'+
            '<label class="ap-swatch-lbl">'+escH(bc.label)+'</label>'+
            '<div class="ap-swatch-ctrl">'+
              '<input type="color" class="ap-swatch-inp" data-var="'+bc.varName+'" value="'+escH(cur)+'" />'+
              '<span class="ap-swatch-hex">'+escH(cur)+'</span>'+
            '</div></div>';
        }).join('')+
      '</div>'+
      '<div style="padding:10px 16px 14px">'+
        '<button id="ap-colors-save" class="ap-btn-full-primary">Save Colors</button>'+
      '</div>';
    document.body.appendChild(modal);
    makeDraggable(modal,document.getElementById('ap-colors-hd'));
    document.getElementById('ap-colors-close').addEventListener('click',function(){ modal.remove(); });
    modal.querySelectorAll('.ap-swatch-inp').forEach(function(inp){
      inp.addEventListener('input',function(){
        var varName=inp.getAttribute('data-var'); var hex=inp.value;
        root.style.setProperty(varName,hex);
        var bc=BRAND_COLORS.find(function(c){ return c.varName===varName; });
        if(bc && bc.hslVar) root.style.setProperty(bc.hslVar,hexToHSL(hex));
        var row=inp.closest('.ap-swatch-row');
        if(row){ var hl=row.querySelector('.ap-swatch-hex'); if(hl) hl.textContent=hex; }
        S.dirty=true;
      });
    });
    document.getElementById('ap-colors-save').addEventListener('click',function(){
      var toSave={};
      modal.querySelectorAll('.ap-swatch-inp').forEach(function(inp){ toSave[inp.getAttribute('data-var')]=inp.value; });
      localStorage.setItem(COLOR_KEY,JSON.stringify(toSave));
      S.dirty=false; toast('Colors saved'); modal.remove();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     PROMO ELEMENTS
  ══════════════════════════════════════════════════════════════════ */
  var PROMO_STARTER={
    bannerActive:false,
    bannerText:'✦ Summer Learning Series — Register by July 31 for early-bird pricing.',
    bannerLink:'#contact',
    sectionActive:false,
    sectionHeading:'Now Enrolling — Summer Learning Series',
    sectionSub:'Limited spots available. Personalized coaching designed to accelerate results.',
    layout:'cards',
    cards:[
      {title:'GED Intensive Boot Camp',desc:'A focused, hands-on program that takes students from preparation to credential in as little as 6 weeks.',ctaLabel:'Learn More',ctaLink:'#contact'},
      {title:'Leadership & Communication',desc:'Transform your team\u2019s dynamics with our proven 2-day seminar series — now available for summer scheduling.',ctaLabel:'Book a Seminar',ctaLink:'#contact'},
      {title:'Homeschooling Starter Bundle',desc:'Everything families need to start the new school year with confidence \u2014 curriculum planning, pacing guides, and live coaching.',ctaLabel:'Get Started',ctaLink:'#contact'},
    ]
  };

  function injectPromoElements(){
    /* ── Banner: below toolbar (JS positions via updatePageOffsets) ── */
    if(!document.getElementById('ap-promo-banner')){
      var banner=document.createElement('div'); banner.id='ap-promo-banner';
      banner.setAttribute('data-promo-banner',''); banner.setAttribute('data-key','promo.banner');
      banner.style.display='none';
      banner.innerHTML=
        '<div id="ap-promo-banner-inner">'+
          '<span id="ap-promo-banner-text">✦ Special offer — limited time!</span>'+
          '<a id="ap-promo-banner-cta" href="#contact">Learn More</a>'+
        '</div>'+
        '<button id="ap-promo-banner-dismiss" title="Dismiss banner">✕</button>';
      document.body.prepend(banner);
      banner.querySelector('#ap-promo-banner-dismiss').addEventListener('click',function(){
        banner.style.display='none';
        /* Immediately collapse space — no white gap */
        updatePageOffsets();
      });
    }

    /* ── Promo Section: always directly under #hero ── */
    if(!document.getElementById('ap-promo-section')){
      var sec=document.createElement('section'); sec.id='ap-promo-section';
      sec.setAttribute('data-promo-section',''); sec.setAttribute('data-key','promo.section');
      sec.style.display='none';
      sec.innerHTML=
        '<div class="ap-promo-sec-inner">'+
          '<h2 id="ap-promo-sec-heading">Featured Offer</h2>'+
          '<p id="ap-promo-sec-sub">A special opportunity for you.</p>'+
          '<div id="ap-promo-cards"></div>'+
        '</div>';
      var hero=document.getElementById('hero');
      if(hero && hero.parentNode) hero.parentNode.insertBefore(sec,hero.nextSibling);
      else document.body.appendChild(sec);
    }
  }

  function applyPromoData(d){
    var banner=document.getElementById('ap-promo-banner');
    var sec=document.getElementById('ap-promo-section');
    if(banner){
      banner.style.display=d.bannerActive?'':'none';
      var bt=banner.querySelector('#ap-promo-banner-text'); if(bt && d.bannerText) bt.textContent=d.bannerText;
      var bl=banner.querySelector('#ap-promo-banner-cta'); if(bl && d.bannerLink) bl.href=d.bannerLink;
    }
    if(sec){
      sec.style.display=d.sectionActive?'':'none';
      var sh=sec.querySelector('#ap-promo-sec-heading'); if(sh && d.sectionHeading) sh.textContent=d.sectionHeading;
      var ss=sec.querySelector('#ap-promo-sec-sub'); if(ss && d.sectionSub) ss.textContent=d.sectionSub;
      var cards=sec.querySelector('#ap-promo-cards');
      if(cards && d.cards && d.cards.length) renderPromoCards(cards,d.cards,d.layout||'cards');
    }
    updatePageOffsets();
  }

  function renderPromoCards(container,cards,layout){
    if(layout==='hero' && cards[0]){
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
          '</div></div>';
      }).join('');
    }
  }

  /* ── Promo Editor Modal ──────────────────────────────────────────*/
  function openPromoModal(){
    var ex=document.getElementById('ap-promo-modal'); if(ex){ ex.remove(); return; }
    var hasSaved=!!localStorage.getItem(PROMO_KEY);
    var d=hasSaved?(readJSON(PROMO_KEY)||PROMO_STARTER):PROMO_STARTER;
    var modal=document.createElement('div'); modal.id='ap-promo-modal';
    modal.innerHTML=
      '<div class="ap-modal-hd" id="ap-promo-hd">'+
        '<span>✦ Promo Editor</span>'+
        '<div style="display:flex;gap:4px">'+
          '<button id="ap-promo-min" class="ap-modal-close" title="Minimize">–</button>'+
          '<button class="ap-modal-close" id="ap-promo-close" title="Close">✕</button>'+
        '</div>'+
      '</div>'+
      '<div id="ap-promo-body">'+
      '<div class="ap-promo-block">'+
        '<label class="ap-toggle-row"><input type="checkbox" id="ap-promo-ba"'+(d.bannerActive?' checked':'')+' /> Show Promo Banner</label>'+
        '<div class="ap-promo-sub" id="ap-promo-bfields" style="display:'+(d.bannerActive?'':'none')+'">'+
          '<label class="ap-lbl">Banner Text</label><input class="ap-inp" id="ap-promo-btxt" value="'+escH(d.bannerText||'')+'" />'+
          '<label class="ap-lbl">Banner Link / URL</label><input class="ap-inp" id="ap-promo-blnk" value="'+escH(d.bannerLink||'')+'" />'+
        '</div>'+
      '</div>'+
      '<div class="ap-promo-block">'+
        '<label class="ap-toggle-row"><input type="checkbox" id="ap-promo-sa"'+(d.sectionActive?' checked':'')+' /> Show Promo Section (under Hero)</label>'+
        '<div class="ap-promo-sub" id="ap-promo-sfields" style="display:'+(d.sectionActive?'':'none')+'">'+
          '<label class="ap-lbl">Heading</label><input class="ap-inp" id="ap-promo-shd" value="'+escH(d.sectionHeading||'')+'" />'+
          '<label class="ap-lbl">Subtext</label><input class="ap-inp" id="ap-promo-ssub" value="'+escH(d.sectionSub||'')+'" />'+
          '<label class="ap-lbl">Layout</label>'+
          '<select class="ap-inp" id="ap-promo-layout">'+
            '<option value="cards"'+(d.layout==='cards'?' selected':'')+'>Cards (up to 3)</option>'+
            '<option value="hero"'+(d.layout==='hero'?' selected':'')+'>Hero (single)</option>'+
          '</select>'+
          '<div id="ap-promo-card-editor">'+buildPromoCardEditor(d.cards||[],d.layout||'cards')+'</div>'+
        '</div>'+
      '</div>'+
      '<div style="padding:12px 16px 16px">'+
        '<button id="ap-promo-save" class="ap-btn-full-primary">Save Promo</button>'+
      '</div></div>';
    document.body.appendChild(modal);
    makeDraggable(modal,document.getElementById('ap-promo-hd'));
    document.getElementById('ap-promo-min').addEventListener('click',function(){
      var body=document.getElementById('ap-promo-body'); var btn=document.getElementById('ap-promo-min');
      if(body.style.display==='none'){ body.style.display=''; btn.textContent='–'; }
      else { body.style.display='none'; btn.textContent='□'; }
    });
    document.getElementById('ap-promo-close').addEventListener('click',function(){ modal.remove(); });
    document.getElementById('ap-promo-ba').addEventListener('change',function(e){
      document.getElementById('ap-promo-bfields').style.display=e.target.checked?'':'none';
    });
    document.getElementById('ap-promo-sa').addEventListener('change',function(e){
      document.getElementById('ap-promo-sfields').style.display=e.target.checked?'':'none';
    });
    document.getElementById('ap-promo-layout').addEventListener('change',function(){
      var lyt=document.getElementById('ap-promo-layout').value;
      document.getElementById('ap-promo-card-editor').innerHTML=buildPromoCardEditor(collectPromoCards(),lyt);
      wirePromoButtons();
    });
    wirePromoButtons();
    document.getElementById('ap-promo-save').addEventListener('click',function(){
      var newData={
        bannerActive:document.getElementById('ap-promo-ba').checked,
        bannerText:document.getElementById('ap-promo-btxt').value,
        bannerLink:document.getElementById('ap-promo-blnk').value,
        sectionActive:document.getElementById('ap-promo-sa').checked,
        sectionHeading:document.getElementById('ap-promo-shd').value,
        sectionSub:document.getElementById('ap-promo-ssub').value,
        layout:document.getElementById('ap-promo-layout').value,
        cards:collectPromoCards(),
      };
      localStorage.setItem(PROMO_KEY,JSON.stringify(newData));
      applyPromoData(newData);
      S.dirty=false; toast('Promo saved'); modal.remove();
    });
  }

  function buildPromoCardEditor(cards,layout){
    if(layout==='hero'){
      var c=cards[0]||{};
      return '<div class="ap-promo-card-form" data-ci="0">'+
        '<div class="ap-promo-card-form-title">Hero Card</div>'+
        '<label class="ap-lbl">Headline</label><input class="ap-inp" data-cf="title" value="'+escH(c.title||'')+'" />'+
        '<label class="ap-lbl">Supporting Text</label><textarea class="ap-inp" data-cf="desc" rows="2">'+escH(c.desc||'')+'</textarea>'+
        '<label class="ap-lbl">CTA Label</label><input class="ap-inp" data-cf="ctaLabel" value="'+escH(c.ctaLabel||'')+'" />'+
        '<label class="ap-lbl">CTA Link</label><input class="ap-inp" data-cf="ctaLink" value="'+escH(c.ctaLink||'')+'" />'+
      '</div>';
    }
    var max=3;
    return cards.slice(0,max).map(function(c,i){
      return '<div class="ap-promo-card-form" data-ci="'+i+'">'+
        '<div class="ap-promo-card-form-title">Card '+(i+1)+' <button class="ap-rm-card" data-ri="'+i+'">−</button></div>'+
        '<label class="ap-lbl">Title</label><input class="ap-inp" data-cf="title" value="'+escH(c.title||'')+'" />'+
        '<label class="ap-lbl">Description</label><textarea class="ap-inp" data-cf="desc" rows="2">'+escH(c.desc||'')+'</textarea>'+
        '<label class="ap-lbl">CTA Label</label><input class="ap-inp" data-cf="ctaLabel" value="'+escH(c.ctaLabel||'')+'" />'+
        '<label class="ap-lbl">CTA Link</label><input class="ap-inp" data-cf="ctaLink" value="'+escH(c.ctaLink||'')+'" />'+
      '</div>';
    }).join('')+
    (cards.length<max?'<button id="ap-add-card" class="ap-add-btn">+ Add Card</button>':'<p class="ap-hint" style="padding:4px 0">3 cards max recommended.</p>');
  }

  function collectPromoCards(){
    return Array.from(document.querySelectorAll('.ap-promo-card-form')).map(function(form){
      var card={}; form.querySelectorAll('[data-cf]').forEach(function(inp){ card[inp.getAttribute('data-cf')]=inp.value; }); return card;
    });
  }

  function wirePromoButtons(){
    var addBtn=document.getElementById('ap-add-card');
    if(addBtn){
      addBtn.addEventListener('click',function(){
        var cards=collectPromoCards(); cards.push({title:'New Card',desc:'',ctaLabel:'Learn More',ctaLink:'#contact'});
        document.getElementById('ap-promo-card-editor').innerHTML=buildPromoCardEditor(cards,document.getElementById('ap-promo-layout').value);
        wirePromoButtons();
      });
    }
    document.querySelectorAll('.ap-rm-card').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var idx=parseInt(btn.getAttribute('data-ri'),10);
        var cards=collectPromoCards(); cards.splice(idx,1);
        document.getElementById('ap-promo-card-editor').innerHTML=buildPromoCardEditor(cards,document.getElementById('ap-promo-layout').value);
        wirePromoButtons();
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     PREVIEW
  ══════════════════════════════════════════════════════════════════ */
  function enterPreview(){
    S.previewMode=true; commitActive();
    document.body.classList.add('ap-preview-mode');
    var tb=document.getElementById('ap-toolbar'); if(tb) tb.style.display='none';
    var panel=document.getElementById('ap-panel'); if(panel) panel.style.display='none';
    var cm=document.getElementById('ap-colors-modal'); if(cm) cm.style.display='none';
    var pm=document.getElementById('ap-promo-modal'); if(pm) pm.style.display='none';

    /* Recalculate offsets without toolbar */
    var banner=document.getElementById('ap-promo-banner');
    var bannerH=(banner && banner.style.display!=='none')?(banner.offsetHeight||40):0;
    var hdr=document.querySelector('header');
    document.body.style.paddingTop=bannerH+'px';
    if(hdr) hdr.style.top=bannerH+'px';
    if(banner) banner.style.top='0';

    var bar=document.createElement('div'); bar.id='ap-preview-bar';
    bar.innerHTML='<span>👁 Preview Mode</span><button id="ap-exit-preview">Exit Preview</button>';
    document.body.appendChild(bar);
    document.getElementById('ap-exit-preview').addEventListener('click',function(){
      S.previewMode=false; document.body.classList.remove('ap-preview-mode'); bar.remove();
      var tb2=document.getElementById('ap-toolbar'); if(tb2) tb2.style.display='';
      var p2=document.getElementById('ap-panel'); if(p2) p2.style.display='';
      var cm2=document.getElementById('ap-colors-modal'); if(cm2) cm2.style.display='';
      var pm2=document.getElementById('ap-promo-modal'); if(pm2) pm2.style.display='';
      updatePageOffsets();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════════ */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ setTimeout(init,DELAY); });
  } else {
    setTimeout(init,DELAY);
  }

}());
