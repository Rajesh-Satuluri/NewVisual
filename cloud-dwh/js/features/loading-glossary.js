/* ============================================================
   Loading Glossary — inline hover definitions for ingestion terms.

   decorate(root) walks text under `root` and wraps the FIRST
   occurrence of each known term in a <span class="gl-term"
   data-tooltip="…">, which the global Tooltip system explains on
   hover. It is:
     - safe:   never touches text inside code/pre, links, buttons,
               inputs, editable regions, SVG or already-decorated spans
               (only text nodes are wrapped, so element listeners are intact);
     - idempotent: a term already decorated in `root` is skipped, so
               calling it twice (module + navigate hook) is a no-op.

   Auto-applies on navigate for the loading content modules — but NOT
   the flashcards module, where a definition would spoil active recall.
   ============================================================ */
(function () {
  'use strict';

  const TERMS = {
    'storage integration': 'A Snowflake object holding the cloud IAM role used to reach a bucket — keeps credentials out of SQL.',
    'file format': 'A reusable object describing how to parse files (type, delimiter, compression, error handling).',
    'COPY INTO': 'The SQL command that bulk-loads staged files into a table; pull-based, runs on your warehouse.',
    'auto-ingest': 'Snowpipe mode where cloud storage event notifications trigger the COPY automatically as files arrive.',
    'Snowpipe Streaming': 'Row-level ingestion through a channel via the SDK — sub-second latency, no files or stage.',
    'Snowpipe': 'Serverless, event-driven micro-batch loading of files as they arrive in a stage.',
    'micro-partition': 'Immutable ~50–500 MB columnar file with per-column min/max metadata; the unit of pruning.',
    'pruning': 'Skipping micro-partitions that cannot match a query’s filter, using metadata only — no scan.',
    'watermark': 'The high-water value already processed (e.g. MAX(updated_at)/LSN) so the next run pulls only newer rows.',
    'idempotency': 'The property that re-running a load converges to the same result, with no duplicates.',
    'idempotent': 'Safe to re-run: the same batch applied again yields the same result, with no duplicates.',
    'upsert': 'Insert-or-update by key — the behaviour a MERGE implements for incremental loads.',
    'MERGE': 'Upsert statement: insert new keys, update changed ones, optionally delete — the core of incremental loads.',
    'Dynamic Table': 'A declarative table that incrementally refreshes to meet a TARGET_LAG freshness goal.',
    'VARIANT': 'Universal semi-structured column type holding JSON, arrays or scalars.',
    'FLATTEN': 'Table function that expands an array/object into one row per element.',
    'VALIDATION_MODE': 'A COPY option that dry-runs the parse and reports errors without loading any data.',
    'ON_ERROR': 'A COPY option controlling bad-row behaviour: CONTINUE, SKIP_FILE or ABORT_STATEMENT.',
    'STRIP_OUTER_ARRAY': 'A JSON file-format option that loads each element of a top-level array as its own row.',
    'COPY_HISTORY': 'The view/function showing per-file load status, row and error counts for auditing a load.',
    'Debezium': 'A CDC tool that reads a database transaction log and emits row-level I/U/D change events.',
    'LSN': 'Log Sequence Number — a monotonic commit position used to order change events and as a watermark.',
    'reconciliation': 'Comparing source vs target control totals (counts/checksums) to prove a load is complete and correct.',
    'dedup': 'Removing duplicate rows/events — e.g. keeping the latest per key before a MERGE.',
  };

  // Longer phrases first so "COPY INTO" wins over a bare "copy", etc.
  const ORDER = Object.keys(TERMS).sort((a, b) => b.length - a.length);

  // Ancestors whose text must never be rewritten.
  const SKIP_SEL = 'code, pre, a, button, label, input, textarea, select, svg, .code-block, .gl-term, [contenteditable="true"], .fc-card, .dl2-pipe, .quiz-opts, script, style';

  function _reFor(term) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow an optional trailing plural "s"; require word boundaries.
    return new RegExp('\\b' + esc + 's?\\b', 'i');
  }

  function decorate(root) {
    if (!root || !root.ownerDocument) return;
    ORDER.forEach(term => {
      // Idempotent: already present in this root → skip.
      if (root.querySelector('.gl-term[data-term="' + term.replace(/"/g, '') + '"]')) return;
      const re = _reFor(term);
      const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          if (!node.nodeValue || !re.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
          if (node.parentElement && node.parentElement.closest(SKIP_SEL)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const hit = walker.nextNode();
      if (!hit) return;
      const m = re.exec(hit.nodeValue);
      if (!m) return;
      const before = hit.nodeValue.slice(0, m.index);
      const matched = hit.nodeValue.slice(m.index, m.index + m[0].length);
      const after = hit.nodeValue.slice(m.index + m[0].length);
      const span = root.ownerDocument.createElement('span');
      span.className = 'gl-term';
      span.setAttribute('data-term', term.replace(/"/g, ''));
      span.setAttribute('data-tooltip', TERMS[term]);
      span.setAttribute('tabindex', '0');
      span.textContent = matched;
      const frag = root.ownerDocument.createDocumentFragment();
      if (before) frag.appendChild(root.ownerDocument.createTextNode(before));
      frag.appendChild(span);
      if (after) frag.appendChild(root.ownerDocument.createTextNode(after));
      hit.parentNode.replaceChild(frag, hit);
    });
  }

  // Loading content modules that benefit from inline definitions.
  // Flashcards intentionally excluded — tooltips would give away answers.
  const AUTO_IDS = { 'data-loading': 1, 'loading-workshop': 1, 'loading-incremental': 1, 'loading-recovery': 1, 'loading-cheatsheet': 1 };

  document.addEventListener('cdwh:navigate', function (e) {
    const id = e && e.detail && e.detail.id;
    if (!AUTO_IDS[id]) return;
    // Run after the module + enhance.js have populated the canvas.
    setTimeout(function () {
      const canvas = document.getElementById('canvas');
      if (canvas) { try { decorate(canvas); } catch (_) {} }
    }, 60);
  });

  window.CDWH = window.CDWH || {};
  window.CDWH.LoadingGlossary = { decorate: decorate, terms: TERMS };
})();
