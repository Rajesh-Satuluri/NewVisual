// Global scenario switcher (I12) — renders the header toggle and
// re-renders the current view when the active scenario changes.
import { SCENARIOS, getScenarioId, setScenario, onScenarioChange } from '../data/scenarios.js';

export function initScenarioSwitcher(onChange) {
  const host = document.getElementById('scenario-switcher');
  if (!host) return;
  const render = () => {
    const cur = getScenarioId();
    host.innerHTML = Object.values(SCENARIOS).map(s =>
      `<button class="scenario-btn${s.id === cur ? ' active' : ''}" data-id="${s.id}" title="${s.name}">
        <span class="sc-ico">${s.icon}</span><span>${s.short}</span>
      </button>`).join('');
    host.querySelectorAll('.scenario-btn').forEach(b =>
      b.addEventListener('click', () => setScenario(b.dataset.id)));
  };
  render();
  onScenarioChange(() => { render(); if (typeof onChange === 'function') onChange(); });
}
