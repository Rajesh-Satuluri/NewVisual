/* router.js — hash router: #/<lesson>/<step>. Parses and serializes. */

export function parseHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const [lesson = '', step = ''] = raw.split('/');
  return { lesson: lesson || null, step: step ? Math.max(0, parseInt(step, 10) || 0) : 0 };
}

export function toHash({ lesson, step }) {
  return '#/' + (lesson || '') + (step ? '/' + step : '');
}

export function onRoute(fn) {
  const handler = () => fn(parseHash());
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}

export function go({ lesson, step }) {
  const next = toHash({ lesson, step });
  if (location.hash !== next) location.hash = next;
}
