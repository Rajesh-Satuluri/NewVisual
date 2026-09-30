/* ============================================================
   Backup & Restore — portable, recoverable local progress.

   100% client-side. Snapshots every key this app stores in
   localStorage to a single JSON file the user can carry to
   another browser or device, and restores it — with a safe,
   confirmed reset. No backend, no account, no network.

   Additive only: injects one topbar button next to
   #theme-toggle and builds its own modal (cloning the existing
   .modal-backdrop / .modal-box pattern). Touches no existing
   selector, module, router, or animation.

   Data source is localStorage alone. Keys are captured
   generically by this app's prefixes (tv- current, iv- legacy,
   iv: UI prefs), so future keys are backed up automatically.
   ============================================================ */
(function () {
  'use strict';

  var TV = (window.TableViz = window.TableViz || window.IcebergViz || {});
  window.IcebergViz = window.IcebergViz || TV;

  /* ── Constants ─────────────────────────────────────────────── */
  var APP = 'open-table-formats';
  var KIND = 'otf-backup';
  var VERSION = 1;
  var PREFIXES = ['tv-', 'iv-', 'iv:'];       // every family this app writes
  var LAST_EXPORT_KEY = 'iv:backup:last-export';

  /* ── localStorage helpers (all guarded) ────────────────────── */
  function matches(key) {
    if (!key) return false;
    for (var i = 0; i < PREFIXES.length; i++) {
      if (key.indexOf(PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function storageAvailable() {
    try {
      var t = '__bk_probe__';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  function collectKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (matches(k)) keys.push(k);
      }
    } catch (e) { /* private mode / disabled */ }
    return keys;
  }

  function collectData() {
    var data = {};
    var keys = collectKeys();
    for (var i = 0; i < keys.length; i++) {
      try {
        var v = localStorage.getItem(keys[i]);
        if (v !== null) data[keys[i]] = v;      // raw strings, as stored
      } catch (e) { /* skip unreadable key */ }
    }
    return data;
  }

  function clearAppKeys() {
    var keys = collectKeys();
    for (var i = 0; i < keys.length; i++) {
      try { localStorage.removeItem(keys[i]); } catch (e) {}
    }
  }

  function stampExport() {
    try { localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString()); } catch (e) {}
  }

  function lastExportLabel() {
    var iso;
    try { iso = localStorage.getItem(LAST_EXPORT_KEY); } catch (e) { iso = null; }
    if (!iso) return 'No backup yet';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'No backup yet';
    return 'Last backup: ' + d.toLocaleString();
  }

  /* ── Backup envelope ───────────────────────────────────────── */
  function buildBackup() {
    return {
      app: APP,
      kind: KIND,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data: collectData()
    };
  }

  function backupJSON() {
    return JSON.stringify(buildBackup(), null, 2);
  }

  function fileName() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'open-table-formats-backup-' +
      d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.json';
  }

  /* Validate a parsed object. Throws Error with a friendly message. */
  function validate(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('That file is not a valid backup.');
    if (obj.kind !== KIND) throw new Error('That file is not an Open Table Formats backup.');
    if (!obj.data || typeof obj.data !== 'object') throw new Error('The backup has no data to restore.');
    return obj;
  }

  /* Write a validated backup's data back. mode: 'merge' | 'replace'. */
  function applyBackup(obj, mode) {
    if (mode === 'replace') clearAppKeys();
    var data = obj.data, wrote = 0;
    for (var key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      if (!matches(key)) continue;                 // never write outside our namespace
      try {
        localStorage.setItem(key, String(data[key]));
        wrote++;
      } catch (e) {
        throw new Error('Storage is full — restore stopped. ' + wrote + ' item(s) were written.');
      }
    }
    return wrote;
  }

  /* ── Toast (reuse the shared notifier; degrade to nothing) ──── */
  function toast(msg, type) {
    try {
      if (TV.toast) TV.toast(msg, { type: type || 'success' });
    } catch (e) {}
  }

  /* ── Download ──────────────────────────────────────────────── */
  function download(text, name, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ── Offline full-tool bundle ──────────────────────────────────
     Snapshots the WHOLE tool — every page, style, script, and the
     current saved state — into one self-contained .html file that
     runs in any browser with no internet and no server.

     It re-fetches this app's own static files (same origin only)
     and inlines them; no external service, no new dependency, just
     fetch + DOMParser + Blob. This app has no runtime fetch/XHR and
     no external fonts/CDN, so the inlined document is fully offline.
     ────────────────────────────────────────────────────────────── */

  // True only for this app's own relative asset paths.
  function isLocalRef(url) {
    if (!url) return false;
    if (/^(https?:)?\/\//i.test(url)) return false;      // absolute / protocol-relative
    if (/^(data:|blob:|mailto:|tel:|javascript:|#)/i.test(url)) return false;
    return true;
  }

  function fetchText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + url + ' (' + r.status + ')');
      return r.text();
    });
  }

  function fetchDataURI(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + url);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(String(fr.result)); };
        fr.onerror = function () { reject(new Error('Could not encode ' + url)); };
        fr.readAsDataURL(blob);
      });
    });
  }

  // A tiny bootstrap that restores the current state into the offline
  // copy — once, on first open — without clobbering later in-copy work.
  function seedScriptText() {
    var json = JSON.stringify(collectData());
    json = json.replace(/</g, '\\u003c');               // never break out of <script>
    return '(function(){try{' +
      'if(localStorage.getItem("iv:offline-seeded"))return;' +
      'var d=' + json + ';' +
      'for(var k in d){if(Object.prototype.hasOwnProperty.call(d,k)){' +
      'try{localStorage.setItem(k,d[k]);}catch(e){}}}' +
      'localStorage.setItem("iv:offline-seeded","1");' +
      '}catch(e){}})();';
  }

  // Inline the favicon as a data URI; drop manifest / other icon links
  // that would 404 next to a lone .html file.
  function inlineIcons(doc) {
    var fav = doc.querySelector('link[rel="icon"][sizes="32x32"]') ||
              doc.querySelector('link[rel="icon"]');
    var favHref = (fav && isLocalRef(fav.getAttribute('href'))) ? fav.getAttribute('href') : null;
    var drop = doc.querySelectorAll('link[rel="manifest"], link[rel="apple-touch-icon"], link[rel="icon"]');
    Array.prototype.forEach.call(drop, function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (!favHref) return Promise.resolve();
    return fetchDataURI(favHref).then(function (uri) {
      var link = doc.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('type', 'image/png');
      link.setAttribute('href', uri);
      (doc.head || doc.getElementsByTagName('head')[0]).appendChild(link);
    })['catch'](function () { /* favicon is cosmetic — ignore */ });
  }

  function buildOfflineDoc() {
    return fetchText('index.html').then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var head = doc.head || doc.getElementsByTagName('head')[0];

      var links = Array.prototype.slice.call(doc.querySelectorAll('link[rel="stylesheet"][href]'))
        .filter(function (l) { return isLocalRef(l.getAttribute('href')); });
      var scripts = Array.prototype.slice.call(doc.querySelectorAll('script[src]'))
        .filter(function (s) { return isLocalRef(s.getAttribute('src')); });

      var cssJobs = links.map(function (l) {
        return fetchText(l.getAttribute('href')).then(function (css) {
          var style = doc.createElement('style');
          if (l.getAttribute('media')) style.setAttribute('media', l.getAttribute('media'));
          style.textContent = css;
          l.parentNode.replaceChild(style, l);
        });
      });
      var jsJobs = scripts.map(function (s) {
        return fetchText(s.getAttribute('src')).then(function (js) { return { node: s, js: js }; });
      });

      return Promise.all(cssJobs)
        .then(function () { return Promise.all(jsJobs); })
        .then(function (results) {
          results.forEach(function (r) {                 // preserve dependency order in place
            var inline = doc.createElement('script');
            inline.textContent = r.js;
            r.node.parentNode.replaceChild(inline, r.node);
          });
          return inlineIcons(doc);
        })
        .then(function () {
          var seed = doc.createElement('script');
          seed.setAttribute('data-otf-seed', '1');
          seed.textContent = seedScriptText();
          var firstScript = head.querySelector('script');   // the no-flash script
          if (firstScript) head.insertBefore(seed, firstScript);
          else head.insertBefore(seed, head.firstChild);
          doc.documentElement.setAttribute('data-otf-offline', '1');
          return doc;
        });
    });
  }

  function offlineFileName() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'open-table-formats-offline-' +
      d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.html';
  }

  var offlineBusy = false;
  function downloadOffline() {
    if (location.protocol === 'file:') {
      toast('You’re already running the offline copy — just duplicate this .html file to share it.', 'warn');
      return;
    }
    if (offlineBusy) return;
    offlineBusy = true;
    toast('Packaging the whole tool… this can take a moment.', 'success');
    buildOfflineDoc().then(function (doc) {
      var out = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
      download(out, offlineFileName(), 'text/html');
      stampExport();
      refreshFooter();
      toast('Offline copy downloaded — open it in any browser, no internet needed.', 'success');
    })['catch'](function (err) {
      toast((err && err.message) || 'Couldn’t build the offline copy.', 'error');
    }).then(function () { offlineBusy = false; }, function () { offlineBusy = false; });
  }

  /* ── Modal construction ────────────────────────────────────── */
  var modal = null, lastFocus = null, resetArmed = false;

  function icon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'width="15" height="15" aria-hidden="true">' + paths + '</svg>';
  }

  function summaryLine() {
    var n = collectKeys().length;
    return n + (n === 1 ? ' item' : ' items') +
      ' · theme, progress, quiz scores, panel sizes & preferences — ' +
      'included in both the offline copy and the data backup. Nothing is uploaded.';
  }

  function buildModal() {
    var wrap = document.createElement('div');
    wrap.id = 'bk-modal';
    wrap.className = 'modal-backdrop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Backup and restore');

    wrap.innerHTML =
      '<div class="modal-box bk-box">' +
        '<div class="modal-title">Backup &amp; Restore</div>' +
        '<button class="modal-close" aria-label="Close backup dialog">✕</button>' +

        // ── Export ──
        '<div class="bk-section">' +
          '<div class="bk-section-title">Export</div>' +
          '<p class="bk-desc"><strong>Download offline copy</strong> saves the entire tool — every page, animation, and your progress — as one <code class="bk-code">.html</code> file that runs in any browser with no internet. <strong>Data only</strong> saves just your saved state, for restoring into another copy.</p>' +
          '<div class="bk-actions">' +
            '<button class="btn btn-primary" data-bk="offline">' +
              icon('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>') +
              'Download offline copy</button>' +
            '<button class="btn btn-secondary" data-bk="download">' +
              icon('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>') +
              'Data only (.json)</button>' +
            '<button class="btn btn-secondary" data-bk="copy">' +
              icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>') +
              'Copy data</button>' +
          '</div>' +
          '<p class="bk-hint">The offline copy is fully self-contained — just open the file, no internet or server needed.</p>' +
        '</div>' +

        // ── Restore ──
        '<div class="bk-section">' +
          '<div class="bk-section-title">Restore</div>' +
          '<p class="bk-desc">Bring progress back from a <strong>data</strong> backup (<code class="bk-code">.json</code>). <strong>Merge</strong> keeps what you have and overwrites matching items; <strong>Replace</strong> clears everything first.</p>' +
          '<div class="bk-modes" role="radiogroup" aria-label="Restore mode">' +
            '<label class="bk-mode"><input type="radio" name="bk-mode" value="merge" checked /> Merge <span class="bk-mode-hint">(default, safe)</span></label>' +
            '<label class="bk-mode"><input type="radio" name="bk-mode" value="replace" /> Replace <span class="bk-mode-hint">(overwrite all)</span></label>' +
          '</div>' +
          '<div class="bk-actions">' +
            '<button class="btn btn-secondary" data-bk="pick">' +
              icon('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>') +
              'Choose backup file…</button>' +
            '<input type="file" accept="application/json,.json" class="bk-file" hidden aria-hidden="true" tabindex="-1" />' +
          '</div>' +
          '<details class="bk-paste-wrap">' +
            '<summary>Or paste backup text</summary>' +
            '<textarea class="bk-paste" rows="4" spellcheck="false" placeholder="Paste the contents of a backup file here…" aria-label="Paste backup JSON"></textarea>' +
            '<div class="bk-actions"><button class="btn btn-secondary" data-bk="paste">Restore from text</button></div>' +
          '</details>' +
        '</div>' +

        // ── Reset ──
        '<div class="bk-section bk-danger-section">' +
          '<div class="bk-section-title">Reset</div>' +
          '<p class="bk-desc">Clear all saved progress on this browser. This can’t be undone.</p>' +
          '<div class="bk-reset-idle">' +
            '<button class="btn btn-danger" data-bk="reset">' +
              icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>') +
              'Reset all progress</button>' +
          '</div>' +
          '<div class="bk-reset-confirm" hidden>' +
            '<p class="bk-confirm-q">Reset everything? This can’t be undone.</p>' +
            '<div class="bk-actions">' +
              '<button class="btn btn-secondary" data-bk="reset-export">Export a backup first</button>' +
              '<button class="btn btn-danger" data-bk="reset-confirm">Yes, reset everything</button>' +
              '<button class="btn btn-ghost" data-bk="reset-cancel">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // ── Footer ──
        '<div class="bk-footer">' +
          '<span class="bk-summary"></span>' +
          '<span class="bk-last badge badge-blue"></span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);
    wireModal(wrap);
    return wrap;
  }

  function refreshFooter() {
    if (!modal) return;
    var s = modal.querySelector('.bk-summary');
    var l = modal.querySelector('.bk-last');
    if (s) s.textContent = summaryLine();
    if (l) l.textContent = lastExportLabel();
  }

  function armReset(on) {
    resetArmed = on;
    if (!modal) return;
    var idle = modal.querySelector('.bk-reset-idle');
    var conf = modal.querySelector('.bk-reset-confirm');
    if (idle) idle.hidden = on;
    if (conf) conf.hidden = !on;
  }

  function currentMode() {
    var checked = modal && modal.querySelector('input[name="bk-mode"]:checked');
    return checked ? checked.value : 'merge';
  }

  function doRestore(text, mode) {
    var obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      toast('That doesn’t look like a valid backup file.', 'error');
      return;
    }
    try {
      validate(obj);
    } catch (e) {
      toast(e.message, 'error');
      return;                                       // existing data untouched
    }
    if (obj.version > VERSION) {
      toast('This backup is from a newer version — restoring what we can.', 'warn');
    }
    var wrote;
    try {
      wrote = applyBackup(obj, mode);
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    toast('Restored ' + wrote + ' item(s). Reloading…', 'success');
    setTimeout(function () { try { location.reload(); } catch (e) {} }, 700);
  }

  function wireModal(wrap) {
    // Close affordances
    wrap.querySelector('.modal-close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    // Focus trap + Esc
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var fileInput = wrap.querySelector('.bk-file');
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { doRestore(String(reader.result || ''), currentMode()); };
      reader.onerror = function () { toast('Couldn’t read that file.', 'error'); };
      reader.readAsText(file);
      fileInput.value = '';                         // allow re-picking same file
    });

    // Action delegation
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-bk]');
      if (!btn) return;
      var act = btn.getAttribute('data-bk');

      if (act === 'offline') {
        downloadOffline();

      } else if (act === 'download') {
        try { download(backupJSON(), fileName()); stampExport(); refreshFooter(); toast('Data backup downloaded.', 'success'); }
        catch (err) { toast('Couldn’t create the backup file.', 'error'); }

      } else if (act === 'copy') {
        var json = backupJSON();
        var done = function () { stampExport(); refreshFooter(); toast('Backup copied to clipboard.', 'success'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).then(done, function () { legacyCopy(json, done); });
        } else { legacyCopy(json, done); }

      } else if (act === 'pick') {
        fileInput.click();

      } else if (act === 'paste') {
        var ta = wrap.querySelector('.bk-paste');
        var text = ta && ta.value.trim();
        if (!text) { toast('Paste a backup first.', 'warn'); return; }
        doRestore(text, currentMode());

      } else if (act === 'reset') {
        armReset(true);

      } else if (act === 'reset-cancel') {
        armReset(false);

      } else if (act === 'reset-export') {
        try { download(backupJSON(), fileName()); stampExport(); refreshFooter(); toast('Backup downloaded — now safe to reset.', 'success'); }
        catch (err) { toast('Couldn’t create the backup file.', 'error'); }

      } else if (act === 'reset-confirm') {
        clearAppKeys();
        armReset(false);
        toast('All progress cleared. Reloading…', 'success');
        setTimeout(function () { try { location.reload(); } catch (e) {} }, 700);
      }
    });
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) {
      toast('Couldn’t copy — try Download instead.', 'error');
    }
  }

  function focusable() {
    if (!modal) return [];
    var sel = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.filter.call(modal.querySelectorAll(sel), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function open() {
    if (!storageAvailable()) {
      toast('Storage isn’t available in this browser (private mode?). Backup can’t run here.', 'error');
      return;
    }
    if (!modal) modal = buildModal();
    lastFocus = document.activeElement;
    armReset(false);
    refreshFooter();
    modal.classList.add('visible');
    var f = focusable();
    if (f.length) f[0].focus();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('visible');
    armReset(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  TV._openBackup = open;

  /* ── Topbar button ─────────────────────────────────────────── */
  function mountButton() {
    var themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn || !themeBtn.parentNode) return;
    if (document.getElementById('bk-open')) return;

    var btn = document.createElement('button');
    btn.id = 'bk-open';
    btn.className = 'btn-icon';
    btn.type = 'button';
    btn.title = 'Download offline copy · backup & restore';
    btn.setAttribute('data-tooltip', 'Download offline copy · backup');
    btn.setAttribute('aria-label', 'Download an offline copy of the whole tool, or back up and restore your progress');
    btn.innerHTML = icon(
      '<path d="M21 8v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8"/>' +
      '<rect x="1" y="3" width="22" height="5" rx="1"/>' +
      '<line x1="10" y1="12" x2="14" y2="12"/>'
    );
    btn.addEventListener('click', open);
    themeBtn.parentNode.insertBefore(btn, themeBtn);
  }

  function init() { mountButton(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
