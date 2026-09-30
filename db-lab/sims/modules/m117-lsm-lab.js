export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📚</div>
    <h3>LSM Lab</h3>
    <p>Fill the MemTable, trigger a flush, watch compaction — the LSM write path live.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
