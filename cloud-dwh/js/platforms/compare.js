/* Compare screen (stub) */
(function(){
  const viz=(window.CDWH=window.CDWH||{}); viz.Compare=viz.Compare||{};
  viz.Compare.render=function(canvas){
    canvas.innerHTML = `<div class="mod-page stub-page">
      <div class="stub-head"><div class="stub-icon">⇄</div>
        <div><h1 class="stub-title">Compare Platforms</h1>
        <p class="stub-purpose">Side-by-side: Snowflake vs Amazon Redshift vs Microsoft Fabric — same Netflix workload, three warehouses.</p></div>
        <span class="stub-badge">Phase C</span></div>
      <div class="stub-section"><div class="stub-section-title">Planned content</div>
        <ul class="stub-list">
          <li>Architecture & storage/compute model, side by side</li>
          <li>Distribution/partitioning & performance levers</li>
          <li>Ecosystem, sharing, ML, and governance matrix</li>
          <li>Cost model & "when to pick which" decision guide</li>
        </ul></div>
      <p class="stub-foot">The comparison matrix is built in a later iteration.</p></div>`;
    return { destroy(){} };
  };
})();
