export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">💳</div>
    <h3>Follow the Transaction</h3>
    <p>Trace one COMMIT — WAL flush, lock release, visibility change, checkpoint.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
