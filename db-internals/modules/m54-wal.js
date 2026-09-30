export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📝</div>
    <h3>WAL</h3>
    <p>Write-Ahead Log: write the log before the page — the foundation of crash recovery in every modern RDBMS.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
