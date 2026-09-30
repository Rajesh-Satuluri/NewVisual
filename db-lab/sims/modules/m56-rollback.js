export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">↩️</div>
    <h3>Rollback</h3>
    <p>Undo all changes via the WAL — what happens when the inventory check fails mid-transaction.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
