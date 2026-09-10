/*
 * copybtn.js — a universal "Copy" affordance on every code block.
 *
 * The solution editor (app.js / problemlab.js) already ships its own Copy button
 * in its actions bar. Everything else — the cross-stack reference, the PySpark
 * cheatsheet, and every Learn concept / Practice example snippet — renders a bare
 * <pre class="code-pre"> with no way to grab the code. This one small layer adds a
 * copy button to all of those, with zero changes to the individual renderers:
 *
 *   • It scans for <pre class="code-pre"> and decorates each one once.
 *   • A MutationObserver re-scans as modals open and views re-render, so blocks
 *     built lazily (rosetta, cheatsheet, concept views) get a button too.
 *   • It SKIPS any block that already has a Copy button nearby (the editor), so
 *     there's never a duplicate.
 *
 * Load LAST, after every renderer.
 */
(function () {
  var SEL = "pre.code-pre";

  // The editor's <pre> lives in a wrapper that also holds an actions bar with a
  // ".copy-btn". Walk a few ancestors; if one already offers Copy, leave it alone.
  function nearHasCopy(pre) {
    var n = pre, hops = 0;
    while (n && hops < 4) {
      if (n.querySelector && n.querySelector(".copy-btn")) return true;
      n = n.parentElement; hops++;
    }
    return false;
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) { /* nothing more we can do */ }
  }

  function decorate(pre) {
    if (pre.getAttribute("data-copy") === "1") return;
    pre.setAttribute("data-copy", "1");
    if (nearHasCopy(pre)) return;
    var code = pre.querySelector("code");
    if (!code || !pre.parentNode) return;

    // Wrap so the button stays anchored to the top-right while long lines scroll
    // horizontally inside the <pre> (which owns the overflow).
    var wrap = document.createElement("div");
    wrap.className = "pre-copy-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pre-copy";
    btn.setAttribute("aria-label", "Copy code");
    btn.textContent = "Copy";

    var timer = null;
    function flash(ok) {
      btn.textContent = ok ? "Copied!" : "Copy";
      btn.classList.toggle("ok", !!ok);
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("ok"); }, 1300);
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // never let a copy click bubble into a card/modal handler
      var text = code.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(true); }, function () { fallbackCopy(text); flash(true); });
      } else {
        fallbackCopy(text); flash(true);
      }
    });
    wrap.appendChild(btn);
  }

  function scan() {
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) decorate(list[i]);
  }

  function boot() {
    scan();
    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scan(); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
