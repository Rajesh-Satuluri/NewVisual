# App Icon & Opening Animation — Reference Guide

A reusable recipe for giving any tool in this repo a **home-screen icon** and an
**animated launch splash** that work as an installed web app on iPad (and iPhone,
Android, desktop). Extracted from the Kafka visualizer. Everything here is plain
HTML/CSS/SVG — no build step, no libraries, no service worker required.

> Replace the two brand constants everywhere:
> - **Accent** `#FF6900` (orange) → your tool's accent color
> - **Background** `#0A0E1A` / `#141B2E` (near-black navy) → your tool's dark bg
> - **Name** `Kafka` / `Kafka Viz` → your tool's name
> - The 4-node / hub SVG mark → your tool's glyph

---

## 0. What you end up with

1. A tab **favicon** (crisp SVG + PNG fallback).
2. A **home-screen icon** when "Add to Home Screen" is used on iPad/iPhone
   (`apple-touch-icon`) and on Android/desktop (manifest `icons`).
3. A full-screen **launch image** iOS shows while the app boots in standalone
   mode (`apple-touch-startup-image`, one per device/orientation).
4. An **animated in-page splash** (the mark draws itself + the name fades in)
   that covers the first paint and is removed once the app is ready. This is
   what the user actually watches; the static startup image only fills the gap
   before the first HTML paint.

The static startup image and the animated splash are designed to look identical
at rest, so the hand-off between them is invisible.

---

## 1. File inventory

Put these next to the tool's `index.html`:

```
favicon.svg              # vector icon, scalable, used by modern browsers
favicon-32.png           # 32×32 PNG fallback for old browsers
apple-touch-icon.png     # 180×180 PNG, iOS home screen (NO transparency, NO rounding — iOS rounds it)
icon-192.png             # 192×192 PNG, manifest (purpose: any maskable)
icon-512.png             # 512×512 PNG, manifest (purpose: any maskable)
manifest.json            # PWA manifest
splash/                  # one PNG per device × orientation (see §5)
```

Generate the PNGs from the SVG once (e.g. with `rsvg-convert`, `sharp`, or any
exporter). Keep the SVG as the source of truth.

**Maskable note:** for `icon-192`/`icon-512` (`purpose: "any maskable"`), keep
the glyph inside the center ~80% "safe zone" and let the background fill the
whole square, so Android's mask can crop the edges without clipping the glyph.
`apple-touch-icon.png` must be a **full opaque square** with **square corners** —
iOS applies its own rounded-rectangle mask; if you pre-round it you get a
double-rounded look.

---

## 2. The icon mark (SVG)

The Kafka mark is a stylized node graph: a white **hub** on the left, three
orange **arms** fanning out to four ringed **nodes**, on a rounded dark tile with
a soft radial glow. Adapt the glyph; keep the construction pattern.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg"  x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#141B2E"/><stop offset="1" stop-color="#0A0E1A"/>
    </linearGradient>
    <linearGradient id="arm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF8A3D"/><stop offset="1" stop-color="#FF6900"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.6">
      <stop offset="0" stop-color="#FF6900" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FF6900" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- rounded tile (rx ≈ 18% of size) + glow -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect width="512" height="512" rx="96" fill="url(#glow)"/>

  <!-- arms -->
  <g stroke="url(#arm)" stroke-width="22" stroke-linecap="round" fill="none">
    <line x1="224" y1="150" x2="224" y2="362"/>
    <line x1="224" y1="256" x2="372" y2="156"/>
    <line x1="224" y1="256" x2="372" y2="356"/>
  </g>

  <!-- ringed nodes: solid accent disc + dark center hole -->
  <circle cx="224" cy="150" r="40" fill="#FF6900"/><circle cx="224" cy="150" r="17" fill="#0A0E1A"/>
  <circle cx="224" cy="362" r="40" fill="#FF6900"/><circle cx="224" cy="362" r="17" fill="#0A0E1A"/>
  <circle cx="372" cy="156" r="40" fill="#FF6900"/><circle cx="372" cy="156" r="17" fill="#0A0E1A"/>
  <circle cx="372" cy="356" r="40" fill="#FF6900"/><circle cx="372" cy="356" r="17" fill="#0A0E1A"/>

  <!-- white hub -->
  <circle cx="224" cy="256" r="30" fill="#FFFFFF"/>
</svg>
```

Design rules worth keeping for a new glyph:
- **Rounded tile** with `rx` ≈ 18% of the side, dark gradient top-left → bottom.
- **Accent gradient** on strokes (a lighter tint → the base accent) reads richer
  than a flat fill at small sizes.
- Keep strokes thick (`stroke-width` ~4% of viewBox) and `stroke-linecap:round`
  so the mark survives being shrunk to a 32px favicon.
- One **white focal element** gives the eye an anchor.

---

## 3. `<head>` wiring

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#FF6900" />

<!-- Icons & PWA -->
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<link rel="manifest" href="manifest.json" />

<!-- iOS standalone web-app -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Kafka" />
```

- `viewport-fit=cover` + `black-translucent` status bar let the app go
  edge-to-edge under the notch/status bar; pair with `env(safe-area-inset-*)`
  padding (see §7) so content isn't clipped.
- `apple-mobile-web-app-title` is the name shown under the home-screen icon.
- `theme-color` tints the iOS/Android UI chrome; use your accent.

---

## 4. `manifest.json`

```json
{
  "name": "Apache Kafka Visualizer — Amazon Edition",
  "short_name": "Kafka Viz",
  "description": "Interactive Apache Kafka learning platform.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0A0E1A",
  "theme_color": "#FF6900",
  "icons": [
    { "src": "favicon.svg",  "sizes": "any",     "type": "image/svg+xml", "purpose": "any" },
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png",     "purpose": "any maskable" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png",     "purpose": "any maskable" }
  ]
}
```

- `display: "standalone"` removes the browser chrome when launched from the home
  screen — this is what makes the startup image and splash matter.
- `start_url`/`scope` are **relative** (`./`) so the same manifest works
  wherever the tool is hosted (sub-path on GitHub Pages, etc.).
- `background_color` should equal your splash background — it's what the OS
  paints behind the app before first render on Android.

---

## 5. iOS launch (startup) images — the iPad part

iOS only shows a startup image when there is an **exact** media-query match for
the device's CSS size, pixel ratio, and orientation. So you ship one PNG per
device × orientation. Each PNG is the full screen at native resolution, with the
icon centered on the splash background — it should look like frame 1 of the
animation at rest.

```html
<!-- iOS launch (startup) images -->
<!-- iPad 9.7" -->
<link rel="apple-touch-startup-image"
      media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      href="splash/ipad-97-portrait.png" />
<link rel="apple-touch-startup-image"
      media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
      href="splash/ipad-97-landscape.png" />
<!-- …repeat for every target device/orientation… -->
```

**iPad CSS size / DPR matrix** (device-width × device-height, all `-webkit-device-pixel-ratio: 2`):

| Device                      | CSS W × H (portrait) | PNG px (portrait) |
|-----------------------------|----------------------|-------------------|
| iPad 9.7"                    | 768 × 1024           | 1536 × 2048       |
| iPad 10.2"                   | 810 × 1080           | 1620 × 2160       |
| iPad mini 6                 | 744 × 1133           | 1488 × 2266       |
| iPad 10.5" / Air            | 834 × 1112           | 1668 × 2224       |
| iPad Air 10.9"              | 820 × 1180           | 1640 × 2360       |
| iPad Pro 11"                | 834 × 1194           | 1668 × 2388       |
| iPad Pro 12.9"              | 1024 × 1366          | 2048 × 2732       |

Landscape = swap width/height in both the media query (`orientation: landscape`)
and the image dimensions. The Kafka build also ships the iPhone matrix (SE, 8,
8+, X, XR, XS Max, 12, 12 Pro Max, 14 Pro, 14 Pro Max) — same pattern, DPR 2 or
3 per model.

Tips:
- Don't guess the numbers — generate the `<link>` list and the PNGs from the
  table with a small script so a new device is one row, not hand-edited HTML.
- A **missing** match just means iOS shows a blank `background_color` screen —
  harmless, so cover the common targets and move on; the in-page splash (§6)
  catches everyone else.

---

## 6. The animated in-page splash

This is the part the user actually watches. It's a full-screen overlay that is
**the first thing in `<body>`**, so it paints immediately (before any JS module
loads), then self-removes when the app is ready. The mark draws itself
(stroke-dash reveal), nodes pop in, the hub scales up and pulses, and the name
fades up.

### 6a. Styles (in `<head>`)

```html
<style>
  #splash{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:22px;
    background:radial-gradient(circle at 50% 42%, #141B2E 0%, #0A0E1A 70%);
    transition:opacity .5s ease, visibility .5s ease;}
  #splash.hide{opacity:0;visibility:hidden;}
  #splash svg{width:140px;height:116px;overflow:visible;}

  /* arms: draw themselves via stroke-dash */
  #splash .sp-line{stroke:#FF6900;stroke-width:9;stroke-linecap:round;fill:none;
    stroke-dasharray:260;stroke-dashoffset:260;animation:sp-draw .7s ease forwards;}
  #splash .sp-line.l2{animation-delay:.22s;}
  #splash .sp-line.l3{animation-delay:.42s;}

  /* nodes: pop in (overshoot easing), per-node delay set inline */
  #splash .sp-node{fill:#FF6900;transform-box:fill-box;transform-origin:center;
    opacity:0;animation:sp-pop .42s cubic-bezier(.2,1.4,.4,1) forwards;}
  #splash .sp-dot{fill:#0A0E1A;}

  /* hub: scale in, then gentle infinite pulse */
  #splash .sp-hub{fill:#fff;transform-box:fill-box;transform-origin:center;
    animation:sp-hub .5s cubic-bezier(.2,1.4,.4,1) .3s both,
              sp-pulse 1.5s ease-in-out 1s infinite;}

  /* wordmark fades up last */
  #splash .sp-word{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:30px;
    letter-spacing:-1px;color:#fff;opacity:0;transform:translateY(10px);
    animation:sp-word .5s ease .6s forwards;}

  @keyframes sp-draw{to{stroke-dashoffset:0;}}
  @keyframes sp-pop {0%{opacity:0;transform:scale(.3);}100%{opacity:1;transform:scale(1);}}
  @keyframes sp-hub {0%{opacity:0;transform:scale(.3);}100%{opacity:1;transform:scale(1);}}
  @keyframes sp-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.16);}}
  @keyframes sp-word{to{opacity:1;transform:translateY(0);}}

  /* accessibility: respect reduced-motion — show the end state instantly */
  @media (prefers-reduced-motion:reduce){
    #splash *{animation-duration:.01s!important;animation-delay:0s!important;
      stroke-dashoffset:0!important;opacity:1!important;transform:none!important;}
  }
</style>
```

### 6b. Markup (first element in `<body>`)

```html
<div id="splash" role="img" aria-label="Kafka Visualizer loading">
  <svg viewBox="0 0 210 180" aria-hidden="true">
    <line class="sp-line l1" x1="40" y1="16"  x2="40"  y2="164"/>
    <line class="sp-line l2" x1="40" y1="90"  x2="186" y2="22"/>
    <line class="sp-line l3" x1="40" y1="90"  x2="186" y2="158"/>
    <g class="sp-node" style="animation-delay:.15s"><circle cx="40"  cy="16"  r="18"/></g>
    <g class="sp-node" style="animation-delay:.3s" ><circle cx="40"  cy="164" r="18"/></g>
    <g class="sp-node" style="animation-delay:.45s"><circle cx="186" cy="22"  r="18"/></g>
    <g class="sp-node" style="animation-delay:.55s"><circle cx="186" cy="158" r="18"/></g>
    <circle class="sp-dot" cx="40"  cy="16"  r="7.5"/>
    <circle class="sp-dot" cx="40"  cy="164" r="7.5"/>
    <circle class="sp-dot" cx="186" cy="22"  r="7.5"/>
    <circle class="sp-dot" cx="186" cy="158" r="7.5"/>
    <circle class="sp-hub" cx="40"  cy="90"  r="13"/>
  </svg>
  <div class="sp-word">Kafka</div>
</div>
```

### 6c. Remove-on-ready script (right after the markup)

```html
<script>
(function(){
  var s = document.getElementById('splash'); if(!s) return;
  var start = Date.now();
  function done(){
    // guarantee a minimum on-screen time so the animation isn't cut off on fast loads
    var wait = Math.max(0, 1000 - (Date.now() - start));
    setTimeout(function(){
      s.classList.add('hide');                               // fade out (CSS transition)
      setTimeout(function(){ if(s && s.parentNode) s.parentNode.removeChild(s); }, 600);
    }, wait);
  }
  if (document.readyState === 'complete') done();
  else window.addEventListener('load', done);
  setTimeout(done, 4000);  // hard fallback so the splash can never get stuck
})();
</script>
```

**Why it's built this way**
- **Inline, first in `<body>`, no imports** → it renders on the very first paint,
  before your module JS is even fetched. No flash of unstyled/empty app.
- **Minimum 1s display** (`1000 - elapsed`) → the animation always gets to play
  even if the page loads instantly; avoids an ugly flicker.
- **`load` event + 4s hard fallback** → the splash is removed when assets are
  ready, but can never hang if something stalls.
- **Fade then `removeChild`** → the 600ms matches the CSS opacity transition;
  removing the node (not just hiding it) frees the overlay so it can't trap taps.
- **`prefers-reduced-motion`** → jumps straight to the final frame.
- **Staggered delays** (`.15s`, `.22s`, `.3s`…) are what make it feel composed
  rather than everything appearing at once: arms draw → nodes pop → hub scales →
  word fades. The hub's infinite `sp-pulse` gives a "working…" heartbeat.

Keep the splash SVG geometry **identical** to the startup-image/icon glyph so the
static iOS launch image dissolves seamlessly into the live animation.

---

## 7. Supporting iPad / standalone polish (optional but recommended)

```html
<style>
  html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
  html,body{overscroll-behavior:none}             /* kill rubber-band scroll chaining */
  body{-webkit-tap-highlight-color:transparent}
  button,a,label,select,[role="button"],[role="tab"],.btn{touch-action:manipulation} /* no 300ms tap delay / dbl-tap zoom */
  img,svg,canvas{-webkit-user-drag:none}
  @media (hover:none) and (pointer:coarse){
    button,select,[role="button"],[role="tab"],.btn{
      -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    input,select,textarea{font-size:max(16px,1em)!important} /* ≥16px stops iOS zoom-on-focus */
  }
  @supports (padding:env(safe-area-inset-left)){
    @media (display-mode:standalone){
      body{padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
    }
  }
</style>
```

Optional extra for canvas-heavy tools: the Kafka build also upscales every 2D
canvas backing store to `devicePixelRatio` (capped at 3) so drawings stay crisp
on Retina iPads while draw code keeps using logical coordinates. Only needed if
your tool renders to `<canvas>`.

---

## 8. Porting checklist for a new tool

- [ ] Design the glyph in one 512×512 SVG (`favicon.svg`), dark rounded tile +
      accent mark + one white focal element.
- [ ] Export PNGs: `favicon-32`, `apple-touch-icon` (180, opaque, square
      corners), `icon-192`, `icon-512` (maskable safe-zone).
- [ ] Write `manifest.json` with relative `start_url`/`scope`, your colors, the
      three icons.
- [ ] Add the `<head>` block (§3): viewport, theme-color, icon links, apple meta.
- [ ] Generate `splash/*.png` + the `apple-touch-startup-image` links from the
      device matrix (§5). Center the glyph on the splash background.
- [ ] Paste the animated splash: styles in `<head>`, markup as first
      `<body>` child, remove-on-ready script right after (§6). Recolor + rename.
- [ ] Keep splash SVG geometry identical to the icon glyph.
- [ ] Add the iPad polish CSS (§7).
- [ ] Test: Safari on iPad → Share → **Add to Home Screen** → launch; confirm
      icon, startup image, and that the animation plays then clears to the app.
- [ ] Test `prefers-reduced-motion` (Settings → Accessibility → Motion) shows the
      static end state with no animation.

---

### Brand constants used in Kafka (swap per tool)

| Token            | Kafka value          | Role                                  |
|------------------|----------------------|---------------------------------------|
| Accent           | `#FF6900`            | strokes, nodes, theme-color           |
| Accent light     | `#FF8A3D`            | top stop of arm gradient              |
| Background deep  | `#0A0E1A`            | splash/bg base, node centers          |
| Background tint  | `#141B2E`            | radial-gradient highlight             |
| Focal            | `#FFFFFF`            | hub                                   |
| Name             | `Kafka` / `Kafka Viz`| wordmark, app title, manifest names   |
