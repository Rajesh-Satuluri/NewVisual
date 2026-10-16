/* ============================================================
   modules/incidents.js — Production Incident Simulator
   Ten realistic incidents. Read impact + symptoms + evidence, form
   a hypothesis, then reveal the root cause, mitigation, long-term
   fix, and preventive test. Root cause stays hidden until revealed.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "incidents",
    title: "Incident Simulator",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("senior");
      var incidents = AV.data.practice.incidents;
      var i = 0;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Practice · Debug</div>' +
          '<h1 class="module-title">Work a production incident like on-call</h1>' +
          '<p class="module-subtitle">Each incident gives you the impact, symptoms, and evidence first. Form a hypothesis, then reveal the root cause and the full response — immediate mitigation, long-term fix, and the test that prevents a repeat.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Incidents</div><ol class="ch-list" id="in-list">' +
            incidents.map(function (x, idx) { return '<li class="ch-item' + (idx === 0 ? " active" : "") + '" data-i="' + idx + '"><b>#' + x.id + "</b> " + x.title + "</li>"; }).join("") + "</ol></div>" +
          '<div id="in-main"></div>' +
        "</div>";

      var listEl = container.querySelector("#in-list");
      var mainEl = container.querySelector("#in-main");

      function render() {
        var x = incidents[i];
        mainEl.innerHTML =
          '<div class="panel"><div class="panel-title">#' + x.id + " · " + x.title + "</div>" +
            '<div class="callout danger"><span class="callout-icon">💥</span><div class="callout-body"><b>Business impact:</b> ' + x.impact + "</div></div>" +
            '<dl class="kv" style="margin-top:var(--space-3)"><dt>Symptoms</dt><dd>' + x.symptoms + "</dd><dt>Evidence</dt><dd>" + x.evidence + "</dd></dl>" +
            '<div style="margin-top:var(--space-4)"><button class="btn btn-primary" id="in-reveal">Reveal root cause &amp; response</button></div>' +
            '<div id="in-sol"></div>' +
          "</div>";
        listEl.querySelectorAll(".ch-item").forEach(function (el, idx) { el.classList.toggle("active", idx === i); });
        mainEl.querySelector("#in-reveal").addEventListener("click", function () {
          this.disabled = true;
          mainEl.querySelector("#in-sol").innerHTML =
            '<div class="callout" style="margin-top:var(--space-3);border-left:3px solid var(--purple)"><span class="callout-icon">🔬</span><div class="callout-body"><b>Root cause:</b> ' + x.cause + "</div></div>" +
            '<div class="callout warn" style="margin-top:var(--space-2)"><span class="callout-icon">🚑</span><div class="callout-body"><b>Immediate mitigation:</b> ' + x.mitigation + "</div></div>" +
            '<div class="callout info" style="margin-top:var(--space-2)"><span class="callout-icon">🔧</span><div class="callout-body"><b>Long-term fix:</b> ' + x.longterm + "</div></div>" +
            '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">🧪</span><div class="callout-body"><b>Preventive test:</b> ' + x.prevent + "</div></div>";
        });
      }
      listEl.addEventListener("click", function (e) { var li = e.target.closest(".ch-item"); if (li) { i = parseInt(li.getAttribute("data-i"), 10); render(); } });
      render();
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
