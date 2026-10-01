// Shared primitive: a collapsible JSON explorer used by the Manifest & Artifact
// Explorer (m19) and anywhere a dbt artifact (manifest.json / run_results.json /
// catalog.json) should be browsable. Pure DOM, no deps. Keys can be clicked to
// collapse/expand; a `highlightPaths` set draws attention to teaching-relevant
// keys; an optional onSelect(path, value) fires when a leaf/branch is clicked.
//
// renderJsonTree(value, { rootLabel, open, highlight }) -> HTML string
// initJsonTree(container, { onSelect })                 -> wires toggles/selection

export function renderJsonTree(value, opts = {}) {
  const { rootLabel = 'root', open = 2, highlight = [] } = opts;
  const hl = new Set(highlight);
  return `<div class="jt">${node(rootLabel, value, '', 0, open, hl)}</div>`;
}

function node(key, val, path, depth, open, hl) {
  const here = path ? `${path}.${key}` : key;
  const isHl = hl.has(here);
  const keyHtml = `<span class="jt-key${isHl ? ' jt-hl' : ''}">${escapeHtml(key)}</span>`;

  if (val !== null && typeof val === 'object') {
    const entries = Array.isArray(val)
      ? val.map((v, i) => [String(i), v])
      : Object.entries(val);
    const isOpen = depth < open;
    const brace = Array.isArray(val) ? ['[', ']'] : ['{', '}'];
    const count = entries.length;
    const children = entries
      .map(([k, v]) => node(k, v, here, depth + 1, open, hl))
      .join('');
    return `
      <div class="jt-branch ${isOpen ? 'open' : ''}" data-path="${here}">
        <div class="jt-line jt-toggle" tabindex="0" role="button">
          <span class="jt-caret">▸</span>${keyHtml}<span class="jt-punct">: ${brace[0]}</span>
          <span class="jt-count">${count}</span><span class="jt-punct jt-close">${brace[1]}</span>
        </div>
        <div class="jt-children">${children}</div>
      </div>`;
  }

  // Leaf
  let cls = 'jt-str', disp;
  if (typeof val === 'number') { cls = 'jt-num'; disp = val; }
  else if (typeof val === 'boolean') { cls = 'jt-bool'; disp = val; }
  else if (val === null) { cls = 'jt-null'; disp = 'null'; }
  else { disp = `"${escapeHtml(val)}"`; }
  return `
    <div class="jt-line jt-leaf" data-path="${here}">
      ${keyHtml}<span class="jt-punct">: </span><span class="${cls}">${disp}</span>
    </div>`;
}

export function initJsonTree(container, opts = {}) {
  const root = container.querySelector('.jt');
  if (!root) return;
  root.addEventListener('click', e => {
    const tog = e.target.closest('.jt-toggle');
    if (tog) {
      tog.closest('.jt-branch').classList.toggle('open');
      return;
    }
    const leaf = e.target.closest('.jt-leaf, .jt-toggle');
    if (leaf && opts.onSelect) opts.onSelect(leaf.dataset.path || leaf.parentElement.dataset.path);
  });
  root.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tog = e.target.closest('.jt-toggle');
    if (tog) { e.preventDefault(); tog.closest('.jt-branch').classList.toggle('open'); }
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
