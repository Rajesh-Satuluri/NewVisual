export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📊</div>
    <h3>Isolation Levels</h3>
    <p>READ UNCOMMITTED → READ COMMITTED → REPEATABLE READ → SERIALIZABLE — the anomalies each level prevents.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
