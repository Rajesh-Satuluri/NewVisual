export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔏</div>
    <h3>Isolation</h3>
    <p>Concurrent transactions appear to execute serially — no phantom reads or dirty data during the traffic spike.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
