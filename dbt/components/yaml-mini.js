// ─────────────────────────────────────────────────────────────────────────────
// yaml-mini — a compact YAML parser for the subset dbt config files use:
// block mappings, block sequences, nested structures, scalars (quoted/plain,
// bool/int/float/null), inline flow lists/maps, and comments. It is NOT a full
// YAML 1.2 implementation — it exists so the Config Lab's "real parse" works
// even when the CDN js-yaml build is unavailable. In the browser, yaml-lint.js
// prefers js-yaml and only falls back to this. Validated against Python's PyYAML
// on every Config Lab exercise (tools/validate-config.mjs).
//
// Throws YamlError({message, line}) on malformed input.
// ─────────────────────────────────────────────────────────────────────────────

export class YamlError extends Error {
  constructor(message, line) { super(message); this.name = 'YamlError'; this.line = line; }
}

function stripComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD && (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t')) {
      return line.slice(0, i);
    }
  }
  return line;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'")) {
    return s.slice(1, -1);
  }
  if (/^[+-]?\d+$/.test(s)) return parseInt(s, 10);
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(s) && /[.eE]/.test(s)) return parseFloat(s);
  if (s[0] === '[' && s.at(-1) === ']') return parseFlowSeq(s);
  if (s[0] === '{' && s.at(-1) === '}') return parseFlowMap(s);
  return s;
}

function splitFlow(body) {
  const out = []; let depth = 0, inS = false, inD = false, cur = '';
  for (const c of body) {
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    if (!inS && !inD) {
      if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') depth--;
      else if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    }
    cur += c;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}
function parseFlowSeq(s) { return splitFlow(s.slice(1, -1)).map(parseScalar); }
function parseFlowMap(s) {
  const o = {};
  for (const part of splitFlow(s.slice(1, -1))) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    o[parseScalar(part.slice(0, i))] = parseScalar(part.slice(i + 1));
  }
  return o;
}

// Tokenize into { indent, content, line } ignoring blanks/comment-only lines.
function tokenize(text) {
  const toks = [];
  const lines = text.replace(/\t/g, '  ').split('\n');
  lines.forEach((raw, idx) => {
    const noComment = stripComment(raw);
    if (noComment.trim() === '') return;
    const indent = noComment.length - noComment.trimStart().length;
    toks.push({ indent, content: noComment.trim(), line: idx + 1 });
  });
  return toks;
}

export function parse(text) {
  const toks = tokenize(text);
  let pos = 0;

  function parseBlock(minIndent) {
    if (pos >= toks.length) return null;
    const indent = toks[pos].indent;
    if (indent < minIndent) return null;
    return toks[pos].content.startsWith('- ') || toks[pos].content === '-'
      ? parseSeq(indent) : parseMap(indent);
  }

  function parseMap(indent) {
    const obj = {};
    while (pos < toks.length && toks[pos].indent === indent && !toks[pos].content.startsWith('- ')) {
      const { content, line } = toks[pos];
      const ci = findColon(content);
      if (ci < 0) throw new YamlError(`Expected "key: value" mapping`, line);
      const key = parseScalar(content.slice(0, ci));
      const rest = content.slice(ci + 1).trim();
      pos++;
      if (rest === '') {
        const child = (pos < toks.length && toks[pos].indent > indent) ? parseBlock(indent + 1) : null;
        obj[key] = child;
      } else {
        obj[key] = parseScalar(rest);
      }
    }
    return obj;
  }

  function parseSeq(indent) {
    const arr = [];
    while (pos < toks.length && toks[pos].indent === indent && (toks[pos].content === '-' || toks[pos].content.startsWith('- '))) {
      const { content } = toks[pos];
      const after = content === '-' ? '' : content.slice(2).trim();
      if (after === '') {
        pos++;
        arr.push(pos < toks.length && toks[pos].indent > indent ? parseBlock(indent + 1) : null);
      } else if (findColon(after) >= 0) {
        // "- key: value" starts an inline map; treat the dash column as a map indent.
        const mapIndent = indent + 2;
        toks[pos] = { indent: mapIndent, content: after, line: toks[pos].line };
        arr.push(parseMap(mapIndent));
      } else {
        pos++;
        arr.push(parseScalar(after));
      }
    }
    return arr;
  }

  function findColon(s) {
    let inS = false, inD = false, depth = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "'" && !inD) inS = !inS;
      else if (c === '"' && !inS) inD = !inD;
      else if (!inS && !inD) {
        if (c === '[' || c === '{') depth++;
        else if (c === ']' || c === '}') depth--;
        else if (c === ':' && depth === 0 && (i + 1 >= s.length || s[i + 1] === ' ')) return i;
      }
    }
    return -1;
  }

  const result = parseBlock(0);
  if (pos < toks.length) throw new YamlError(`Unexpected indentation`, toks[pos].line);
  return result;
}
