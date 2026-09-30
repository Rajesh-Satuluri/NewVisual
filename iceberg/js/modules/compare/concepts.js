/* Compare — side-by-side concept modules (data-driven via CompareKit).
   One registration per concept in TV.CompareData.concepts. */
(function () {
  'use strict';
  const TV = window.TableViz;
  ['metadata-model', 'writes-deletes', 'time-travel', 'concurrency', 'layout', 'ecosystem']
    .forEach(id => TV.CompareKit.conceptModule(id));
})();
