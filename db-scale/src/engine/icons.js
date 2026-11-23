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
  // ── glyphs placed on isometric forms (storage-engines visual language) ──
  server: '<rect x="3" y="4" width="18" height="7" rx="1.6"/><rect x="3" y="13" width="18" height="7" rx="1.6"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  listOrdered: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4.3 4.8 5.6 4.3v4M4.2 14.4h2l-2 3.1h2.3"/>',
  scroll: '<path d="M7 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7"/><path d="M7 4a2 2 0 0 0-2 2v2h4V6a2 2 0 0 0-2-2Z"/><path d="M9.5 9.5h6M9.5 13h6M9.5 16.5h3.5"/>',
  file: '<path d="M6 3h7.5L19 8.5V21H6Z"/><path d="M13.5 3v5.5H19"/><path d="M9 13h7M9 16.5h7"/>',
  app: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 9.5 11 12l-2.5 2.5M13 14.5h3"/>',
  // ── top-bar + chrome glyphs ──
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z"/><path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
  sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2.3"/><circle cx="9" cy="16" r="2.3"/>',
  grid: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.6"/>',
  moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  sun: '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3.3 2.8 14.7 0 18M12 3c-2.8 3.3-2.8 14.7 0 18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.2h8A1.5 1.5 0 0 1 20.5 9.7V18A1.5 1.5 0 0 1 19 19.5H4.5A1.5 1.5 0 0 1 3 18Z"/>',
  bolt: '<path d="M13 2 4.5 13.5H10l-1 8.5L19 10.5h-5.5Z"/>',
  scale: '<path d="M12 3v18M6 21h12M7 6h10M7 6 4 13h6ZM17 6l-3 7h6Z"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
export const ICON_NAMES = Object.keys(P);
export const ICON_PATHS = P;
