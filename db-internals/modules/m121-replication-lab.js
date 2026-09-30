export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔁</div>
    <h3>Replication Lab</h3>
    <p>Simulate a leader + 2 followers — inject lag, kill the leader, watch election.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
