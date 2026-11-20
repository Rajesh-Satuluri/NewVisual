/* icons.js — inline SVG icon registry (Designed-to-Scale approach: no icon
   font, no raster). 24×24 viewBox paths, stroke uses currentColor. */

const P = {
  database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M2 13l10 5 10-5"/>',
  wal: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gauge: '<path d="M12 13 7 8"/><circle cx="12" cy="13" r="1.5"/><path d="M3 13a9 9 0 0 1 18 0"/>',
  merge: '<path d="M6 3v6a6 6 0 0 0 6 6h6"/><path d="M6 21v-6"/><path d="m15 12 3 3-3 3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2M16 7l2 2"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  flush: '<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
export const ICON_NAMES = Object.keys(P);
