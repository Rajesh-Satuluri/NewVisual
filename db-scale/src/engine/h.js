/* h.js — tiny hyperscript. The one primitive the whole UI is built on.
   h('div.card', {onclick}, [children])  → HTMLElement
   svg('path', {d, class}, [])           → SVGElement
   Supports 'tag.class1.class2#id' shorthand, event handlers (onX),
   style objects, dataset (data-*), and html:'<raw>' for trusted markup. */

const SVG_NS = 'http://www.w3.org/2000/svg';

function build(ns, sel, props, kids) {
  // sel: 'div.a.b#id' | 'div'
  let tag = 'div', cls = [], id = null;
  const m = String(sel).match(/^([a-zA-Z0-9]+)?([.#][^]*)?$/);
  if (m) {
    tag = m[1] || 'div';
    const rest = m[2] || '';
    rest.replace(/([.#])([a-zA-Z0-9_-]+)/g, (_, k, v) => {
      if (k === '.') cls.push(v); else id = v; return '';
    });
  } else tag = sel;

  const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  if (cls.length) el.setAttribute('class', cls.join(' '));
  if (id) el.id = id;

  if (props && (Array.isArray(props) || props instanceof Node || typeof props === 'string')) {
    kids = props; props = null;
  }
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') {
        const extra = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
        el.setAttribute('class', [...cls, extra].filter(Boolean).join(' '));
      } else if (k === 'html') {
        el.innerHTML = v;                       // trusted markup only (authored content)
      } else if (k === 'text') {
        el.textContent = v;
      } else if (k === 'style' && typeof v === 'object') {
        for (const s in v) el.style.setProperty(s.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), v[s]);
      } else if (k === 'dataset' && typeof v === 'object') {
        for (const d in v) el.dataset[d] = v[d];
      } else if (/^on[A-Z]/.test(k)) {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k in el && !ns) {
        try { el[k] = v; } catch { el.setAttribute(k, v); }
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  appendKids(el, kids);
  return el;
}

function appendKids(el, kids) {
  if (kids == null) return;
  if (Array.isArray(kids)) { kids.forEach(k => appendKids(el, k)); return; }
  if (kids instanceof Node) { el.appendChild(kids); return; }
  el.appendChild(document.createTextNode(String(kids)));
}

export const h = (sel, props, kids) => build(null, sel, props, kids);
export const svg = (sel, props, kids) => build(SVG_NS, sel, props, kids);
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (host, node) => { clear(host).appendChild(node); return node; };
