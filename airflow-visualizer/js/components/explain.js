/* ============================================================
   components/explain.js — structured explanation renderer
   AV.Explain.render(step) turns a step's learning-oriented
   schema into detail-panel HTML: an expanded visible lead
   (what / why / how) plus a collapsed "Deep dive" disclosure
   (when · common mistake · interview angle · example).

   Backward-compatible: a step that still carries only a plain
   `desc` string renders exactly as it did before, so modules
   can adopt the schema one at a time.

   Schema: { label, what, why, how, when, mistake, interview,
             example, desc? }
   Field values are trusted HTML (authored in-repo), matching
   how every other module treats its explanation strings.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function str(s) { return s == null ? "" : String(s); }
  function para(html) { return html ? "<p>" + html + "</p>" : ""; }
  function sub(label, body) {
    return body ? '<div class="arch-detail-sub">' + label + "</div>" + body : "";
  }

  var Explain = {
    render: function (step) {
      step = step || {};
      var title = step.label
        ? '<div class="arch-detail-title">' + str(step.label) + "</div>"
        : "";

      // Fallback for un-migrated steps: a lone `desc` string.
      if (!step.what && step.desc) {
        return title + para(str(step.desc));
      }

      var lead =
        '<div class="explain-lead">' +
          para(str(step.what)) +
          para(str(step.why)) +
          para(str(step.how)) +
        "</div>";

      var moreInner =
        sub("When it applies", para(str(step.when))) +
        sub("Common mistake", para(str(step.mistake))) +
        sub("In interviews", step.interview
          ? '<div class="callout tip explain-interview"><span class="callout-icon">🎤</span>' +
            '<div class="callout-body">' + str(step.interview) + "</div></div>"
          : "") +
        sub("Example", step.example
          ? '<div class="explain-example">' + str(step.example) + "</div>"
          : "");

      var more = moreInner
        ? '<details class="explain-more">' +
            "<summary>Deep dive — when, gotchas, interview angle</summary>" +
            '<div class="explain-more-body">' + moreInner + "</div>" +
          "</details>"
        : "";

      return title + lead + more;
    }
  };

  AV.Explain = Explain;
})();
