/* ============================================================
   Verified chip  (Phase 0 / F0.3)

   A small, reusable provenance badge rendered next to content:
   "✓ Verified · <date> · <source>". It reads the central content-meta
   registry (TV.ContentMeta, js/data/_meta.js), so one re-date of a bank
   updates every chip. A bank (or record) whose review date has gone
   past the staleness window renders in a muted "review due" state
   instead — honest signalling rather than a false "fresh" claim.

   The app renders modules as HTML strings (innerHTML), so the primary
   API returns a string:

       TV.VerifiedChip.html('aws-services', service)   // record optional

   `el()` returns a DOM node for the few imperative call sites.

   Design: self-contained, theme-token driven, no external deps. Safe
   when ContentMeta is missing (renders nothing rather than throwing).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // "2026-10-06" -> "6 Oct 2026"
  function prettyDate(iso) {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
  }

  const ICON_OK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3.1 4.7-3.6 4.2a.8.8 0 0 1-1.16.06L4.3 8.6a.75.75 0 1 1 1.02-1.1l1.46 1.35 3.1-3.63a.75.75 0 1 1 1.22.88Z"/></svg>';
  const ICON_STALE = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .4.66l2.4 1.3a.75.75 0 1 0 .7-1.32L8.75 7.8V4.75Z"/></svg>';

  const API = {
    /* Returns an HTML string, or '' when no meta is available. */
    html(bankId, record, opts) {
      opts = opts || {};
      const CM = TV.ContentMeta;
      if (!CM || !CM.resolve) return '';
      const m = CM.resolve(bankId, record);
      if (!m || !m.lastReviewed) return '';

      const stale = m.stale;
      const icon = stale ? ICON_STALE : ICON_OK;
      const label = stale ? 'Review due' : 'Verified';
      const date = prettyDate(m.lastReviewed);
      const srcShort = m.source ? (m.source.length > 46 ? m.source.slice(0, 44) + '…' : m.source) : '';
      const showSource = opts.source !== false && srcShort;

      const title = [
        `${label} ${date}`,
        m.source ? 'Source: ' + m.source : '',
        m.ageDays != null ? `Reviewed ${m.ageDays} day(s) ago` : '',
        stale ? `Past the ${CM.STALE_AFTER_DAYS}-day review window — facts may have changed.` : '',
      ].filter(Boolean).join(' — ');

      return (
        `<span class="vchip${stale ? ' vchip-stale' : ''}" title="${esc(title)}" ` +
        `role="note" aria-label="${esc(label + ' ' + date + (m.source ? ', source ' + m.source : ''))}">` +
        `<span class="vchip-ic">${icon}</span>` +
        `<span class="vchip-lbl">${esc(label)}</span>` +
        `<span class="vchip-date">${esc(date)}</span>` +
        (showSource ? `<span class="vchip-sep" aria-hidden="true">·</span><span class="vchip-src">${esc(srcShort)}</span>` : '') +
        `</span>`
      );
    },

    /* DOM-node variant for imperative call sites. */
    el(bankId, record, opts) {
      const wrap = document.createElement('span');
      wrap.innerHTML = this.html(bankId, record, opts);
      return wrap.firstElementChild;
    },
  };

  TV.VerifiedChip = API;
})();
