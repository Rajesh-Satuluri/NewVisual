import { MODULES } from '../components/nav.js';

const GROUPS = ['Platform','GraphCube','IBPL Language','Data Model Deep Dive','Operations','Practice'];

export function mount(container) {
  const byGroup = {};
  MODULES.forEach(m => { (byGroup[m.group] = byGroup[m.group] || []).push(m); });

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">o9 Solutions · Digital Brain</div>
        <h1 class="module-title">GraphCube &amp; IBPL Visualizer</h1>
        <p class="module-subtitle">An interactive field guide to how the o9 platform stores planning data (the GraphCube) and how you talk to it (IBPL — the Integrated Business Planning Language). Every example is grounded in a real <b>CAT aftermarket-parts</b> tenant config.</p>
      </div>

      <div class="section-pad">
        <div class="callout sql" style="margin-top:0">
          <b>⚠️ IBPL is not SQL.</b> The guides loosely say "IBPL is SQL for a cube," but the language is genuinely different:
          dimensions are joined with <code style="color:var(--accent)">*</code>, measures live in <code style="color:var(--accent)">{ }</code>,
          <b>Version is mandatory</b> (skip it → 0 rows), writes use <code style="color:var(--accent)">scope: … end scope;</code> (7 variants),
          joins are <b>graph edges</b> (<code style="color:var(--accent)">From/To/Edge/RelationshipType</code>), and <code style="color:var(--accent)">==</code> compares while <code style="color:var(--accent)">=</code> assigns.
          This tool teaches the differences explicitly.
        </div>

        <div class="card-grid">
          <div class="card">
            <h4>🧊 How data is stored</h4>
            <p>The GraphCube isn't an OLAP cube — dimensions are <span class="k">nodes in a graph</span>, measures live at intersections, and values aggregate along edges. Sparse, columnar, key-addressed.</p>
          </div>
          <div class="card">
            <h4>🔎 How you query it</h4>
            <p><span class="k">Select</span> statements read cells; <span class="k">scope</span> statements write them. Filters, hierarchy navigation, the <span class="k">@</span> operator, spreading rules — all with real worked outputs.</p>
          </div>
          <div class="card">
            <h4>🏭 Real CAT tenant</h4>
            <p>Dimensions <span class="k">Item · LogisticsCenter · Customer · Supplier · PlanningCalendar · Version</span>, real measure groups and lag measures from CAT Demand / Supply / Inventory plans.</p>
          </div>
          <div class="card">
            <h4>🎯 Interview-ready</h4>
            <p>Every module ends with senior-level interview Q&amp;A sourced from real o9 consultant interview rounds, grounded in the tenant config.</p>
          </div>
        </div>

        <h3 style="font-size:17px;font-weight:800;margin:28px 0 4px">21 modules across 6 tracks</h3>
        <p class="lead" style="margin-bottom:16px">Start anywhere, or follow the order below. Your progress is saved in this browser.</p>

        ${GROUPS.map(g => `
          <div style="margin-bottom:22px">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--accent);margin-bottom:10px">${g}</div>
            <div class="card-grid" style="margin:0">
              ${(byGroup[g]||[]).map(m => `
                <a class="card home-card" href="#${m.id}" style="text-decoration:none;cursor:pointer;display:block">
                  <h4>${m.icon} ${m.label}</h4>
                  <p>${m.desc}</p>
                </a>`).join('')}
            </div>
          </div>`).join('')}

        <div class="callout" style="margin-top:8px">
          <b>Conceptual model.</b> This tool explains o9's architecture and IBPL from public docs and the shared quick-reference. GraphCube internals are kept abstract — it is a learning aid, not o9's proprietary storage format.
        </div>
      </div>
    </div>
  `;

  const onClick = (e) => {
    const card = e.target.closest('.home-card');
    if (card) { e.preventDefault(); location.hash = card.getAttribute('href').slice(1); }
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
