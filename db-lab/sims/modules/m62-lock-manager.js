export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🗝️</div>
    <h3>Lock Manager</h3>
    <p>The lock table, grant/wait queues, and lock escalation — the gatekeeper of concurrent access.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
