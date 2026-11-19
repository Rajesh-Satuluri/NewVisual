/* Project Stories (STAR) — renders the content model in
   data/project-stories.js via the shared InterviewModule renderer. */
(function () {
  'use strict';
  const C = (window.CDWH = window.CDWH || {});
  C.P.snowflake.Modules = C.P.snowflake.Modules || {};
  C.P.snowflake.Modules.projectStories = C.InterviewModule.build(() => C.P.snowflake.projectStories);
})();
