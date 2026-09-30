export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">⏩</div>
    <h3>Redo</h3>
    <p>Replay committed changes from the WAL checkpoint forward — bring pages up to the crash point.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Transactions — Full animation coming soon</p>
  </div>`;
  return null;
}
