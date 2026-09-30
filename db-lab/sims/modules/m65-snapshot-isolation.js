export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🕐</div>
    <h3>Snapshot Isolation</h3>
    <p>Read from a snapshot taken at transaction start — how PostgreSQL and MySQL InnoDB serve Prime Day reads without blocking.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
