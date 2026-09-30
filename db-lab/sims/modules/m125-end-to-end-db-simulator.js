export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🖥️</div>
    <h3>End-to-End DB Simulator</h3>
    <p>The full stack: client → parser → optimizer → executor → buffer pool → WAL → disk.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
