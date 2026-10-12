#!/usr/bin/env node
// Validate Config Lab exercises:
//  • jinja: render each solution with our teaching evaluator AND real Jinja2
//    (with ref/source/var/is_incremental stubs matching our semantics); compare
//    whitespace-normalized output. Also assert starter != solution output.
//  • yaml: parse each solution with yaml-mini AND PyYAML; compare structure;
//    evaluate the exercise asserts; confirm the starter does NOT already pass.
//   node tools/validate-config.mjs      (from dbt/)
import { spawnSync } from 'node:child_process';
import { CONFIG_EXERCISES } from '../data/config-exercises.js';
import { render } from '../components/jinja-eval.js';
import { parse as parseYaml } from '../components/yaml-mini.js';

const norm = (s) => s.replace(/\s+/g, ' ').trim();
let fail = 0;
const bad = (id, m) => { fail++; console.log(`  FAIL ${id}  ${m}`); };
const ok = (id, m) => console.log(`  ok   ${id}  ${m}`);

function py(script, env) {
  const r = spawnSync('python3', ['-c', script], { encoding: 'utf8', input: JSON.stringify(env) });
  return { status: r.status, out: (r.stdout||'').trim(), err: (r.stderr||'').trim().split('\n').slice(-2).join(' ') };
}

const PY_JINJA = `
import sys, json
from jinja2 import Environment
e = json.load(sys.stdin)
ctx = e['context']
tschema = (ctx.get('target') or {}).get('schema','analytics')
def ref(*a): return f"{tschema}.{a[-1]}"
def source(a,b): return f"{a}.{b}"
def is_incremental(): return bool(ctx.get('is_incremental'))
def var(name, default=''):
    v = (ctx.get('vars') or {})
    return v[name] if name in v else default
env = Environment()
g = dict(ctx)
g.update(ref=ref, source=source, is_incremental=is_incremental, var=var)
if 'this' not in g: g['this'] = f"{tschema}.this_model"
print(env.from_string(e['template']).render(**g))
`;

const PY_YAML = `
import sys, json, yaml
e = json.load(sys.stdin)
print(json.dumps(yaml.safe_load(e['text'])))
`;

function getPath(obj, path) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let v = obj;
  for (const p of parts) { if (v == null) return undefined; v = v[p]; }
  return v;
}
function passesAsserts(obj, asserts) {
  return asserts.every(a => a.exists ? getPath(obj, a.path) !== undefined
    : JSON.stringify(getPath(obj, a.path)) === JSON.stringify(a.equals));
}

console.log('validate-config — jinja vs Jinja2, yaml vs PyYAML');
console.log('─'.repeat(60));
for (const ex of CONFIG_EXERCISES) {
  if (ex.kind === 'jinja') {
    let allOk = true, distinguishes = false;
    for (const ctx of ex.contexts) {
      let mine, theirs;
      try { mine = render(ex.solution, ctx); }
      catch (err) { bad(ex.id, 'our render threw: ' + err.message); allOk = false; break; }
      const r = py(PY_JINJA, { template: ex.solution, context: ctx });
      if (r.status !== 0) { bad(ex.id, 'Jinja2 threw: ' + r.err); allOk = false; break; }
      theirs = r.out;
      if (norm(mine) !== norm(theirs)) { bad(ex.id, `mismatch vs Jinja2\n    ours:   "${norm(mine)}"\n    jinja2: "${norm(theirs)}"`); allOk = false; break; }
      let starterOut; try { starterOut = render(ex.starter, ctx); } catch { starterOut = '<<err>>'; }
      if (norm(starterOut) !== norm(mine)) distinguishes = true;
    }
    if (allOk && !distinguishes) { bad(ex.id, 'starter already matches solution in every context (not a real exercise)'); allOk = false; }
    if (allOk) ok(ex.id, `jinja matches Jinja2 across ${ex.contexts.length} context(s)`);
  } else {
    let mineObj;
    try { mineObj = parseYaml(ex.solution); }
    catch (err) { bad(ex.id, 'yaml-mini threw: ' + err.message); continue; }
    const r = py(PY_YAML, { text: ex.solution });
    if (r.status !== 0) { bad(ex.id, 'PyYAML threw: ' + r.err); continue; }
    const theirs = JSON.parse(r.out);
    if (JSON.stringify(mineObj) !== JSON.stringify(theirs)) {
      bad(ex.id, `parse mismatch vs PyYAML\n    ours:   ${JSON.stringify(mineObj)}\n    pyyaml: ${JSON.stringify(theirs)}`); continue;
    }
    if (!passesAsserts(mineObj, ex.asserts)) { bad(ex.id, 'solution fails its own asserts'); continue; }
    let starterObj = null; try { starterObj = parseYaml(ex.starter); } catch {}
    if (starterObj && passesAsserts(starterObj, ex.asserts)) { bad(ex.id, 'starter already passes asserts (not a real exercise)'); continue; }
    ok(ex.id, `yaml matches PyYAML; ${ex.asserts.length} asserts hold`);
  }
}
console.log('─'.repeat(60));
console.log(`${CONFIG_EXERCISES.length} exercises, ${fail} failing`);
process.exit(fail ? 1 : 0);
