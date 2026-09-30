export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🎮</div>
    <h3>Concurrency Simulator</h3>
    <p>Interactive simulator: run two transactions concurrently and observe dirty reads, lost updates, and phantoms.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
