export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">💀</div>
    <h3>Deadlocks</h3>
    <p>Transaction A waits for B, B waits for A — detection via wait-for graph and resolution by aborting the victim.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
