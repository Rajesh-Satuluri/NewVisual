export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🗳️</div>
    <h3>Consensus Lab</h3>
    <p>Raft in slow-motion — election, log replication, leader failure, split vote.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
