export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔗</div>
    <h3>OLTP→CDC→Kafka→OLAP</h3>
    <p>The full modern pipeline: transactional DB → CDC → Kafka → stream processor → OLAP.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">DDIA — Full animation coming soon</p>
  </div>`;
  return null;
}
