export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📸</div>
    <h3>MVCC</h3>
    <p>Multi-Version Concurrency Control: readers never block writers — each transaction sees a consistent snapshot.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
