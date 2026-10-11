/* Unit tests for the visualizer framework (TV.Viz) + Spark spec.
   Runs under a minimal DOM shim — no browser required. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };

// Minimal DOM shim sufficient for viz-framework.player().
function makeEl() {
  const el = {
    _cls: new Set(), children: [], style: {}, attrs: {}, _html: '', _text: '', _listeners: {},
    set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return [...this._cls].join(' '); },
    classList: {
      add: (...c) => c.forEach(x => el._cls.add(x)),
      remove: (...c) => c.forEach(x => el._cls.delete(x)),
      toggle: (c, f) => { const on = f == null ? !el._cls.has(c) : f; if (on) el._cls.add(c); else el._cls.delete(c); return on; },
      contains: c => el._cls.has(c),
    },
    set innerHTML(v) { el._html = v; },
    get innerHTML() { return el._html; },
    set textContent(v) { el._text = v; },
    get textContent() { return el._text; },
    setAttribute: (k, v) => { el.attrs[k] = v; },
    getAttribute: k => (k in el.attrs ? el.attrs[k] : null),
    appendChild: c => { el.children.push(c); return c; },
    addEventListener: (ev, fn) => { (el._listeners[ev] = el._listeners[ev] || []).push(fn); },
    _fire: ev => (el._listeners[ev] || []).forEach(f => f({})),
    querySelector: sel => el._find(sel, false),
    querySelectorAll: sel => el._find(sel, true),
    _registry: [],
    _find(sel, all) {
      // very small selector engine: class ".x" or [data-viz="y"]
      const match = node => {
        if (sel.startsWith('.')) return node._cls && node._cls.has(sel.slice(1));
        const m = sel.match(/\[([\w-]+)="?([^"\]]+)"?\]/);
        if (m) return node.getAttribute && node.getAttribute(m[1]) === m[2];
        return false;
      };
      const out = [];
      const walk = n => { if (n !== el && match(n)) out.push(n); (n.children || []).forEach(walk); };
      walk(el);
      return all ? out : (out[0] || null);
    },
  };
  return el;
}

const created = [];
const document = {
  getElementById: () => null,
  createElement: () => { const e = makeEl(); created.push(e); return e; },
  head: makeEl(),
  querySelector: () => null,
};
const sandbox = {
  window: { TableViz: { registerModule() {}, registerFormat() {}, formats: {} }, matchMedia: () => ({ matches: false }) },
  document, console,
  setInterval: () => 1, clearInterval: () => {},
  requestAnimationFrame: fn => fn(),
};
sandbox.window.document = document;
vm.createContext(sandbox);

function load(f) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox); }
load('js/features/viz-framework.js');
['viz-spark', 'viz-delta', 'viz-pipeline', 'viz-storage'].forEach(f => load('js/data/' + f + '.js'));

const TV = sandbox.window.TableViz;

ok(TV.Viz && typeof TV.Viz.player === 'function', 'TV.Viz.player exported');
ok(typeof TV.Viz.register === 'function', 'TV.Viz.register exported');
ok(TV.Viz.list().length === 4, 'four visualizers registered (got ' + TV.Viz.list().length + ')');

// every registered visualizer is well-formed
TV.Viz.list().forEach(v => {
  ok(v.id && v.title && v.subtitle, v.id + ' has id/title/subtitle');
  ok(Array.isArray(v.steps) && v.steps.length >= 4, v.id + ' has >=4 steps');
  ok(v.steps.every(s => s.title && s.caption && s.diagram != null), v.id + ' steps all complete');
  v.steps.forEach((s, idx) => {
    const html = typeof s.diagram === 'function' ? s.diagram({ i: idx, total: v.steps.length }) : s.diagram;
    ok(typeof html === 'string' && html.length > 0, v.id + ' step ' + (idx + 1) + ' renders HTML');
  });
});

const spark = TV.Viz.get('spark-execution');
ok(spark, 'spark-execution registered');
ok(spark.steps.length === 6, 'spark has 6 steps (got ' + (spark && spark.steps.length) + ')');
ok(spark.steps.every(s => s.title && s.caption && s.diagram != null), 'every spark step has title, caption, diagram');

// diagram functions must produce HTML strings
spark.steps.forEach((s, idx) => {
  const html = typeof s.diagram === 'function' ? s.diagram({ i: idx, total: 6 }) : s.diagram;
  ok(typeof html === 'string' && html.length > 0, 'step ' + (idx + 1) + ' diagram renders to HTML');
});

// disclaimer text is baked into the framework (player stepping/bounds are
// exercised by the Playwright smoke, which needs a real DOM).
const fw = fs.readFileSync(path.join(__dirname, '..', 'js/features/viz-framework.js'), 'utf8');
ok(/Conceptual simulation/.test(fw), 'framework carries a conceptual disclaimer');
ok(/Math\.max\(0, Math\.min\(total - 1, n\)\)/.test(fw), 'go() clamps to valid step range');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
