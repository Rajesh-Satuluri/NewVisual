/* Unit tests for TV.DS pure helpers (js/core/ds.js). DOM-dependent
   helpers (modal/drawer/confirm) are smoke-tested in the browser;
   here we verify esc/ring/skeleton output and HTML-escaping. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, document: { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, select() {}, remove() {} }), querySelector: () => null, body: { appendChild() {} }, execCommand() {} }, navigator: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/core/ds.js'), 'utf8'), sandbox, { filename: 'ds.js' });
const DS = sandbox.window.TableViz.DS;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }

ok(DS, 'TV.DS defined');
ok(DS.esc('<a>&"\'') === '&lt;a&gt;&amp;&quot;&#39;', 'esc escapes all five chars');
ok(DS.esc(null) === '' && DS.esc(undefined) === '', 'esc handles null/undefined');
ok(/--v:73/.test(DS.ring(73)), 'ring sets --v to clamped value');
ok(/--v:100/.test(DS.ring(250)), 'ring clamps >100');
ok(/--v:0/.test(DS.ring(-5)), 'ring clamps <0');
ok(DS.ring(50, '<x>').indexOf('&lt;x&gt;') !== -1, 'ring escapes its label');
ok(DS.skeleton('40%', '20px').indexOf('width:40%') !== -1, 'skeleton honors width');
ok(DS.skeleton().indexOf('ds-skel') !== -1, 'skeleton has ds-skel class');
ok(typeof DS.modal === 'function' && typeof DS.confirm === 'function' && typeof DS.wireCopy === 'function', 'imperative helpers exported');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
