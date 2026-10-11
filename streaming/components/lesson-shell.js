// Lesson shell (I08/I29) — tabbed lesson layout for native streaming modules
// (Foundations, and later Cloud). PAGE-style: call initTabs(container) after mount.

export function createLessonShell({ tag, title, subtitle, tabs }) {
  const tabBtns = tabs.map((t, i) =>
    `<button class="lx-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');
  const panels = tabs.map((t, i) =>
    `<div class="lx-panel${i === 0 ? ' active' : ''}" data-panel="${t.id}">${t.body}</div>`).join('');
  return `
    <div class="lx-module">
      <div class="page-head">
        ${tag ? `<div class="page-eyebrow">${tag}</div>` : ''}
        <h1 class="page-title">${title}</h1>
        ${subtitle ? `<p class="page-sub">${subtitle}</p>` : ''}
      </div>
      <div class="lx-tabs" role="tablist">${tabBtns}</div>
      <div class="lx-panels">${panels}</div>
    </div>`;
}

export function initTabs(container) {
  const tabs = container.querySelectorAll('.lx-tab');
  const panels = container.querySelectorAll('.lx-panel');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const id = tab.dataset.tab;
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    // let a panel lazily init its sim when first shown
    const panel = container.querySelector(`.lx-panel[data-panel="${id}"]`);
    if (panel && panel.__onShow && !panel.__shown) { panel.__shown = true; panel.__onShow(); }
  }));
}

// Small content helpers used across lessons.
export const keyPoints = (items) =>
  `<div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;

export const callout = (kind, title, body) =>
  `<div class="lx-callout lx-${kind}"><b>${title}</b><div>${body}</div></div>`;

export const twoCol = (a, b) => `<div class="grid cols-2">${a}${b}</div>`;

export const codeBlock = (lang, code) =>
  `<div class="lx-code"><div class="lx-code-lang">${lang}</div><pre><code>${escapeHtml(code)}</code></pre></div>`;

// Interview Q&A — collapsible questions (native <details>, no JS needed).
export const iqSection = (items) => `
  <div class="lx-iq">
    <div class="lx-kp-h" style="margin-bottom:10px">Interview questions — click to reveal the model answer</div>
    ${items.map((it, i) => `
      <details class="lx-qa">
        <summary><span class="lx-qa-n">Q${i + 1}</span>${it.q}</summary>
        <div class="lx-qa-a">${it.a}</div>
      </details>`).join('')}
  </div>`;

// Simple labelled flow/diagram row (nodes with arrows between).
export const flowDiagram = (nodes) =>
  `<div class="lx-flow">${nodes.map((n, i) =>
    `<span class="lx-flow-node">${n}</span>${i < nodes.length - 1 ? '<span class="lx-flow-arrow">→</span>' : ''}`).join('')}</div>`;

// Comparison table from headers + rows.
export const compareTable = (headers, rows) =>
  `<div class="lx-table-wrap"><table class="lx-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
   <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
