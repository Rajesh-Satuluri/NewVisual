// Gate 8 (I73) — personal dashboard: progress, mastery by section, weak spots,
// and a recommended next step. Reads the sml-* progress store.
import { completables } from '../data/catalog.js';
import { isDone, isVisited } from '../data/progress-store.js';
import { byId } from '../data/registry.js';
import { getScenario } from '../data/scenarios.js';

const SECTION_META = [
  ['foundations', '🧱', 'Foundations'], ['aws', '☁️', 'AWS'], ['azure', '🔷', 'Azure'],
  ['databricks', '🧮', 'Databricks'], ['incident', '🚨', 'Incident Lab'],
];

export async function mount(container) {
  const sc = getScenario();
  const comp = await completables();
  const rows = SECTION_META.map(([id, icon, label]) => {
    const ids = comp[id] || [];
    const done = ids.filter(isDone).length;
    return { id, icon, label, done, total: ids.length, pct: ids.length ? Math.round(done / ids.length * 100) : 0 };
  });
  const totalDone = rows.reduce((a, r) => a + r.done, 0);
  const totalAll = rows.reduce((a, r) => a + r.total, 0);
  const overallPct = totalAll ? Math.round(totalDone / totalAll * 100) : 0;

  // Weak spots: sections started (some done) but incomplete, or live & unvisited.
  const weak = rows.filter(r => r.done > 0 && r.done < r.total);
  // Recommended next: first incomplete completable section, else explore unvisited live section.
  const nextSection = rows.find(r => r.done < r.total);
  const recommend = nextSection
    ? { hash: nextSection.id, text: `Continue <b>${nextSection.label}</b> — ${nextSection.done}/${nextSection.total} done` }
    : { hash: 'interview', text: 'All tracked modules complete — sharpen up in <b>Interview Master</b>' };

  const ring = (pct) => `
    <svg viewBox="0 0 120 120" width="120" height="120" aria-label="${pct}% complete">
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg4)" stroke-width="12"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${(2 * Math.PI * 52).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * 52 * (1 - pct / 100)).toFixed(1)}"
        transform="rotate(-90 60 60)"/>
      <text x="60" y="66" text-anchor="middle" font-size="26" font-weight="700" fill="var(--text)">${pct}%</text>
    </svg>`;

  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow">You</div>
      <h1 class="page-title">📊 Your dashboard</h1>
      <p class="page-sub">Progress and mastery across the lab, your weak spots, and what to do next.
        Progress is stored locally in your browser (<code>sml-*</code>), separate from the Kafka/Flink apps.</p></div>

    <div class="grid cols-2">
      <div class="card" style="display:flex;gap:18px;align-items:center">
        ${ring(overallPct)}
        <div><div style="font-size:13px;color:var(--text3)">Completed modules</div>
          <div style="font-size:28px;font-weight:700">${totalDone} / ${totalAll}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:4px">across ${rows.length} tracked tracks</div></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">▶ Recommended next</h3>
        <p style="color:var(--text2)">${recommend.text}</p>
        <button class="btn primary" data-go="${recommend.hash}">Go →</button>
      </div>
    </div>

    <div class="page-head" style="margin-top:8px"><h2 class="page-title" style="font-size:18px">Mastery by track</h2></div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${rows.map(r => `
        <div class="card" data-go="${r.id}" style="cursor:pointer;display:flex;align-items:center;gap:14px">
          <span style="font-size:22px">${r.icon}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600">
              <span>${r.label}</span><span style="color:var(--text3)">${r.done}/${r.total}</span></div>
            <div style="height:8px;background:var(--bg4);border-radius:6px;margin-top:6px;overflow:hidden">
              <div style="height:100%;width:${r.pct}%;background:var(--accent);border-radius:6px"></div></div>
          </div>
          <span class="pill ${r.pct === 100 ? 'live' : 'soon'}">${r.pct}%</span>
        </div>`).join('')}
    </div>

    <div class="card" style="margin-top:16px">
      <h3 style="margin-top:0">🎯 Weak spots</h3>
      ${weak.length
      ? '<ul class="clean">' + weak.map(w => `<li><a href="#${w.id}">${w.label}</a> — started but ${w.total - w.done} module${w.total - w.done === 1 ? '' : 's'} left</li>`).join('') + '</ul>'
      : '<p style="color:var(--text2)">Nothing half-finished — either not started or fully done. Pick a learning path to go deeper.</p>'}
      <button class="btn" data-go="paths" style="margin-top:6px">Browse learning paths →</button>
    </div>`;

  container.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => { location.hash = '#' + el.dataset.go; }));
}
