// First-run guided tour — a few dismissible coach-marks, shown once.
const FLAG = 'databricks_tour_done';

const STEPS = [
  { sel: '#sidebar',      title: 'Your module map', body: '13 lessons grouped by topic — Foundation, Compute, Governance, Orchestration, and Operations. Progress is tracked automatically.' },
  { sel: '.module-tabs',  title: 'Explore each topic', body: 'Every module has multiple tabs — architecture diagrams, comparisons, configs, and interview Q&A. Click through them.' },
  { sel: '#theme-toggle', title: 'Make it yours', body: 'Toggle light/dark here. On a phone or tablet, the ☰ button opens the module menu.' },
  { sel: null,            title: 'Power moves ⚡', body: 'Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> to jump to any module, and open the <strong>Study Hub</strong> to review every interview question in one place.' },
];

export function maybeRunTour({ force = false } = {}) {
  try { if (!force && localStorage.getItem(FLAG)) return; } catch (e) {}
  const steps = STEPS.filter(s => !s.sel || document.querySelector(s.sel));
  if (!steps.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `
    <div class="tour-ring" hidden></div>
    <div class="tour-pop" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div class="tour-title"></div>
      <div class="tour-body"></div>
      <div class="tour-foot">
        <span class="tour-progress"></span>
        <span class="tour-btns">
          <button class="quiz-btn tour-skip">Skip</button>
          <button class="quiz-btn primary tour-next"></button>
        </span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const ring = overlay.querySelector('.tour-ring');
  const pop = overlay.querySelector('.tour-pop');
  const titleEl = overlay.querySelector('.tour-title');
  const bodyEl = overlay.querySelector('.tour-body');
  const progEl = overlay.querySelector('.tour-progress');
  const nextBtn = overlay.querySelector('.tour-next');

  let i = 0;
  function finish() {
    try { localStorage.setItem(FLAG, '1'); } catch (e) {}
    overlay.remove();
    window.removeEventListener('resize', place);
  }
  function place() {
    const step = steps[i];
    const el = step.sel && document.querySelector(step.sel);
    if (el) {
      const r = el.getBoundingClientRect();
      ring.hidden = false;
      ring.style.cssText = `top:${r.top - 6}px;left:${r.left - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
      const spaceRight = window.innerWidth - r.right;
      if (spaceRight > 340) {
        pop.style.top = `${Math.min(r.top, window.innerHeight - 220)}px`;
        pop.style.left = `${r.right + 18}px`; pop.style.right = 'auto'; pop.style.transform = 'none';
      } else {
        pop.style.top = `${Math.min(r.bottom + 14, window.innerHeight - 220)}px`;
        pop.style.left = `${Math.max(16, r.left)}px`; pop.style.right = 'auto'; pop.style.transform = 'none';
      }
    } else {
      ring.hidden = true;
      pop.style.top = '50%'; pop.style.left = '50%'; pop.style.right = 'auto'; pop.style.transform = 'translate(-50%, -50%)';
    }
  }
  function render() {
    const step = steps[i];
    titleEl.textContent = step.title;
    bodyEl.innerHTML = step.body;
    progEl.textContent = `${i + 1} / ${steps.length}`;
    nextBtn.textContent = i === steps.length - 1 ? 'Done' : 'Next →';
    place();
  }

  nextBtn.addEventListener('click', () => { if (i === steps.length - 1) finish(); else { i++; render(); } });
  overlay.querySelector('.tour-skip').addEventListener('click', finish);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) finish(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { finish(); document.removeEventListener('keydown', esc); } });
  window.addEventListener('resize', place);
  render();
}
