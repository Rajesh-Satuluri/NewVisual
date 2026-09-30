export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔐</div>
    <h3>Locks</h3>
    <p>Shared (S) and Exclusive (X) locks — the mechanism that enforces isolation between concurrent Prime Day orders.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
