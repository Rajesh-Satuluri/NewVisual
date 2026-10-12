// ─────────────────────────────────────────────────────────────────────────────
// jinja-eval — a TEACHING Jinja evaluator (pure JS, no dependencies).
//
// It renders the common Jinja constructs learners meet in dbt models so they can
// write, run and debug templates in the browser. It is explicitly NOT dbt's real
// Jinja/Python runtime — the Config Lab labels every result "Simulated — teaching
// evaluator". ref()/source() resolve to illustrative relation names, and
// is_incremental()/var()/target come from the supplied context.
//
// Supports: {{ expr }}, {% if/elif/else/endif %}, {% for x in seq %}{% endfor %}
// (with loop.index/first/last), {% set x = expr %}, filters (upper, lower, trim,
// default, replace, length, join), operators (== != < > <= >= and or not in + - *),
// literals, dotted access, and the dbt helpers ref/source/var/is_incremental.
// Whitespace control: {%- -%} and {{- -}}.
// ─────────────────────────────────────────────────────────────────────────────

export class JinjaError extends Error { constructor(m) { super(m); this.name = 'JinjaError'; } }

// ── Expression evaluator (recursive descent) ────────────────────────────────
function evalExpr(src, ctx) {
  let i = 0;
  const s = src;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const peek = () => { ws(); return s[i]; };

  function parsePrimary() {
    ws();
    const c = s[i];
    if (c === '(') { i++; const v = parseOr(); ws(); if (s[i] === ')') i++; return v; }
    if (c === "'" || c === '"') { // string literal
      const q = c; i++; let out = '';
      while (i < s.length && s[i] !== q) { out += s[i++]; }
      i++; return out;
    }
    if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(s[i + 1]))) {
      let j = i; if (s[i] === '-') i++;
      while (i < s.length && /[0-9.]/.test(s[i])) i++;
      return parseFloat(s.slice(j, i));
    }
    // identifier / keyword / function call / dotted
    let j = i;
    while (i < s.length && /[A-Za-z0-9_.]/.test(s[i])) i++;
    let name = s.slice(j, i);
    if (name === '') throw new JinjaError(`Cannot parse expression near "${s.slice(i, i + 12)}"`);
    if (name === 'true' || name === 'True') return true;
    if (name === 'false' || name === 'False') return false;
    if (name === 'none' || name === 'None' || name === 'null') return null;
    ws();
    if (s[i] === '(') { // function call
      i++; const args = [];
      ws();
      if (s[i] !== ')') { args.push(parseOr()); ws(); while (s[i] === ',') { i++; args.push(parseOr()); ws(); } }
      if (s[i] === ')') i++;
      return callFn(name, args, ctx);
    }
    return lookup(name, ctx);
  }

  function applyFilters(val) {
    ws();
    while (s[i] === '|') {
      i++; ws();
      let j = i; while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++;
      const fname = s.slice(j, i);
      let args = [];
      ws();
      if (s[i] === '(') { i++; ws(); if (s[i] !== ')') { args.push(parseOr()); ws(); while (s[i] === ',') { i++; args.push(parseOr()); ws(); } } if (s[i] === ')') i++; }
      val = applyFilter(fname, val, args);
      ws();
    }
    return val;
  }

  function parseUnary() {
    ws();
    if (s.startsWith('not ', i)) { i += 4; return !truthy(parseUnary()); }
    return applyFilters(parsePrimary());
  }

  function parseAdd() {
    let left = parseUnary();
    ws();
    while (s[i] === '+' || (s[i] === '-' && s[i+1] === ' ') || s[i] === '*') {
      const op = s[i]; i++;
      const right = parseUnary();
      if (op === '+') left = (typeof left === 'number' && typeof right === 'number') ? left + right : String(left) + String(right);
      else if (op === '-') left = left - right;
      else left = left * right;
      ws();
    }
    return left;
  }

  function parseCmp() {
    let left = parseAdd();
    ws();
    for (const op of ['==', '!=', '>=', '<=', '>', '<']) {
      if (s.startsWith(op, i)) { i += op.length; const right = parseAdd();
        switch (op) { case '==': return left == right; case '!=': return left != right;
          case '>=': return left >= right; case '<=': return left <= right;
          case '>': return left > right; case '<': return left < right; } }
    }
    if (s.startsWith('in ', i)) { i += 3; const right = parseAdd(); return Array.isArray(right) ? right.includes(left) : String(right).includes(left); }
    return left;
  }

  function parseAnd() { let l = parseCmp(); ws(); while (s.startsWith('and ', i)) { i += 4; const r = parseCmp(); l = truthy(l) && truthy(r); ws(); } return l; }
  function parseOr() { let l = parseAnd(); ws(); while (s.startsWith('or ', i)) { i += 3; const r = parseAnd(); l = truthy(l) || truthy(r); ws(); } return l; }

  const result = parseOr();
  return result;
}

function truthy(v) { return !(v == null || v === false || v === '' || v === 0 || (Array.isArray(v) && v.length === 0)); }

function lookup(name, ctx) {
  const parts = name.split('.');
  let v = ctx;
  for (const p of parts) { if (v == null) return undefined; v = v[p]; }
  return v;
}

function callFn(name, args, ctx) {
  switch (name) {
    case 'ref': return `${ctx.target?.schema || 'analytics'}.${args[args.length - 1]}`;
    case 'source': return `${args[0]}.${args[1]}`;
    case 'is_incremental': return !!ctx.is_incremental;
    case 'var': return (ctx.vars && args[0] in ctx.vars) ? ctx.vars[args[0]] : (args[1] ?? '');
    case 'range': { const [a, b] = args.length > 1 ? args : [0, args[0]]; const out = []; for (let k = a; k < b; k++) out.push(k); return out; }
    default: { const fn = lookup(name, ctx); if (typeof fn === 'function') return fn(...args); throw new JinjaError(`Unknown function ${name}()`); }
  }
}

function applyFilter(name, val, args) {
  switch (name) {
    case 'upper': return String(val).toUpperCase();
    case 'lower': return String(val).toLowerCase();
    case 'trim': return String(val).trim();
    case 'length': case 'count': return (val?.length ?? 0);
    case 'default': return (val == null || val === '') ? args[0] : val;
    case 'replace': return String(val).split(args[0]).join(args[1]);
    case 'join': return (val || []).join(args[0] ?? '');
    case 'capitalize': { const t = String(val); return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); }
    default: throw new JinjaError(`Unknown filter |${name}`);
  }
}

// ── Template renderer ────────────────────────────────────────────────────────
export function render(template, context = {}) {
  const ctx = { target: { schema: 'analytics', name: 'prod' }, is_incremental: false, vars: {}, ...context };
  if (ctx.this == null) ctx.this = `${ctx.target.schema}.this_model`;
  // Tokenize into text / {{ }} / {% %}
  const re = /\{\{-?\s*([\s\S]*?)\s*-?\}\}|\{%-?\s*([\s\S]*?)\s*-?%\}/g;
  const toks = []; let last = 0, m;
  while ((m = re.exec(template))) {
    if (m.index > last) toks.push({ t: 'text', v: template.slice(last, m.index), lws: false, rws: false });
    const trimL = m[0].startsWith('{{-') || m[0].startsWith('{%-');
    const trimR = m[0].endsWith('-}}') || m[0].endsWith('-%}');
    if (m[1] != null) toks.push({ t: 'out', v: m[1], lws: trimL, rws: trimR });
    else toks.push({ t: 'tag', v: m[2].trim(), lws: trimL, rws: trimR });
    last = re.lastIndex;
  }
  if (last < template.length) toks.push({ t: 'text', v: template.slice(last), lws: false, rws: false });

  let p = 0;
  function renderUntil(stoppers) {
    let out = '';
    while (p < toks.length) {
      const tok = toks[p];
      if (tok.t === 'tag') {
        const kw = tok.v.split(/\s+/)[0];
        if (stoppers.includes(kw)) return out;
        p++;
        if (kw === 'if') out += renderIf(tok.v.slice(2).trim());
        else if (kw === 'for') out += renderFor(tok.v.slice(3).trim());
        else if (kw === 'set') { const eq = tok.v.indexOf('='); const nm = tok.v.slice(3, eq).trim(); ctx[nm] = evalExpr(tok.v.slice(eq + 1).trim(), ctx); }
        else throw new JinjaError(`Unsupported tag {% ${kw} %}`);
      } else if (tok.t === 'out') {
        p++; const v = evalExpr(tok.v, ctx); out += v == null ? '' : String(v);
      } else { p++; out += tok.v; }
      // whitespace control: if this tok requested rws, trim leading ws of next text
      if (tok.rws && toks[p] && toks[p].t === 'text') toks[p] = { ...toks[p], v: toks[p].v.replace(/^\s+/, '') };
      if (toks[p] && toks[p].lws && out) out = out.replace(/\s+$/, '');
    }
    return out;
  }
  function renderIf(cond) {
    const branches = [{ cond, body: null }];
    let chosen = null;
    let bodyStart = p;
    // We render by scanning: collect body for current branch until elif/else/endif
    let out = '';
    let taken = truthy(evalExpr(cond, ctx));
    let captured = renderUntil(['elif', 'else', 'endif']);
    if (taken) out = captured;
    while (p < toks.length && toks[p].t === 'tag' && toks[p].v.split(/\s+/)[0] === 'elif') {
      const c = toks[p].v.slice(4).trim(); p++;
      const cap = renderUntil(['elif', 'else', 'endif']);
      if (!taken && truthy(evalExpr(c, ctx))) { out = cap; taken = true; }
    }
    if (p < toks.length && toks[p].t === 'tag' && toks[p].v.split(/\s+/)[0] === 'else') {
      p++; const cap = renderUntil(['endif']); if (!taken) out = cap;
    }
    if (p < toks.length && toks[p].t === 'tag' && toks[p].v.split(/\s+/)[0] === 'endif') p++;
    else throw new JinjaError('Missing {% endif %}');
    return out;
  }
  function renderFor(spec) {
    const m2 = spec.match(/^(\w+)\s+in\s+([\s\S]+)$/);
    if (!m2) throw new JinjaError(`Bad for-loop: ${spec}`);
    const varName = m2[1];
    const seq = evalExpr(m2[2].trim(), ctx);
    const list = Array.isArray(seq) ? seq : [];
    const bodyStart = p;
    let out = '';
    const prevLoop = ctx.loop, prevVar = ctx[varName];
    list.forEach((item, idx) => {
      p = bodyStart;
      ctx[varName] = item;
      ctx.loop = { index: idx + 1, index0: idx, first: idx === 0, last: idx === list.length - 1, length: list.length };
      out += renderUntil(['endfor']);
    });
    if (list.length === 0) { p = bodyStart; renderUntil(['endfor']); } // consume body
    ctx.loop = prevLoop; ctx[varName] = prevVar;
    if (p < toks.length && toks[p].t === 'tag' && toks[p].v.split(/\s+/)[0] === 'endfor') p++;
    else throw new JinjaError('Missing {% endfor %}');
    return out;
  }

  return renderUntil([]);
}
