export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🗜️</div>
    <h3>Compaction</h3>
    <p>Merging SSTables to reclaim space and limit read amplification — the background tax of write-optimized storage.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Storage Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
