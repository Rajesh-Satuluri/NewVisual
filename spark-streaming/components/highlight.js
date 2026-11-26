// ─────────────────────────────────────────────────────────────────────────
// Dependency-free syntax highlighter for the teaching code blocks.
//
// Why this exists: every code snippet in the tool used to render as one flat,
// single-color slab of monospace text — comments, keywords and strings all the
// same grey — so a 20-line PyFlink example read like a paragraph. The CSS
// already defined a token palette (.ck/.cs/.cc/.cn/.cf/.ct/.cp) but nothing
// ever emitted those spans. This module is that missing piece.
//
// It tokenizes a snippet into coloured spans. It is deliberately approximate,
// not a parser: it never emits unescaped source text, so the worst a
// mis-tokenization can do is colour a token wrong — it can never break the page.
//
//   highlight(code, lang)      -> HTML string of spans (escaped)
//   guessLang(code)            -> 'python' | 'sql' | 'java' | 'yaml' | 'bash'
//   highlightCodeBlocks(root)  -> highlight every <pre> under a DOM node, once
// ─────────────────────────────────────────────────────────────────────────

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ENT[c]);

// Python / PyFlink.
const PY_KW = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
  'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield', 'True', 'False', 'None', 'self',
  'cls',
]);

// Flink SQL — case-insensitive, so matched against the upper-cased word.
const SQL_KW = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'INSERT', 'INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'VIEW', 'TEMPORARY',
  'AS', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
  'LATERAL', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN',
  'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'WITH', 'UNION', 'ALL', 'PARTITION', 'OVER', 'WINDOW',
  'TUMBLE', 'HOP', 'CUMULATE', 'SESSION', 'INTERVAL', 'ROW', 'ROWS', 'RANGE',
  'MATCH_RECOGNIZE', 'PATTERN', 'DEFINE', 'MEASURES', 'AFTER', 'PRIMARY',
  'KEY', 'WATERMARK', 'FOR', 'SYSTEM_TIME', 'OF', 'EXPLAIN', 'DESCRIBE',
  'CONNECTOR', 'FORMAT', 'LIMIT', 'OFFSET', 'ASC', 'DESC', 'USING', 'IF',
  'EXISTS', 'STATEMENT', 'BIGINT', 'INT', 'INTEGER', 'SMALLINT', 'TINYINT',
  'VARCHAR', 'CHAR', 'STRING', 'DOUBLE', 'FLOAT', 'BOOLEAN', 'DATE', 'TIME',
  'TIMESTAMP', 'TIMESTAMP_LTZ', 'MAP', 'ARRAY', 'DECIMAL', 'BYTES', 'METADATA',
  'COMPUTED', 'VIRTUAL', 'UNNEST', 'TO',
]);

// Java (for the "Java-only → PyFlink path" snippets).
const JAVA_KW = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'var', 'true', 'false',
  'null',
]);

const YAML_KW = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off']);
const BASH_KW = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'case',
  'esac', 'function', 'export', 'local', 'return', 'exit',
]);

// Per-language lexing rules.
const LANGS = {
  python: { line: ['#'], block: null, triple: true, kw: PY_KW, upperIsType: true },
  sql:    { line: ['--'], block: ['/*', '*/'], backtick: true, kw: SQL_KW, ci: true },
  java:   { line: ['//'], block: ['/*', '*/'], kw: JAVA_KW, upperIsType: true },
  yaml:   { line: ['#'], block: null, kw: YAML_KW, ci: true, yamlKeys: true },
  bash:   { line: ['#'], block: null, kw: BASH_KW },
  text:   { line: [], block: null, kw: new Set() },
};

const isWordStart = (c) => /[A-Za-z_$@]/.test(c);
const isWordChar  = (c) => /[A-Za-z0-9_$]/.test(c);

// Tokenize `code` as `lang` into an escaped HTML string of coloured spans.
export function highlight(code, lang) {
  const spec = LANGS[lang] || LANGS.text;
  const n = code.length;
  let i = 0;
  let out = '';
  let atLineStart = true; // for YAML: colour the leading `key:` of each line
  const span = (cls, s) => { out += `<span class="${cls}">${esc(s)}</span>`; };
  const raw  = (s) => { out += esc(s); };

  while (i < n) {
    const c = code[i];

    // Whitespace (tracks line starts for YAML key detection).
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      let j = i;
      while (j < n && /[ \t\n\r]/.test(code[j])) j++;
      if (code.slice(i, j).includes('\n')) atLineStart = true;
      raw(code.slice(i, j));
      i = j;
      continue;
    }

    // Block comment (/* ... */).
    if (spec.block && code.startsWith(spec.block[0], i)) {
      let end = code.indexOf(spec.block[1], i + spec.block[0].length);
      end = end === -1 ? n : end + spec.block[1].length;
      span('cc', code.slice(i, end));
      i = end; atLineStart = false;
      continue;
    }

    // Line comment (#, //, --).
    const lc = spec.line.find((m) => code.startsWith(m, i));
    if (lc) {
      let end = code.indexOf('\n', i);
      if (end === -1) end = n;
      span('cc', code.slice(i, end));
      i = end; atLineStart = false;
      continue;
    }

    // Triple-quoted string (Python docstrings / embedded SQL).
    if (spec.triple && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
      const q = code.substr(i, 3);
      let end = code.indexOf(q, i + 3);
      end = end === -1 ? n : end + 3;
      span('cs', code.slice(i, end));
      i = end; atLineStart = false;
      continue;
    }

    // Single / double / backtick string.
    if (c === '"' || c === "'" || (spec.backtick && c === '`')) {
      let j = i + 1;
      while (j < n && code[j] !== c) {
        if (code[j] === '\\' && !spec.ci) j++; // honour escapes (not in SQL)
        j++;
      }
      j = Math.min(j + 1, n);
      span('cs', code.slice(i, j));
      i = j; atLineStart = false;
      continue;
    }

    // Number (ints, floats, hex, with embedded _ separators).
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let j = i + 1;
      while (j < n && /[0-9a-fA-FxX_.]/.test(code[j])) j++;
      span('cn', code.slice(i, j));
      i = j; atLineStart = false;
      continue;
    }

    // Word: keyword / type / function call / plain identifier.
    if (isWordStart(c)) {
      let j = i + 1;
      while (j < n && isWordChar(code[j])) j++;
      const word = code.slice(i, j);

      // YAML: a dotted key at the start of a line, immediately before ':'.
      if (spec.yamlKeys && atLineStart) {
        let k = j;
        while (k < n && /[\w.\-]/.test(code[k])) k++; // extend across dots
        if (code[k] === ':') { span('cf', code.slice(i, k)); i = k; atLineStart = false; continue; }
      }

      // Is this an invocation? (next non-space char is '(')
      let m = j;
      while (m < n && (code[m] === ' ' || code[m] === '\t')) m++;
      const isCall = code[m] === '(';
      const key = spec.ci ? word.toUpperCase() : word;

      if (spec.kw.has(key) || spec.kw.has(word)) span('ck', word);
      else if (isCall) span('cf', word);
      else if (spec.upperIsType && /^[A-Z]/.test(word)) span('ct', word);
      else raw(word); // plain identifier — inherits .code-block text colour

      i = j; atLineStart = false;
      continue;
    }

    // Any other single character (operators, punctuation).
    raw(c);
    i++;
    atLineStart = false;
  }
  return out;
}

// Best-effort language detection for blocks that don't declare `data-lang`.
// Order matters: the most distinctive signatures are checked first.
export function guessLang(code) {
  const t = (code || '').trim();
  if (!t) return 'text';
  // Shell: a `$` prompt, a `flink run` submit, or a CLI tool at a line start.
  if (/^\s*(\$ |flink\s+run|\.\/bin\/|bin\/flink|kubectl |docker |helm |mvn |gradle )/m.test(t)) return 'bash';
  // Python — checked BEFORE SQL because PyFlink snippets routinely embed SQL in
  // triple-quoted strings (`t_env.sql_query("""SELECT …""")`). The outer language
  // is Python; the SQL is just a string literal. Signals: triple quotes, a
  // Flink Table/DataStream call, a `name = Something(...)` assignment, an
  // import/def/class, or lambda/self.
  const pyStrong =
    /"""|'''/.test(t) ||
    /\b(t_env|st_env|env)\b/.test(t) ||
    /\.(sql_query|execute_sql|from_path|from_source|add_source|key_by|process|builder)\s*\(/.test(t) ||
    /(^|\n)\s*(from\s+\w[\w.]*\s+import|import\s+\w|def\s+\w+\s*\(|class\s+\w+[(:]|async\s+def)/.test(t) ||
    /(^|\n)\s*[A-Za-z_]\w*\s*=\s*[A-Za-z_]\w*[\w.]*\s*\(/.test(t) ||
    /\b(lambda|self\.)\b/.test(t) || /^#!/.test(t);
  if (pyStrong) return 'python';
  // SQL: a leading `--` comment, or any core DDL/DML keyword.
  if (/^\s*--/.test(t) || /\b(SELECT|INSERT\s+INTO|CREATE\s+(TEMPORARY\s+)?(TABLE|VIEW)|MATCH_RECOGNIZE|WATERMARK\s+FOR)\b/i.test(t)) {
    return 'sql';
  }
  // Java: access modifiers, generics-heavy constructs, or java imports.
  if (/\b(public\s+(class|static|final|void|interface)|private\s+\w|System\.out|import\s+java\.|@Override|new\s+[A-Z]\w+\s*\()/.test(t)) return 'java';
  // YAML / properties: mostly `key: value` lines, dotted keys, no code punctuation.
  const lines = t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const kv = lines.filter((l) => /^[\w.\-]+:\s+\S/.test(l) || /^[\w.\-]+\s*=\s*\S/.test(l)).length;
  if (lines.length && kv / lines.length >= 0.5 && !/[{}();]/.test(t)) return 'yaml';
  return 'python'; // sensible default — most teaching snippets are PyFlink
}

// Highlight every code block under `root`, once. Idempotent and non-destructive:
// a <pre> that already carries semantic spans (e.g. the ride-event JSON payloads
// with .jk/.jv/.jc) is left untouched, and each block is only processed once.
export function highlightCodeBlocks(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('.code-block pre').forEach((pre) => {
    if (pre.dataset.hl) return;                       // already handled
    if (pre.querySelector('span')) { pre.dataset.hl = 'skip'; return; } // pre-coloured
    const code = pre.textContent;
    if (!code.trim()) { pre.dataset.hl = 'skip'; return; }
    const lang = pre.dataset.lang || guessLang(code);
    pre.innerHTML = highlight(code, lang);
    pre.dataset.hl = lang;
  });
}
