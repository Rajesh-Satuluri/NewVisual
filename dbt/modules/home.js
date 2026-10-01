// Home — landing page. Hero + stat strip + story banner + curriculum grid +
// reference links. The default route.
import { MODULES, EXTRAS } from '../components/nav.js';

const STATS = [
  { val: '24', label: 'Modules', sub: 'Pain era → Internals → Prod' },
  { val: '72+', label: 'Interview Qs', sub: 'Senior analytics-eng level' },
  { val: '10', label: 'Prod Incidents', sub: 'Failure simulator' },
  { val: '1', label: 'Real Company', sub: "Amazon-scale analytics" },
];

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]'));

  const groups = [...new Set(MODULES.map(m => m.group))].map(name => ({
    name, items: MODULES.filter(m => m.group === name),
  }));

  const nextId = MODULES.find(m => !done.has(m.id))?.id || 'm01';
  const nextMod = MODULES.find(m => m.id === nextId);
  const realDone = [...done].filter(id => MODULES.some(m => m.id === id)).length;

  container.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <div class="home-badge">🦆 Amazon Edition · Interactive</div>
        <h1 class="home-title">Learn dbt the way it actually clicks — one story at a time</h1>
        <p class="home-sub">
          A hands-on tour of analytics engineering with dbt: start from the data
          chaos every company hits, watch ELT change the game, master models,
          tests, snapshots, incrementals, macros and lineage — then go deep on
          dbt internals and production failure debugging. Interview-ready.
        </p>
        <div class="home-cta">
          <button class="btn btn-primary" data-goto="${nextId}">
            ${realDone ? 'Continue' : 'Start'} — ${nextMod ? nextMod.icon + ' ' + nextMod.title : 'Begin'} <span>→</span>
          </button>
          <button class="btn btn-secondary" data-goto="master-map">🗺️ See the big picture</button>
          <button class="btn btn-ghost" data-goto="comparison">⚖️ ETL vs ELT vs dbt</button>
        </div>
      </div>

      <div class="home-stats">
        ${STATS.map(s => `
          <div class="home-stat">
            <div class="home-stat-val">${s.val}</div>
            <div class="home-stat-label">${s.label}</div>
            <div class="home-stat-sub">${s.sub}</div>
          </div>`).join('')}
      </div>

      <div class="story-banner">
        <div class="story-label">The running example</div>
        <h3>Every concept, grounded in one company's data mess</h3>
        <p>
          Six teams. Twelve copies of the same revenue SQL. Three different answers
          to "how much did we make last quarter?" You'll feel the pain first — then
          watch dbt turn that chaos into a tested, documented, version-controlled DAG
          that a new engineer can understand on day one.
        </p>
        <div class="story-stats">
          <div class="story-stat"><span class="s-val">600+</span><span class="s-label">SQL files</span></div>
          <div class="story-stat"><span class="s-val">3</span><span class="s-label">Revenue numbers</span></div>
          <div class="story-stat"><span class="s-val">12×</span><span class="s-label">Copied logic</span></div>
          <div class="story-stat"><span class="s-val">1 DAG</span><span class="s-label">Source of truth</span></div>
        </div>
      </div>

      <div class="home-section">
        <div class="home-section-title">The curriculum</div>
        <div class="home-section-sub">${realDone} of ${MODULES.length} complete · pick any module or follow the path top to bottom.</div>
        ${groups.map(g => `
          <div class="home-path">
            <div class="home-path-head">
              <span class="home-path-name">${g.name}</span>
              <span class="home-path-line"></span>
            </div>
            <div class="home-cards">
              ${g.items.map(m => `
                <button class="home-mod-card ${done.has(m.id) ? 'done' : ''}" data-goto="${m.id}">
                  <span class="home-mod-ic">${m.icon}</span>
                  <span class="home-mod-body">
                    <span class="home-mod-num">MODULE ${m.num}</span>
                    <div class="home-mod-title">${m.title}</div>
                    <div class="home-mod-desc">${m.desc || ''}</div>
                  </span>
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <div class="home-section">
        <div class="home-section-title">Reference & review</div>
        <div class="home-section-sub">Jump-off points once you've got the fundamentals.</div>
        <div class="home-cards">
          ${EXTRAS.map(e => `
            <button class="home-mod-card" data-goto="${e.id}">
              <span class="home-mod-ic">${e.icon}</span>
              <span class="home-mod-body">
                <div class="home-mod-title">${e.title}</div>
                <div class="home-mod-desc">${e.desc || ''}</div>
              </span>
            </button>`).join('')}
        </div>
      </div>
    </div>
  `;

  const onClick = (e) => {
    const btn = e.target.closest('[data-goto]');
    if (btn) window.location.hash = btn.dataset.goto;
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
