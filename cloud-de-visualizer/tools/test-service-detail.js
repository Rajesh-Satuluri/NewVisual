/* Unit tests for the Iteration-0 service-detail renderer additions:
   walkthrough[], examples[], troubleshooting[] blocks + depth detection.
   Loads js/modules/_service-detail.js under a window + document shim via vm,
   captures the rendered HTML through a fake container, and asserts the new
   blocks appear and escape correctly. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* Capture modules registered by the renderer so we can drive render(). */
const registered = {};
const TVseed = {
  _services: {},
  registerModule(fmt, desc) { registered[fmt + '/' + desc.id] = desc; },
  registerFormat() {},
};

const elProxy = new Proxy({}, { get() { return () => {}; }, set() { return true; } });
const sandbox = {
  window: { TableViz: TVseed },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => elProxy,
    addEventListener() {},
    head: elProxy, body: elProxy, documentElement: elProxy,
  },
};
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/modules/_service-detail.js'), 'utf8'), sandbox, { filename: '_service-detail.js' });

const TV = sandbox.window.TableViz;
let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error('✗ ' + m); } }

ok(TV.ServiceDetail && TV.ServiceDetail.registerAll, 'ServiceDetail.registerAll exported');

/* A fake container that records innerHTML and offers a no-op querySelectorAll. */
function fakeContainer() {
  return { className: '', _html: '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
           querySelectorAll: () => [] };
}

const svc = {
  id: 'test-svc', name: 'Test Service', category: 'storage',
  tagline: 'A service for testing.',
  what: 'what', why: 'why', how: 'how',
  walkthrough: {
    lead: 'Lifecycle of a representative write.',
    steps: ['Client issues request <with angle>', { h: 'Coordinator', d: 'Routes to a shard.' }],
    note: 'Simplified teaching model.',
  },
  examples: [{
    title: 'Daily batch load', requirement: 'Load clickstream daily',
    input: '10 GB JSON', architecture: 'S3 → Glue → Redshift',
    code: { lang: 'python', text: 'print("hi <b>")' },
    steps: ['Stage', 'Transform', 'Load'],
    output: 'Partitioned table', validation: 'row counts match',
    errorHandling: 'retry with backoff', production: 'alert on lag', cleanup: 'drop temp',
  }],
  troubleshooting: [{
    symptom: 'Queries slow <suddenly>',
    evidence: 'p99 latency 10x',
    causes: ['small files', 'skew'],
    investigation: ['check file sizes', 'inspect query plan'],
    rootCause: 'too many small files',
    remediation: ['compact', 'repartition'],
    validation: 'latency restored',
    prevention: 'auto-compaction',
  }],
  interview: [{ q: 'why?', a: 'because' }],
};

TV.ServiceDetail.registerAll('testfmt', [svc]);
const desc = registered['testfmt/test-svc'];
ok(desc, 'service module registered');
const c = fakeContainer();
desc.render(c);
// Strip the <style> block so CSS comments/selectors don't match content probes.
const bodyOf = h => h.split('</style>').pop();
const html = bodyOf(c.innerHTML);

// walkthrough
ok(/Execution walkthrough/.test(html), 'walkthrough kicker rendered');
ok(/sd-steps/.test(html), 'walkthrough ordered list rendered');
ok(/Coordinator/.test(html), 'walkthrough step heading rendered');
ok(/Simplified teaching model/.test(html), 'walkthrough note rendered');
ok(html.includes('&lt;with angle&gt;'), 'walkthrough step text HTML-escaped');

// examples
ok(/Worked example/.test(html), 'examples kicker rendered');
ok(/Daily batch load/.test(html), 'example title rendered');
ok(/Illustrative/.test(html), 'example illustrative badge rendered by default');
ok(/Expected output/.test(html), 'example output row rendered');
ok(html.includes('print(&quot;hi &lt;b&gt;&quot;)') || html.includes('print("hi &lt;b&gt;")'), 'example code HTML-escaped');
ok(/sd-vlist/.test(html), 'example steps rendered as list');

// troubleshooting
ok(/Troubleshooting/.test(html), 'troubleshooting kicker rendered');
ok(/sd-tb-sym/.test(html), 'troubleshooting symptom rendered');
ok(/Root cause/.test(html), 'troubleshooting root-cause field rendered');
ok(/Prevention/.test(html), 'troubleshooting prevention field rendered');
ok(html.includes('&lt;suddenly&gt;'), 'troubleshooting symptom HTML-escaped');

// depth badge: a service with these fields counts as a deep dive
ok(/Deep dive/.test(html), 'deep-dive badge shown for enriched service');

// a bare service does NOT get the badge or the new blocks
const bare = { id: 'bare', name: 'Bare', category: 'storage', what: 'w', why: 'y', how: 'h' };
TV.ServiceDetail.registerAll('testfmt2', [bare]);
const c2 = fakeContainer();
registered['testfmt2/bare'].render(c2);
const bareBody = bodyOf(c2.innerHTML);
ok(!/Deep dive/.test(bareBody), 'no deep-dive badge on bare service');
ok(!/Execution walkthrough/.test(bareBody), 'no walkthrough block on bare service');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
