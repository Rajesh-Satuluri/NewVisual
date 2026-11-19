/* Streams · Tasks · Dynamic Tables — renders the content model in
   data/streams-tasks-dt.js via the shared InterviewModule renderer. */
(function () {
  'use strict';
  const C = (window.CDWH = window.CDWH || {});
  C.P.snowflake.Modules = C.P.snowflake.Modules || {};
  C.P.snowflake.Modules.streamsTasksDt = C.InterviewModule.build(() => C.P.snowflake.streamsTasksDt);
})();
