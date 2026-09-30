/* Compare — At a Glance (overview matrix). */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.CompareKit;

  function render(container) {
    K.injectStyles();
    const rows = TV.CompareData.matrix.map(r => `
      <tr>
        <td class="cmp-td-dim">${K.esc(r.dim)}</td>
        <td class="cmp-td-ice">${K.esc(r.iceberg)}</td>
        <td class="cmp-td-delta">${K.esc(r.delta)}</td>
        <td class="cmp-td-hudi">${K.esc(r.hudi || '—')}</td>
      </tr>`).join('');
    const concepts = TV.CompareData.concepts;
    container.className = '';
    container.innerHTML = `
<div class="cmp-page page-enter">
  <div class="cmp-wrap">
    <h1 class="cmp-h1">Iceberg vs Delta vs Hudi — At a Glance</h1>
    <p class="cmp-lead">Three open table formats that all add ACID transactions, time travel, schema evolution, and data
      skipping over columnar files. They differ most in how they record table state — Iceberg's immutable snapshot tree,
      Delta's replayed transaction log, and Hudi's timeline over keyed file groups — and in their ecosystem center of
      gravity. Pick a topic below to see the mechanism side by side.</p>
    <div class="cmp-matrix-wrap">
      <table class="cmp-matrix">
        <thead>
          <tr>
            <th class="cmp-th-dim">Dimension</th>
            <th class="cmp-th-ice">${K.ICE_MARK} Apache Iceberg</th>
            <th class="cmp-th-delta">${K.DELTA_MARK} Delta Lake</th>
            <th class="cmp-th-hudi">${K.HUDI_MARK} Apache Hudi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="cmp-jump">
      <span class="cmp-jump__label">Deep dive</span>
      ${Object.keys(concepts).map(id => `<a href="#compare/${id}">${K.esc(concepts[id].title)}</a>`).join('')}
      <a href="#compare/delete-compare">Delete: CoW vs MoR ▶</a>
    </div>
  </div>
</div>`;
  }

  TV.registerModule('compare', {
    id: 'overview', title: 'At a Glance', group: 'overview', format: 'compare',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
