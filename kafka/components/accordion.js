// Shared smooth accordion for `.ca-card` lists (Incident Bank, Troubleshooting
// Lab, Choose-the-Approach, Coding Dojo, CDC Incident Lab, Level-Up Answers).
//
// The old pattern re-rendered the whole list on every open/close, which tore
// the DOM down and rebuilt it — so the browser had nothing to animate and the
// panel just snapped. This wires the toggle *in place* instead: a `.open` class
// on the card drives a CSS grid-rows 0fr→1fr transition on the `.ca-card-acc`
// wrapper (the same technique the Q&A accordion uses — animates to the body's
// true height, any height, no JS measuring). Bodies fill lazily on first open
// and stay in the DOM so collapse animates too.
//
// Markup each card must use:
//   <div class="ca-card[ open]" data-id="X">
//     <button class="ca-card-head" aria-expanded="true|false">…</button>
//     <div class="ca-card-acc"><div class="ca-card-body"></div></div>
//   </div>
//
// Options:
//   fillBody(bodyEl, id)  — populate + wire a body once (idempotent; may guard
//                           with bodyEl.dataset.filled). Omit when the template
//                           already renders body content inline.
//   onToggle(id, isOpen)  — mirror open state back into the module's state so a
//                           later filter re-render restores the open card.
//   single (default true) — opening a card closes its siblings. Pass false for
//                           independent multi-open (e.g. Coding "reveal all").
export function initAccordion(listEl, { fillBody, onToggle, single = true } = {}) {
  if (!listEl) return;
  const cards = [...listEl.querySelectorAll('.ca-card')];

  const bodyOf = card => card.querySelector('.ca-card-body');
  const headOf = card => card.querySelector('.ca-card-head');

  function setState(card, open) {
    card.classList.toggle('open', open);
    const head = headOf(card);
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  cards.forEach(card => {
    const head = headOf(card);
    if (!head) return;

    // Fill any card that starts open so its body has true height to animate from.
    if (card.classList.contains('open') && fillBody) {
      const body = bodyOf(card);
      if (body) fillBody(body, card.dataset.id);
    }

    head.addEventListener('click', () => {
      const willOpen = !card.classList.contains('open');

      if (single && willOpen) {
        cards.forEach(other => {
          if (other !== card && other.classList.contains('open')) {
            setState(other, false);
            if (onToggle) onToggle(other.dataset.id, false);
          }
        });
      }

      if (willOpen && fillBody) {
        const body = bodyOf(card);
        if (body) fillBody(body, card.dataset.id);
      }

      setState(card, willOpen);
      if (onToggle) onToggle(card.dataset.id, willOpen);
    });
  });
}
