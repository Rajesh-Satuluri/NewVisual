/* ============================================================
   Format descriptor — Microsoft Fabric (C9).
   Registers the Fabric service pages + overview home and derives the
   sidebar navGroups from the catalogue. Powers the active DP-700
   (Fabric Data Engineer Associate) certification track.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.ServiceDetail.registerAll('fabric', TV.FabricServices);
  // Topic-wise interview-question drill pages (I2.9)
  if (TV.InterviewQA && TV.FabricInterviewQA) TV.InterviewQA.register('fabric', TV.FabricInterviewQA);
  TV.ServiceDetail.registerHome('fabric', {
    title: 'Microsoft Fabric',
    subtitle: 'The Fabric data-engineering stack behind DP-700 — OneLake, Lakehouse, Warehouse, Dataflow Gen2, Pipelines, Spark notebooks, Eventstream and Eventhouse/KQL — each broken down six ways with interview Q&A, and cross-linked to the Azure and Databricks services they relate to.',
    certExam: 'ms-dp700',
    certExamLabel: 'DP-700 model questions',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-fabric" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#11a1a1"/><stop offset="100%" stop-color="#4fd1c5"/>
        </linearGradient>
      </defs>
      <path d="M16 3 L27 9 V23 L16 29 L5 23 V9 Z" fill="url(#brand-grad-fabric)" opacity=".85"/>
      <path d="M16 3 V29 M5 9 L27 23 M27 9 L5 23" stroke="#0b1620" stroke-width="1" opacity=".3"/>
    </svg>`;

  TV.registerFormat({
    id: 'fabric',
    label: 'Fabric',
    short: 'Fabric',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://learn.microsoft.com/fabric/',
    docsLabel: 'Microsoft Fabric docs',
    visible: true,
    comparable: false,
    home: 'home',
    logoSvg: LOGO,
    navGroups: TV.ServiceDetail.navGroupsFor('fabric', { homeLabel: 'Overview' }),
  });
})();
