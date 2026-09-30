export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">⚡</div>
    <h3>Concurrency Lab</h3>
    <p>Run two transactions concurrently on shared rows — observe anomalies by isolation level.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
