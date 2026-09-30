/* ============================================================
   SVG helpers — tiny string-builder shared by diagram modules.
   Keeps programmatic SVG readable without a template engine.
   ============================================================ */

(function () {
  'use strict';

  /** Escape text for safe embedding inside SVG/HTML text nodes. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Build an element string.
   * @param {string} name              tag name (rect, text, g, svg, div…)
   * @param {Object} [attrs]           attribute map; null/false/undefined skipped
   * @param {string|Array} [children]  inner markup (array is joined)
   */
  function el(name, attrs, children) {
    let a = '';
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        a += ' ' + k + '="' + v + '"';
      }
    }
    const inner = Array.isArray(children)
      ? children.join('')
      : (children == null ? '' : children);
    return inner === ''
      ? '<' + name + a + '/>'
      : '<' + name + a + '>' + inner + '</' + name + '>';
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.SVG = { el: el, esc: esc };
})();
