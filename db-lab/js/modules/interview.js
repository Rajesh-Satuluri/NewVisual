/* ============================================================
   interview.js — Route: #interview
   Interview Center: every concept's authored interview Q&A, grouped
   by domain, with click-to-reveal answers (native <details>). Pulls
   straight from the concept registry (c.interviewQs = [{q,a}]).
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function slug(d){return String(d).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}

  var Module = {
    id: "interview", title: "Interview Center", fullWidth: false,
    render: function (container) {
      var concepts = DL.concepts || [];
      var domains = DL.domains || [];

      // Group concepts that carry interview Q&A, by domain, preserving order.
      var byDomain = {}; var totalQ = 0; var totalC = 0;
      concepts.forEach(function (c) {
        var qs = c.interviewQs || [];
        if (!qs.length) return;
        (byDomain[c.domain] = byDomain[c.domain] || []).push(c);
        totalQ += qs.length; totalC += 1;
      });
      var activeDomains = domains.filter(function (d) { return byDomain[d] && byDomain[d].length; });

      var html = '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">Interview Center</div>' +
        '<h1 class="module-title gradient-text">Interview Center</h1>' +
        '<p class="module-subtitle">' + totalQ + ' interview questions with model answers across ' + totalC +
        ' concepts. Read the question, think your answer, then reveal the model answer and jump to the full lesson.</p></div>';

      if (!totalQ) {
        html += '<div class="dash-empty">No interview questions are loaded yet.</div>';
        container.innerHTML = html; return;
      }

      // Quick nav by domain.
      html += '<nav class="iv-nav" aria-label="Jump to domain">' + activeDomains.map(function (d) {
        return '<a class="chip" href="#interview-' + slug(d) + '" data-iv-jump="' + slug(d) + '">' +
          esc(d) + ' <span class="iv-count">' + byDomain[d].reduce(function(n,c){return n+(c.interviewQs||[]).length;},0) + '</span></a>';
      }).join("") + '</nav>';

      html += '<div class="callout iv-callout"><span class="callout-icon">💼</span><div class="callout-body">' +
        '<b>How to use this.</b> Answer out loud first, in your own words, ' +
        'then open the model answer to check structure and the detail an interviewer wants. Weak on a topic? ' +
        'The lesson link gives you the internals and a lab.</div></div>';

      // Each domain → each concept → its Q&A as <details>.
      activeDomains.forEach(function (d) {
        var list = byDomain[d];
        var dq = list.reduce(function(n,c){return n+(c.interviewQs||[]).length;},0);
        html += '<section class="iv-domain" id="iv-' + slug(d) + '">' +
          '<div class="learn-domain-head"><h2 class="learn-domain-title">' + esc(d) + '</h2>' +
          '<span class="learn-domain-count">' + dq + ' Q</span></div>';
        list.forEach(function (c) {
          html += '<div class="iv-concept"><div class="iv-concept-head">' +
            '<span class="iv-concept-title">' + (c.icon ? c.icon + " " : "") + esc(c.title) + '</span>' +
            '<a class="iv-concept-link" href="#concept/' + c.slug + '">Full lesson →</a></div>';
          (c.interviewQs || []).forEach(function (qa) {
            html += '<details class="iv-qa"><summary class="iv-q">' + esc(qa.q) + '</summary>' +
              '<div class="iv-a">' + esc(qa.a) + '</div></details>';
          });
          html += '</div>';
        });
        html += '</section>';
      });

      container.innerHTML = html;

      // Smooth in-page jumps without touching the hash router.
      container.querySelectorAll("[data-iv-jump]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var t = document.getElementById("iv-" + a.getAttribute("data-iv-jump"));
          if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
      var canvas = document.getElementById("canvas"); if (canvas) canvas.scrollTop = 0;
    },
  };
  DL.registerModule(Module);
})();
