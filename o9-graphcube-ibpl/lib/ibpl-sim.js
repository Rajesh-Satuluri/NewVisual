// ─────────────────────────────────────────────────────────────────────────
// ibpl-sim.js — a DETERMINISTIC simulator for a DOCUMENTED SUBSET of IBPL.
//
// This is NOT the o9 engine. It parses and evaluates a small, clearly-bounded
// slice of IBPL over an in-memory, row-based ("sparse intersection") dataset so
// learners can predict/verify output. Every caller must label results as
// "Simulated — documented subset", never as real o9 execution.
//
// SUPPORTED (reliable):
//   • Select( <grain levels joined by *> * { Measure sets } )
//       where { Version + member .filter(...) }  orderby <measure> [desc|asc]  limit N
//   • Transient columns:  <expr> as Transient.X
//   • Expressions: + - * / , parentheses, numbers, strings,
//       coalesce(a,b), SafeDivide(a,b), abs(x),
//       comparisons == != > < >= <= , && || , if <c> then <a> else <b>
//   • scope: ( <members> ) ; Measure.[X] = <expr> ; ... end scope;   (regular scope)
//   • @ read-at with Time.#.LeadOffset(n)  (per-series time shift)
//   • DistributeToLeaves(aggValue, {basis...})  — proportional split helper
//
// NOT supported (exercises stay predict/explain, labelled): graph edges,
// recurrence seeding, cartesian/evaluatemember/spread scopes, access control,
// createmember/deletemember, full member-property projection.
// ─────────────────────────────────────────────────────────────────────────

/* ============================ SAMPLE DATASETS ============================ */
// Grounded in the CAT aftermarket-parts tenant. Rows are populated intersections.

function catForecast() {
  // Item (Brand → SKU) × LogisticsCenter × Time(Week) × Version
  const mk = (Brand, SKU, LC, Week, idx, m) => ({
    Version: { Key: 0, Name: 'CurrentWorkingView' },
    Item: { Brand, SKU },
    LogisticsCenter: { Name: LC },
    Time: { Week, idx },
    measures: m,
  });
  return {
    id: 'cat-forecast',
    label: 'CAT · Forecast (Item × LC × Week × Version)',
    dims: {
      Version: ['Key', 'Name'],
      Item: ['Brand', 'SKU'],
      LogisticsCenter: ['Name'],
      Time: ['Week'],
    },
    measures: ['Forecast Quantity', 'BAF', 'USE_BAF', 'Actual Quantity'],
    rows: [
      mk('320D', '320D-Pump', 'DC-East', 'W01', 1, { 'Forecast Quantity': 120, BAF: 10, USE_BAF: 1, 'Actual Quantity': 118 }),
      mk('320D', '320D-Pump', 'DC-East', 'W02', 2, { 'Forecast Quantity': 130, BAF: 0, USE_BAF: 0, 'Actual Quantity': 125 }),
      mk('320D', '320D-Pump', 'DC-West', 'W01', 1, { 'Forecast Quantity': 90, BAF: 0, USE_BAF: 0, 'Actual Quantity': 95 }),
      mk('320D', '320D-Seal', 'DC-East', 'W01', 1, { 'Forecast Quantity': 40, BAF: 5, USE_BAF: 1, 'Actual Quantity': 44 }),
      mk('320D', '320D-Seal', 'DC-East', 'W02', 2, { 'Forecast Quantity': 45, BAF: 0, USE_BAF: 0, 'Actual Quantity': 0 }),
      mk('330', '330-Drive', 'DC-West', 'W01', 1, { 'Forecast Quantity': 200, BAF: 0, USE_BAF: 0, 'Actual Quantity': 180 }),
      mk('330', '330-Drive', 'DC-West', 'W02', 2, { 'Forecast Quantity': 210, BAF: 20, USE_BAF: 1, 'Actual Quantity': 205 }),
      mk('330', '330-Link', 'DC-East', 'W01', 1, { 'Forecast Quantity': 0, BAF: 0, USE_BAF: 0, 'Actual Quantity': 12 }),
    ],
  };
}

function catInventory() {
  // Item(SKU) × Time(Week ordered) × Version — for @ / LeadOffset carry-over demos
  const mk = (SKU, Week, idx, m) => ({
    Version: { Key: 0, Name: 'CurrentWorkingView' },
    Item: { SKU },
    Time: { Week, idx },
    measures: m,
  });
  return {
    id: 'cat-inventory',
    label: 'CAT · Inventory (Item × Week × Version)',
    dims: { Version: ['Key', 'Name'], Item: ['SKU'], Time: ['Week'] },
    measures: ['Supply', 'Demand', 'Inventory'],
    rows: [
      mk('320D-Pump', 'W01', 1, { Supply: 100, Demand: 80, Inventory: null }),
      mk('320D-Pump', 'W02', 2, { Supply: 60, Demand: 90, Inventory: null }),
      mk('320D-Pump', 'W03', 3, { Supply: 70, Demand: 50, Inventory: null }),
      mk('330-Drive', 'W01', 1, { Supply: 40, Demand: 30, Inventory: null }),
      mk('330-Drive', 'W02', 2, { Supply: 20, Demand: 35, Inventory: null }),
    ],
  };
}

export const DATASETS = {
  'cat-forecast': catForecast,
  'cat-inventory': catInventory,
};

export function loadDataset(id) {
  const f = DATASETS[id] || DATASETS['cat-forecast'];
  return f();
}

/* ================================ LEXER ================================= */

const KEYWORDS = new Set([
  'select', 'where', 'orderby', 'limit', 'on', 'row', 'column', 'desc', 'asc',
  'scope', 'end', 'as', 'if', 'then', 'else', 'in', 'and', 'or', 'null', 'true', 'false',
]);

function tokenize(src) {
  const toks = [];
  let i = 0;
  const push = (type, value) => toks.push({ type, value });
  while (i < src.length) {
    const c = src[i];
    if (c === '-' && src[i + 1] === '-') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '[') { // bracketed identifier  [Name With Spaces]
      let j = src.indexOf(']', i + 1);
      if (j < 0) throw new SimError('Unclosed "[" — expected a matching "]".');
      push('bracket', src.slice(i + 1, j)); i = j + 1; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { s += src[j]; j++; }
      if (j >= src.length) throw new SimError('Unclosed string literal.');
      push('string', s); i = j + 1; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      push('number', parseFloat(src.slice(i, j))); i = j; continue;
    }
    // multi-char operators
    const two = src.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) { push('op', two); i += 2; continue; }
    if ('+-*/<>=(){}.,;:'.includes(c)) { push('op', c); i++; continue; }
    if (/[A-Za-z_@#]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_@#$]/.test(src[j])) j++;
      const word = src.slice(i, j); const lw = word.toLowerCase();
      if (KEYWORDS.has(lw)) push('kw', lw); else push('ident', word);
      i = j; continue;
    }
    throw new SimError(`Unexpected character "${c}".`);
  }
  push('eof', null);
  return toks;
}

class SimError extends Error {}

/* ============================ EXPRESSIONS =============================== */
// A tiny Pratt-ish recursive descent evaluator producing a function of (row, ctx).

function parseExpression(tokens, startRef) {
  const ref = startRef || { i: 0 };
  const peek = () => tokens[ref.i];
  const next = () => tokens[ref.i++];
  const eat = (type, value) => {
    const t = peek();
    if (t.type !== type || (value !== undefined && t.value !== value))
      throw new SimError(`Expected ${value ?? type} but found "${t.value ?? t.type}".`);
    return next();
  };

  function parsePrimary() {
    const t = peek();
    if (t.type === 'number') { next(); return () => t.value; }
    if (t.type === 'string') { next(); return () => t.value; }
    if (t.type === 'kw' && t.value === 'null') { next(); return () => null; }
    if (t.type === 'kw' && (t.value === 'true' || t.value === 'false')) { next(); return () => t.value === 'true'; }
    if (t.type === 'op' && t.value === '(') { next(); const e = parseOr(); eat('op', ')'); return e; }
    if (t.type === 'op' && t.value === '-') { next(); const e = parsePrimary(); return (r, c) => -num(e(r, c)); }
    if (t.type === 'kw' && t.value === 'if') { return parseIf(); }
    if (t.type === 'ident') return parseIdentExpr();
    throw new SimError(`Unexpected token "${t.value ?? t.type}" in expression.`);
  }

  function parseIf() {
    eat('kw', 'if'); const cond = parseOr();
    eat('kw', 'then'); const a = parseOr();
    eat('kw', 'else'); const b = parseOr();
    return (r, c) => (truthy(cond(r, c)) ? a(r, c) : b(r, c));
  }

  function parseIdentExpr() {
    const name = next().value; // ident
    // function call?
    if (peek().type === 'op' && peek().value === '(') {
      next(); const args = [];
      if (!(peek().type === 'op' && peek().value === ')')) {
        args.push(parseOr());
        while (peek().type === 'op' && peek().value === ',') { next(); args.push(parseOr()); }
      }
      eat('op', ')');
      return makeCall(name, args);
    }
    // Measure.[X]  or  Measure.[X]@(Time.#.LeadOffset(n))
    if (name === 'Measure') {
      eat('op', '.'); const mname = eat('bracket').value;
      let shift = null;
      if (peek().type === 'ident' && peek().value === '@') {
        next(); eat('op', '('); shift = parseShift(); eat('op', ')');
      } else if (peek().type === 'op' && peek().value === '@') {
        next(); eat('op', '('); shift = parseShift(); eat('op', ')');
      }
      return (r, c) => readMeasure(r, mname, shift, c);
    }
    // Time.#.Key  (current member's date index) — expose idx
    if (name === 'Time') {
      eat('op', '.'); // #
      if (peek().type === 'ident' && peek().value === '#') next(); else if (peek().type === 'op' && peek().value === '#') next();
      eat('op', '.'); const prop = next().value;
      return (r) => (prop === 'Key' ? r.Time?.idx : r.Time?.[prop]);
    }
    throw new SimError(`Unknown reference "${name}" (expected Measure.[…], Time.#.…, or a function).`);
  }

  function parseShift() {
    // Time.#.LeadOffset(n)
    let dim = next().value; // Time (ident)
    eat('op', '.');
    if (peek().type === 'ident' && peek().value === '#') next(); else if (peek().type === 'op' && peek().value === '#') next();
    eat('op', '.');
    const fn = next().value; // LeadOffset
    eat('op', '('); const nExpr = parseOr(); eat('op', ')');
    return { dim, fn, n: nExpr };
  }

  function makeCall(name, args) {
    const lname = name.toLowerCase();
    if (lname === 'coalesce') return (r, c) => { for (const a of args) { const v = a(r, c); if (v !== null && v !== undefined) return v; } return null; };
    if (lname === 'safedivide') return (r, c) => { const d = num(args[1](r, c)); return d === 0 || d === null ? null : num(args[0](r, c)) / d; };
    if (lname === 'abs') return (r, c) => { const v = args[0](r, c); return v === null ? null : Math.abs(num(v)); };
    throw new SimError(`Unknown function "${name}". Supported: coalesce, SafeDivide, abs.`);
  }

  function parseMulDiv() {
    let left = parsePrimary();
    while (peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = next().value; const right = parsePrimary();
      const l = left;
      left = (r, c) => { const a = l(r, c), b = right(r, c); if (a === null || b === null) return null; return op === '*' ? num(a) * num(b) : (num(b) === 0 ? null : num(a) / num(b)); };
    }
    return left;
  }
  function parseAddSub() {
    let left = parseMulDiv();
    while (peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = next().value; const right = parseMulDiv();
      const l = left;
      left = (r, c) => { const a = l(r, c), b = right(r, c); if (a === null || b === null) return null; return op === '+' ? num(a) + num(b) : num(a) - num(b); };
    }
    return left;
  }
  function parseCompare() {
    let left = parseAddSub();
    while (peek().type === 'op' && ['==', '!=', '>', '<', '>=', '<='].includes(peek().value)) {
      const op = next().value; const right = parseAddSub();
      const l = left;
      left = (r, c) => compare(op, l(r, c), right(r, c));
    }
    return left;
  }
  function parseAnd() {
    let left = parseCompare();
    while ((peek().type === 'op' && peek().value === '&&') || (peek().type === 'kw' && peek().value === 'and')) {
      next(); const right = parseCompare(); const l = left;
      left = (r, c) => truthy(l(r, c)) && truthy(right(r, c));
    }
    return left;
  }
  function parseOr() {
    let left = parseAnd();
    while ((peek().type === 'op' && peek().value === '||') || (peek().type === 'kw' && peek().value === 'or')) {
      next(); const right = parseAnd(); const l = left;
      left = (r, c) => truthy(l(r, c)) || truthy(right(r, c));
    }
    return left;
  }

  return parseOr();
}

/* ============================== HELPERS ================================= */

function valEq(a, b) { if (String(a) === String(b)) return true; const na = num(a), nb = num(b); return na !== null && nb !== null && na === nb; }
function num(v) { if (v === null || v === undefined) return null; if (typeof v === 'boolean') return v ? 1 : 0; const n = Number(v); return Number.isNaN(n) ? null : n; }
function truthy(v) { return v !== null && v !== undefined && v !== false && v !== 0; }
function compare(op, a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return false;
  switch (op) {
    case '==': return valEq(a, b);
    case '!=': return !valEq(a, b);
    case '>': return num(a) > num(b);
    case '<': return num(a) < num(b);
    case '>=': return num(a) >= num(b);
    case '<=': return num(a) <= num(b);
  }
}
function readMeasure(row, mname, shift, ctx) {
  if (!shift) { const v = row.measures?.[mname]; return v === undefined ? null : v; }
  // time shift: find the sibling row in same series with idx = row.idx + n
  const n = num(shift.n(row, ctx)) || 0;
  const target = row.Time.idx + n;
  const sib = ctx.series.get(seriesKey(row, ctx)).find(r => r.Time.idx === target);
  if (!sib) return null;
  const v = sib.measures?.[mname]; return v === undefined ? null : v;
}
function seriesKey(row, ctx) {
  // all dims except Time + Version
  return ctx.seriesDims.map(d => dimKey(row, d)).join('|');
}
function dimKey(row, dim) { const o = row[dim] || {}; return Object.values(o).join('.'); }

/* ============================ SELECT RUNNER ============================ */

function parseLevelRefs(tokens, ref) {
  // returns list of {dim, level}, consuming  [Dim].[Level] (* [Dim].[Level])*
  const levels = [];
  const readLevel = () => {
    const dim = tokens[ref.i].type === 'bracket' ? tokens[ref.i++].value : tokens[ref.i++].value; // [Item] or Item
    if (tokens[ref.i].type === 'op' && tokens[ref.i].value === '.') {
      ref.i++; const lvl = tokens[ref.i++].value; return { dim, level: lvl };
    }
    return { dim, level: null };
  };
  levels.push(readLevel());
  while (tokens[ref.i].type === 'op' && tokens[ref.i].value === '*') {
    // peek: could be a measure set next
    if (tokens[ref.i + 1] && tokens[ref.i + 1].type === 'op' && tokens[ref.i + 1].value === '{') break;
    ref.i++; levels.push(readLevel());
  }
  return levels;
}

function run(code, dataset) {
  const toks = tokenize(code);
  // dispatch
  const first = toks.find(t => t.type !== 'eof');
  if (!first) throw new SimError('Empty statement.');
  if (first.type === 'kw' && first.value === 'select') return runSelect(toks, dataset);
  if (first.type === 'kw' && first.value === 'scope') return runScope(toks, dataset);
  if (first.type === 'ident' && /scope/i.test(first.value)) throw new SimError('Only regular "scope:" is simulated. Other scope types are predict/explain exercises.');
  throw new SimError('Statement must start with Select or scope.');
}

function runSelect(toks, dataset) {
  const ref = { i: 0 };
  const eatKw = (v) => { if (toks[ref.i].type === 'kw' && toks[ref.i].value === v) { ref.i++; return true; } return false; };
  eatKw('select');
  // optional wrapping parens
  let paren = false;
  if (toks[ref.i].type === 'op' && toks[ref.i].value === '(') { paren = true; ref.i++; }
  // grain levels (may be none → grand-total roll-up)
  const levels = (toks[ref.i].type === 'op' && toks[ref.i].value === '{') ? [] : parseLevelRefs(toks, ref);
  // measures + transients
  const measures = []; const transients = [];
  if (toks[ref.i].type === 'op' && toks[ref.i].value === '*') ref.i++;
  if (toks[ref.i].type === 'op' && toks[ref.i].value === '{') {
    ref.i++;
    const readItem = () => {
      // either Measure.[X]  or  <expr> as Transient.Y
      const save = ref.i;
      if (toks[ref.i].type === 'ident' && toks[ref.i].value === 'Measure' &&
          toks[ref.i + 2] && toks[ref.i + 2].type === 'bracket' &&
          !isTransientAhead(toks, ref.i)) {
        ref.i++; ref.i++; const m = toks[ref.i++].value; measures.push(m); return;
      }
      ref.i = save;
      const expr = parseExpression(toks, ref);
      if (toks[ref.i].type === 'kw' && toks[ref.i].value === 'as') {
        ref.i++; const tdim = toks[ref.i++].value; // Transient
        if (toks[ref.i].type === 'op' && toks[ref.i].value === '.') ref.i++;
        const tname = toks[ref.i++].value;
        transients.push({ name: tname, expr });
      } else { transients.push({ name: 'expr', expr }); }
    };
    readItem();
    while (toks[ref.i].type === 'op' && toks[ref.i].value === ',') { ref.i++; readItem(); }
    if (toks[ref.i].type === 'op' && toks[ref.i].value === '}') ref.i++;
  }
  if (paren && toks[ref.i].type === 'op' && toks[ref.i].value === ')') ref.i++;

  // where
  const filters = [];
  if (toks[ref.i].type === 'kw' && toks[ref.i].value === 'where') {
    ref.i++;
    if (toks[ref.i].type === 'op' && toks[ref.i].value === '{') ref.i++;
    parseFilters(toks, ref, filters);
    if (toks[ref.i].type === 'op' && toks[ref.i].value === '}') ref.i++;
  }
  // orderby
  let order = null;
  if (toks[ref.i].type === 'kw' && toks[ref.i].value === 'orderby') {
    ref.i++;
    // Measure.[X] or Transient.X
    let oref = toks[ref.i].value;
    if (oref === 'Measure' || oref === 'Transient') { ref.i++; if (toks[ref.i].value === '.') ref.i++; }
    const oname = toks[ref.i++].value;
    let dir = 'asc';
    if (toks[ref.i].type === 'kw' && (toks[ref.i].value === 'desc' || toks[ref.i].value === 'asc')) { dir = toks[ref.i++].value; }
    order = { name: oname, dir };
  }
  // limit
  let limit = null;
  if (toks[ref.i].type === 'kw' && toks[ref.i].value === 'limit') { ref.i++; limit = toks[ref.i++].value; }

  // ---- evaluate ----
  const hasVersion = filters.some(f => f.dim === 'Version');
  if (!hasVersion) {
    return { columns: [], rows: [], note: 'No Version filter → 0 rows (Version is a mandatory partition). Add where { Version.[Version Name].filter(#.Key == 0) }.', zeroReason: 'version' };
  }
  const ctx = makeCtx(dataset);
  let rows = dataset.rows.filter(r => filters.every(f => applyFilter(f, r)));

  // grain projection: group by selected levels (sum numeric measures within a group)
  const grainCols = levels.filter(l => l.level).map(l => ({ dim: l.dim, level: l.level }));
  const grouped = groupByGrain(rows, grainCols, measures, transients, ctx);

  let out = grouped;
  if (order) out = out.slice().sort((a, b) => cmpVals(a.cells[order.name], b.cells[order.name], order.dir));
  if (limit != null) out = out.slice(0, limit);

  const columns = [...grainCols.map(c => `${c.dim}.${c.level}`), ...measures, ...transients.map(t => t.name)];
  return {
    columns,
    rows: out.map(g => columns.map(c => g.cells[c])),
    note: `Simulated ${out.length} row(s). Scope grain: ${grainCols.map(c => c.dim + '.' + c.level).join(' × ') || '(none)'}.`,
  };
}

function isTransientAhead(toks, i) {
  // scan a short window for 'as' keyword before a comma/} at same nesting — treat as transient
  let depth = 0;
  for (let k = i; k < toks.length && k < i + 40; k++) {
    const t = toks[k];
    if (t.type === 'op' && t.value === '(') depth++;
    if (t.type === 'op' && t.value === ')') depth--;
    if (depth <= 0 && t.type === 'kw' && t.value === 'as') return true;
    if (depth <= 0 && t.type === 'op' && (t.value === ',' || t.value === '}')) return false;
  }
  return false;
}

function parseFilters(toks, ref, out) {
  const readOne = () => {
    // Dim ref: [Dim].[Level]  or  Version.[Version Name]
    let dim = toks[ref.i].type === 'bracket' ? toks[ref.i++].value : toks[ref.i++].value;
    let level = null;
    if (toks[ref.i].type === 'op' && toks[ref.i].value === '.') { ref.i++; level = toks[ref.i++].value; }
    // .filter(...)
    let pred = null;
    if (toks[ref.i].type === 'op' && toks[ref.i].value === '.') {
      ref.i++; const fn = toks[ref.i++].value; // filter
      if (toks[ref.i].value === '(') ref.i++;
      pred = parsePredicate(toks, ref);
      if (toks[ref.i].value === ')') ref.i++;
    }
    out.push({ dim, level, pred });
  };
  readOne();
  while (toks[ref.i].type === 'op' && (toks[ref.i].value === ',' || toks[ref.i].value === '*')) { ref.i++; readOne(); }
}

function parsePredicate(toks, ref) {
  // #.Prop == value | #.Prop in { a, b } | #.Prop != value
  if (toks[ref.i].value === '#') ref.i++; else if (toks[ref.i].type === 'op' && toks[ref.i].value === '#') ref.i++;
  if (toks[ref.i].value === '.') ref.i++;
  const prop = toks[ref.i++].value;
  const op = toks[ref.i++].value; // == != in
  if (op === 'in') {
    if (toks[ref.i].value === '{') ref.i++;
    const vals = [];
    const readV = () => { const t = toks[ref.i++]; vals.push(t.value); };
    readV();
    while (toks[ref.i].value === ',') { ref.i++; readV(); }
    if (toks[ref.i].value === '}') ref.i++;
    return { prop, op: 'in', vals };
  }
  const t = toks[ref.i++];
  return { prop, op, val: t.value };
}

function applyFilter(f, row) {
  const obj = row[f.dim] || {};
  if (!f.pred) return true;
  const prop = f.pred.prop === 'Name' ? (f.level || 'Name') : f.pred.prop;
  // map common props
  let actual;
  if (f.pred.prop === 'Key') actual = obj.Key;
  else if (f.pred.prop === 'Name') actual = obj[f.level] ?? obj.Name ?? obj.SKU ?? obj.Brand;
  else actual = obj[f.pred.prop];
  if (f.pred.op === 'in') return f.pred.vals.map(String).includes(String(actual));
  if (f.pred.op === '==') return valEq(actual, f.pred.val);
  if (f.pred.op === '!=') return !valEq(actual, f.pred.val);
  return true;
}

function makeCtx(dataset) {
  const seriesDims = Object.keys(dataset.dims).filter(d => d !== 'Time' && d !== 'Version');
  const ctx = { dataset, seriesDims, series: new Map() };
  for (const r of dataset.rows) {
    const k = seriesKey(r, ctx);
    if (!ctx.series.has(k)) ctx.series.set(k, []);
    ctx.series.get(k).push(r);
  }
  for (const arr of ctx.series.values()) arr.sort((a, b) => (a.Time?.idx || 0) - (b.Time?.idx || 0));
  return ctx;
}

function groupByGrain(rows, grainCols, measures, transients, ctx) {
  const groups = new Map();
  for (const r of rows) {
    const key = grainCols.map(c => r[c.dim]?.[c.level]).join('||');
    if (!groups.has(key)) groups.set(key, { rows: [], cells: {} });
    groups.get(key).rows.push(r);
  }
  const result = [];
  for (const g of groups.values()) {
    const cells = {};
    for (const c of grainCols) cells[`${c.dim}.${c.level}`] = g.rows[0][c.dim]?.[c.level];
    for (const m of measures) {
      const vals = g.rows.map(r => r.measures?.[m]).filter(v => v !== null && v !== undefined);
      cells[m] = vals.length ? vals.reduce((s, v) => s + num(v), 0) : null; // Sum roll-up within grain
    }
    for (const t of transients) {
      // evaluate transient on the first row (leaf) if single, else on an aggregated pseudo-row
      const pseudo = g.rows.length === 1 ? g.rows[0] : aggregateRow(g.rows, measures);
      cells[t.name] = t.expr(pseudo, ctx);
    }
    result.push(g);
    g.cells = cells;
  }
  return result;
}

function aggregateRow(rows, measures) {
  const m = {};
  const all = new Set();
  rows.forEach(r => Object.keys(r.measures || {}).forEach(k => all.add(k)));
  for (const k of all) { const vals = rows.map(r => r.measures?.[k]).filter(v => v != null); m[k] = vals.length ? vals.reduce((s, v) => s + num(v), 0) : null; }
  return { ...rows[0], measures: m };
}

function cmpVals(a, b, dir) {
  const na = num(a), nb = num(b);
  let r;
  if (na !== null && nb !== null) r = na - nb;
  else r = String(a ?? '').localeCompare(String(b ?? ''));
  return dir === 'desc' ? -r : r;
}

/* ============================ SCOPE RUNNER ============================= */

function runScope(toks, dataset) {
  const ref = { i: 0 };
  if (toks[ref.i].value === 'scope') ref.i++;
  if (toks[ref.i].value === ':') ref.i++; else if (toks[ref.i].type === 'op' && toks[ref.i].value === ':') ref.i++;
  // : is '.'? ':' not tokenized — handle via op list. Add ':' support:
  if (toks[ref.i].type === 'op' && toks[ref.i].value === '(') ref.i++;
  const filters = []; parseFilters(toks, ref, filters);
  if (toks[ref.i].type === 'op' && toks[ref.i].value === ')') ref.i++;
  if (toks[ref.i].type === 'op' && toks[ref.i].value === ';') ref.i++;
  // assignments
  const assigns = [];
  while (!(toks[ref.i].type === 'kw' && toks[ref.i].value === 'end')) {
    if (toks[ref.i].type === 'eof') throw new SimError('Missing "end scope;".');
    // Measure.[X] =
    if (!(toks[ref.i].type === 'ident' && toks[ref.i].value === 'Measure')) { ref.i++; continue; }
    ref.i++; if (toks[ref.i].value === '.') ref.i++; const mname = toks[ref.i++].value;
    if (!(toks[ref.i].type === 'op' && toks[ref.i].value === '=')) throw new SimError('Expected "=" in assignment (use "=" to assign, "==" to compare).');
    ref.i++;
    const expr = parseExpression(toks, ref);
    assigns.push({ mname, expr });
    if (toks[ref.i].type === 'op' && toks[ref.i].value === ';') ref.i++;
  }
  // end scope
  const hasVersion = filters.some(f => f.dim === 'Version');
  const ctx = makeCtx(dataset);
  const target = dataset.rows.filter(r => filters.every(f => applyFilter(f, r)));
  const before = target.map(r => ({ ...snapshot(r, dataset), ...r.measures }));
  // apply (two-pass so reads see pre-write values — supports simple recurrence-free use)
  const newVals = target.map(r => assigns.map(a => a.expr(r, ctx)));
  target.forEach((r, i) => assigns.forEach((a, j) => { r.measures[a.mname] = round2(newVals[i][j]); }));
  const cols = [...Object.keys(dataset.dims).filter(d => d !== 'Version').map(d => dataset.dims[d].map(l => `${d}.${l}`)).flat(), ...assigns.map(a => a.mname)];
  const rows = target.map(r => keyCols(r, dataset).concat(assigns.map(a => r.measures[a.mname])));
  return {
    columns: labelCols(dataset, assigns),
    rows,
    note: hasVersion ? `Simulated write to ${target.length} intersection(s).` : 'No Version in scope → writes nothing (Version is mandatory).',
    wrote: true,
  };
}

function snapshot(r, ds) { const o = {}; for (const d of Object.keys(ds.dims)) if (d !== 'Version') o[d] = { ...r[d] }; return o; }
function keyCols(r, ds) { const out = []; for (const d of Object.keys(ds.dims)) { if (d === 'Version') continue; for (const l of ds.dims[d]) out.push(r[d]?.[l]); } return out; }
function labelCols(ds, assigns) { const out = []; for (const d of Object.keys(ds.dims)) { if (d === 'Version') continue; for (const l of ds.dims[d]) out.push(`${d}.${l}`); } return out.concat(assigns.map(a => a.mname)); }
function round2(v) { return v === null || v === undefined ? null : Math.round(num(v) * 1e6) / 1e6; }

/* ===================== DISTRIBUTE-TO-LEAVES HELPER ==================== */

// aggregatePolicy — roll leaf values up to a parent by the named policy.
// values: array that MAY contain null (an unstored/sparse leaf) or 0 (a real zero).
// Returns a number, or null when nothing aggregates.
export function aggregatePolicy(values, policy) {
  const nonNull = values.filter(v => v !== null && v !== undefined).map(Number);
  const nonNullOrZero = nonNull.filter(v => v !== 0);
  switch (policy) {
    case 'Sum': return nonNull.length ? nonNull.reduce((s, v) => s + v, 0) : null;
    case 'Min': return nonNull.length ? Math.min(...nonNull) : null;
    case 'Max': return nonNull.length ? Math.max(...nonNull) : null;
    case 'Avg': return nonNull.length ? nonNull.reduce((s, v) => s + v, 0) / nonNull.length : null;
    case 'AvgNonNull': return nonNull.length ? nonNull.reduce((s, v) => s + v, 0) / nonNull.length : null;
    case 'AvgNonNullOrZero': return nonNullOrZero.length ? nonNullOrZero.reduce((s, v) => s + v, 0) / nonNullOrZero.length : null;
    case 'FirstChild': { const f = values.find(v => v !== undefined); return f === undefined ? null : f; }
    case 'LastChild': return values.length ? values[values.length - 1] : null;
    default: return null;
  }
}

export function distributeToLeaves(aggValue, basis, assortment) {
  // basis: array of numbers (null allowed). assortment: array of 0/1 eligibility (optional).
  const elig = basis.map((_, i) => (assortment ? !!assortment[i] : true));
  const bv = basis.map((b, i) => (elig[i] ? (b == null ? null : num(b)) : null));
  const sum = bv.reduce((s, b) => s + (b || 0), 0);
  const eligCount = elig.filter(Boolean).length;
  if (sum === 0 || sum === null) {
    // equal split among eligible
    return elig.map(e => (e ? aggValue / eligCount : null));
  }
  return bv.map((b, i) => (elig[i] ? aggValue * ((b || 0) / sum) : null));
}

/* =============================== FACADE =============================== */

export function runIBPL(code, datasetId) {
  const dataset = loadDataset(datasetId);
  try {
    const res = run(code, dataset);
    return { ok: true, ...res, simulated: true };
  } catch (e) {
    if (e instanceof SimError) return { ok: false, error: e.message, simulated: true };
    return { ok: false, error: 'Could not simulate this query. ' + (e.message || ''), simulated: true };
  }
}
