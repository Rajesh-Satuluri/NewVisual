export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🌸</div>
    <h3>Bloom Filter</h3>
    <p>Probabilistic existence check — avoid reading SSTables that definitely don't contain a key.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Storage Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
