/* Fundamentals · landing ("Why Fundamentals"). Overrides the Iteration-0
   skeleton home with a polished overview that links into every concept. */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fundamentals = viz.P.fundamentals || {};
  const B = (viz.P.fundamentals.Modules = viz.P.fundamentals.Modules || {});

  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  B.foundationsHome = {
    render(canvas) {
      const groups = (viz.P.fundamentals.navGroups || []).filter(g => g.items[0].id !== 'foundations-home');
      const cards = groups.map(g => {
        const items = g.items.map(i =>
          `<li><a data-go="${i.id}"><span>${i.icon}</span><span>${esc(i.label)}</span></a></li>`).join('');
        return `<div class="fund-home-card"><div class="fund-home-card__title">${g.label}</div><ul class="fund-home-list">${items}</ul></div>`;
      }).join('');

      canvas.innerHTML =
        '<div class="mod-page fund-page">' +
          '<div class="home-hero">' +
            '<div class="home-hero-badge">🧭 Fundamentals of Data Warehousing</div>' +
            '<h1 class="home-hero-title">Learn the concept once. See all three clouds do it.</h1>' +
            '<p class="home-hero-sub">Every cloud warehouse solves the same core problems — storing data for analytics, getting it in, scanning it fast, keeping it safe and affordable. ' +
            'This section teaches each <strong>fundamental</strong> in a vendor-neutral way, then shows at a high level how <strong>Snowflake</strong>, <strong>Amazon Redshift</strong> and <strong>Microsoft Fabric</strong> each handle it. ' +
            'Special focus on <strong>how data gets into the warehouse</strong>.</p>' +
          '</div>' +
          '<div class="fund-home-steps">' +
            '<span class="fund-home-step"><b>1.</b> Read the concept (the skeleton)</span>' +
            '<span class="fund-home-step"><b>2.</b> Watch the animated walkthrough</span>' +
            '<span class="fund-home-step"><b>3.</b> See the 3-cloud mapping</span>' +
            '<span class="fund-home-step"><b>4.</b> Go deeper → Compare</span>' +
          '</div>' +
          '<div class="fund-home-grid">' + cards + '</div>' +
        '</div>';

      canvas.querySelectorAll('.fund-home-list a[data-go]').forEach(a =>
        a.addEventListener('click', () => viz.navigate && viz.navigate(a.dataset.go)));

      return { destroy() {} };
    },
  };
})();
