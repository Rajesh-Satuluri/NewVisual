// Home / hero (I14)
import { SECTIONS } from '../data/registry.js';
import { getScenario } from '../data/scenarios.js';

export function mount(container) {
  const s = getScenario();
  const cards = SECTIONS.filter(x => x.id !== 'home' && !x.hidden);

  container.innerHTML = `
    <section class="hero">
      <h1>Streaming Engineering<br/>Master Lab</h1>
      <p class="tag">Master streaming from first principles to production — Apache Kafka, Apache Flink,
         AWS, Azure, and Databricks — taught interactively through two real business scenarios.</p>
      <div class="cta-row">
        <button class="btn primary" data-go="foundations">🧱 Start with Foundations</button>
        <button class="btn" data-go="paths">🧭 Learning paths</button>
        <button class="btn" data-go="dashboard">📊 Your dashboard</button>
        <button class="btn" data-go="search">🔍 Search</button>
      </div>
      <div class="roadmap-note">
        <b>Fully built.</b> 125+ interactive modules — Foundations, Kafka & Flink (100% preserved),
        AWS · Azure · Databricks, cross-cutting engines, incident & system-design labs, interview
        prep, and a glossary — all framed by two real scenarios. Every cloud fact is validated
        against official docs.
      </div>
    </section>

    <div class="scenario-banner">
      <span class="sb-ico">${s.icon}</span>
      <div class="sb-body">You are learning through the <b>${s.name}</b> scenario
        (worked example <b>${s.canonicalId}</b>). Switch to the other scenario any time from the
        toggle in the top bar — every lesson re-frames around it.</div>
    </div>

    <div class="page-head"><h2 class="page-title" style="font-size:22px">Explore the lab</h2></div>
    <div class="grid cols-3">
      ${cards.map(c => `
        <div class="card feature-card" ${c.url ? `data-url="${c.url}"` : `data-go="${c.id}"`}>
          <div class="fc-icon">${c.icon}</div>
          <h3>${c.title}</h3>
          <p>${c.blurb || ''}</p>
          <div class="fc-foot">
            ${c.status === 'live' ? '<span class="pill live">live</span>' : `<span class="pill soon">${c.gate || 'planned'}</span>`}
            <span style="color:var(--accent2);font-size:13px;font-weight:600">Open →</span>
          </div>
        </div>`).join('')}
    </div>
  `;

  container.querySelectorAll('[data-go]').forEach(el =>
    el.addEventListener('click', () => { location.hash = '#' + el.dataset.go; }));
  container.querySelectorAll('[data-url]').forEach(el =>
    el.addEventListener('click', () => { window.location.href = el.dataset.url; }));
}
