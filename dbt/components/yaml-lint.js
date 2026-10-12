// yaml-lint — parse YAML for the Config Lab. Prefers the full js-yaml build from
// a CDN (real YAML 1.2) and falls back to the bundled yaml-mini parser (a tested
// subset, validated against PyYAML) when the CDN is unavailable. Either way this
// is a genuine parse, labeled "Static validation (real YAML parse)" in the UI.
import { parse as miniParse, YamlError } from './yaml-mini.js';

const CDN = ['https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm'];
let _jsyaml = null, _tried = false;

async function tryLoad() {
  if (_tried) return _jsyaml;
  _tried = true;
  for (const url of CDN) {
    try { const mod = await import(/* @vite-ignore */ url); _jsyaml = mod.default || mod; return _jsyaml; }
    catch { /* fall through to mini */ }
  }
  return null;
}

// Resolve { ok, data } or { ok:false, error, line }. Never throws.
export async function parseYaml(text) {
  const js = await tryLoad();
  if (js) {
    try { return { ok: true, data: js.load(text), engine: 'js-yaml' }; }
    catch (e) { return { ok: false, error: e.reason || e.message, line: e.mark?.line != null ? e.mark.line + 1 : undefined, engine: 'js-yaml' }; }
  }
  try { return { ok: true, data: miniParse(text), engine: 'yaml-mini' }; }
  catch (e) { return { ok: false, error: e.message, line: e.line, engine: 'yaml-mini' }; }
}

// Dotted path with [i] indices, e.g. "models[0].config.+materialized".
export function getPath(obj, path) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let v = obj;
  for (const p of parts) { if (v == null) return undefined; v = v[p]; }
  return v;
}

export function checkAsserts(obj, asserts) {
  return asserts.map(a => {
    const actual = getPath(obj, a.path);
    const pass = a.exists ? actual !== undefined : JSON.stringify(actual) === JSON.stringify(a.equals);
    return { ...a, actual, pass };
  });
}
