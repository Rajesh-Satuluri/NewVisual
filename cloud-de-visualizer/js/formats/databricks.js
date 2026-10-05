/* ============================================================
   Format descriptor — Databricks (Block C, fully built).
   Registers the 12 Databricks service pages + overview home and
   derives the sidebar navGroups from the catalogue.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.ServiceDetail.registerAll('databricks', TV.DatabricksServices);
  // Register the topic-wise interview-question drill pages (populated from Iteration 5).
  if (TV.InterviewQA && TV.DatabricksInterviewQA) TV.InterviewQA.register('databricks', TV.DatabricksInterviewQA);
  TV.ServiceDetail.registerHome('databricks', {
    title: 'Databricks Lakehouse',
    subtitle: 'The interview-critical Databricks components — Delta Lake, Unity Catalog, Delta Live Tables, Auto Loader, Workflows, Structured Streaming, Change Data Feed, Photon, Clusters, Databricks SQL, MLflow and Delta Sharing — each broken down six ways with interview Q&A, and cross-linked to the Azure services they pair with.',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-dbx" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff5f46"/><stop offset="100%" stop-color="#ff8f6b"/>
        </linearGradient>
      </defs>
      <path d="M16 4 L27 10 L16 16 L5 10 Z" fill="url(#brand-grad-dbx)" opacity=".9"/>
      <path d="M16 18 L27 12 L27 20 L16 26 Z" fill="url(#brand-grad-dbx)" opacity=".5"/>
      <path d="M16 18 L5 12 L5 20 L16 26 Z" fill="url(#brand-grad-dbx)" opacity=".35"/>
    </svg>`;

  TV.registerFormat({
    id: 'databricks',
    label: 'Databricks',
    short: 'Databricks',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://docs.databricks.com/',
    docsLabel: 'Databricks Docs',
    visible: true,
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: (function () {
      const groups = TV.ServiceDetail.navGroupsFor('databricks', { homeLabel: 'Overview' });
      const iq = TV.InterviewQA && TV.InterviewQA.navGroup('databricks', TV.DatabricksInterviewQA);
      if (iq) groups.push(iq);
      return groups;
    })(),
  });
})();
