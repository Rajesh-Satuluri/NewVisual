/* ============================================================
   evidence.js — the honesty layer for the real-world case study.
   DECICDViz.Evidence renders the four evidence tiers as visible
   badges, turns source ids into clickable citations, and builds
   the References panel. Sections B–E use this so every rendered
   statement carries its tier (fact / interpretation / reference /
   pseudocode) and, for facts, a link to the source.

   Data comes from DECICDViz.CaseStudy (js/data/casestudy-airbnb.js).
   All dynamic text is HTML-escaped (prompt §10, security rules).
   No eval, no innerHTML from learner input — this renders only our
   own curated data.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // Content fields in CaseStudy intentionally contain a small set of
  // trusted inline tags (<b> <i> <code>). They are author-authored
  // (never learner input), so claim/body HTML is passed through as-is;
  // attribute-level values (urls, titles in attributes) are escaped.

  function CS() { return NS.CaseStudy || null; }

  var Evidence = {
    // Is the evidence layer available?
    ready: function () { return !!CS(); },

    tier: function (key) {
      var cs = CS();
      return (cs && cs.tiers && cs.tiers[key]) || null;
    },

    // Inline tier badge, e.g. Evidence.badge("fact").
    badge: function (key) {
      var t = this.tier(key);
      if (!t) return "";
      return '<span class="ev-badge ' + t.cls + '" title="' + esc(t.blurb) + '">' +
        '<span class="ev-badge-icon" aria-hidden="true">' + esc(t.icon) + "</span>" +
        esc(t.label) + "</span>";
    },

    // Citation chips for an array of source ids → clickable links.
    cite: function (ids) {
      var cs = CS();
      if (!cs || !ids || !ids.length) return "";
      var chips = ids.map(function (id) {
        var s = cs.sourceById(id);
        if (!s) return "";
        var sec = s.verified ? "" : " ev-cite-secondary";
        var label = s.verified ? "source" : "reported by";
        return '<a class="ev-cite' + sec + '" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" ' +
          'title="' + esc(s.title + " — " + s.publisher + (s.date ? " (" + s.date + ")" : "")) + '">' +
          esc(label) + "</a>";
      }).join("");
      return chips ? '<span class="ev-cites">' + chips + "</span>" : "";
    },

    // A full claim block: tier badge + body + citations.
    // claim = { tier, text, sources?, note? }
    claim: function (claim) {
      if (!claim) return "";
      var t = this.tier(claim.tier);
      var cls = t ? t.cls : "";
      return '<div class="ev-claim ' + cls + '">' +
        '<div class="ev-claim-top">' + this.badge(claim.tier) + this.cite(claim.sources) + "</div>" +
        '<div class="ev-claim-body">' + (claim.text || "") + "</div>" +
        (claim.note ? '<div class="ev-claim-note">' + esc(claim.note) + "</div>" : "") +
        "</div>";
    },

    // Render a named group of claims (business / architecture / …).
    claimGroup: function (name) {
      var cs = CS();
      if (!cs || !cs.claims || !cs.claims[name]) return "";
      var self = this;
      return '<div class="ev-claims">' +
        cs.claims[name].map(function (c) { return self.claim(c); }).join("") +
        "</div>";
    },

    // A compact legend explaining the four tiers (for section tops).
    legend: function () {
      var cs = CS();
      if (!cs) return "";
      var self = this;
      var order = ["fact", "interpretation", "reference", "pseudocode"];
      return '<div class="ev-legend" role="note">' +
        '<span class="ev-legend-title">How to read the labels:</span>' +
        order.map(function (k) {
          var t = cs.tiers[k];
          if (!t) return "";
          return '<span class="ev-legend-item">' + self.badge(k) +
            '<span class="ev-legend-blurb">' + esc(t.blurb) + "</span></span>";
        }).join("") +
        "</div>";
    },

    // Shared 4-chapter navigator across the case-study sections.
    // activeRoute highlights the current chapter; visited/complete
    // markers come from DECICDViz.Progress when available.
    chapterNav: function (activeRoute) {
      var cs = CS();
      if (!cs || !cs.chapters) return "";
      var P = NS.Progress;
      return '<nav class="cs-chapters" aria-label="Case-study chapters">' +
        cs.chapters.map(function (c) {
          var on = c.route === activeRoute;
          var mark = "";
          if (P) {
            if (P.isComplete(c.route)) mark = '<span class="cs-chapter-mark done" title="Completed">✓</span>';
            else if (P.isVisited(c.route)) mark = '<span class="cs-chapter-mark seen" title="Visited">•</span>';
          }
          return '<a class="cs-chapter' + (on ? " active" : "") + '"' +
            (on ? ' aria-current="true"' : "") + ' href="#' + esc(c.route) + '">' +
            '<span class="cs-chapter-n">' + esc(c.n) + "</span>" +
            '<span class="cs-chapter-t">' + esc(c.title) + "</span>" + mark + "</a>";
        }).join("") +
        "</nav>";
    },

    // Prev / next chapter footer links for a given chapter route.
    chapterPrevNext: function (activeRoute) {
      var cs = CS();
      if (!cs || !cs.chapters) return "";
      var idx = -1;
      cs.chapters.forEach(function (c, i) { if (c.route === activeRoute) idx = i; });
      if (idx === -1) return "";
      var prev = cs.chapters[idx - 1], next = cs.chapters[idx + 1];
      var left = prev
        ? '<a class="cs-pn cs-pn-prev" href="#' + esc(prev.route) + '"><span>← Chapter ' + esc(prev.n) + '</span><b>' + esc(prev.title) + "</b></a>"
        : '<span class="cs-pn cs-pn-empty"></span>';
      var right = next
        ? '<a class="cs-pn cs-pn-next" href="#' + esc(next.route) + '"><span>Chapter ' + esc(next.n) + ' →</span><b>' + esc(next.title) + "</b></a>"
        : '<a class="cs-pn cs-pn-next" href="#interview"><span>Finish →</span><b>Interview prep</b></a>';
      return '<nav class="cs-prevnext" aria-label="Chapter navigation">' + left + right + "</nav>";
    },

    // A scenario learning check: one or more questions, each option
    // reveals whether it's right and why. Returns a wired DOM element.
    learningCheck: function (questions) {
      var wrap = document.createElement("section");
      wrap.className = "section lc";
      if (!questions || !questions.length) return wrap;
      wrap.innerHTML = '<h2 class="section-title">Check yourself</h2>';
      questions.forEach(function (q) {
        var box = document.createElement("div");
        box.className = "lc-q";
        box.innerHTML = '<div class="lc-q-text">' + esc(q.q) + "</div>" +
          '<div class="lc-opts">' + q.options.map(function (o, oi) {
            return '<button type="button" class="lc-opt" data-o="' + oi + '">' + esc(o.label) + "</button>";
          }).join("") + "</div>" +
          '<div class="lc-explain" hidden></div>';
        wrap.appendChild(box);
        box.addEventListener("click", function (e) {
          var b = e.target.closest(".lc-opt");
          if (!b) return;
          var o = q.options[+b.getAttribute("data-o")];
          box.querySelectorAll(".lc-opt").forEach(function (x) { x.classList.remove("ok", "no", "sel"); });
          b.classList.add(o.ok ? "ok" : "no", "sel");
          var ex = box.querySelector(".lc-explain");
          ex.hidden = false;
          ex.className = "lc-explain " + (o.ok ? "good" : "bad");
          ex.innerHTML = (o.ok ? "✅ Correct. " : "❌ Not quite. ") + esc(o.why);
        });
      });
      return wrap;
    },

    // The Airbnb company-context block (name, domain, why chosen).
    companyIntro: function () {
      var cs = CS();
      if (!cs || !cs.company) return "";
      var c = cs.company;
      return '<section class="section cs-company">' +
        '<div class="cs-company-head">' +
          '<span class="cs-company-badge">Evidence-based case study</span>' +
          '<h2 class="section-title">' + esc(c.name) + '</h2>' +
        "</div>" +
        '<p class="cs-company-domain">' + esc(c.domain) + "</p>" +
        '<div class="cs-company-why"><div class="cs-company-why-label">Why this company anchors the case study</div>' +
          "<ul>" + c.whyChosen.map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul>" +
        "</div>" +
        "</section>";
    },

    // The References panel: all sources, grouped primary/secondary,
    // plus the honest research-provenance note.
    referencesPanel: function () {
      var cs = CS();
      if (!cs) return document.createElement("div");
      var wrap = document.createElement("section");
      wrap.className = "section ev-references";

      function sourceRow(s) {
        var tag = s.verified
          ? '<span class="ev-src-tag ev-src-primary">Primary</span>'
          : '<span class="ev-src-tag ev-src-secondary">Secondary</span>';
        return '<li class="ev-src">' +
          '<div class="ev-src-head">' + tag +
            '<a class="ev-src-title" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
            esc(s.title) + "</a></div>" +
          '<div class="ev-src-meta">' + esc(s.type) +
            " · " + esc(s.author) + " · " + esc(s.publisher) +
            (s.date ? " · " + esc(s.date) : "") + "</div>" +
          (s.note ? '<div class="ev-src-note">⚠ ' + esc(s.note) + "</div>" : "") +
          "</li>";
      }

      var primary = cs.sources.filter(function (s) { return s.verified; });
      var secondary = cs.sources.filter(function (s) { return !s.verified; });
      var p = cs.provenance || {};

      wrap.innerHTML =
        '<h2 class="section-title">References &amp; evidence</h2>' +
        '<p class="ev-ref-intro">Every factual claim in this case study links to one of these sources. ' +
        'Labels mark whether a statement is a documented fact, an engineering interpretation, a proposed reference implementation, or pseudocode.</p>' +
        '<h3 class="ev-ref-sub">Primary sources</h3>' +
        '<ul class="ev-src-list">' + primary.map(sourceRow).join("") + "</ul>" +
        (secondary.length
          ? '<h3 class="ev-ref-sub">Secondary coverage</h3>' +
            '<ul class="ev-src-list">' + secondary.map(sourceRow).join("") + "</ul>"
          : "") +
        '<div class="ev-provenance callout tip">' +
          '<span class="callout-icon">🔎</span>' +
          '<div class="callout-body"><b>How this research was gathered (' + esc(p.gathered || "") + ').</b> ' +
          esc(p.method || "") + " " + esc(p.note || "") + "</div>" +
        "</div>";
      return wrap;
    }
  };

  NS.Evidence = Evidence;
})();
