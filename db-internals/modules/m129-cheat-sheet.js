export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📝</div>
    <h3>Cheat Sheet</h3>
    <p>One-page reference: latency numbers, formulas, ACID rules, isolation anomalies.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Learning — Full animation coming soon</p>
  </div>`;
  return null;
}
