/* Observability & Diagnosis — renders the content model in
   data/observability.js via the shared InterviewModule renderer. */
(function () {
  'use strict';
  const C = (window.CDWH = window.CDWH || {});
  C.P.snowflake.Modules = C.P.snowflake.Modules || {};
  C.P.snowflake.Modules.observability = C.InterviewModule.build(() => C.P.snowflake.observability);
})();
