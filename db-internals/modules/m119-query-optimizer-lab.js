export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🎯</div>
    <h3>Query Optimizer Lab</h3>
    <p>Generate query plans, compare costs, push predicates down, reorder joins.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Labs — Full animation coming soon</p>
  </div>`;
  return null;
}
