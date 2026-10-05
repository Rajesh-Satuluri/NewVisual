/* ============================================================
   Format descriptor — Azure (Block B, fully built).
   Registers all Azure service detail pages + the overview home,
   then derives the sidebar navGroups from the service catalogue
   so nav and content never drift apart.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  // Register the 13 service pages + the overview landing.
  TV.ServiceDetail.registerAll('azure', TV.AzureServices);
  // Register the topic-wise interview-question drill pages.
  if (TV.InterviewQA && TV.AzureInterviewQA) TV.InterviewQA.register('azure', TV.AzureInterviewQA);
  TV.ServiceDetail.registerHome('azure', {
    title: 'Azure Data Engineering',
    subtitle: 'The interview-critical Azure data services — storage, ingestion, streaming, warehousing, databases, governance and ops — each broken down six ways: what it is, why it exists, how it works, the DE use case, its integrations, and its runtime behavior, with interview Q&A on every page.',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-azure" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0f6cbd"/><stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>
      <path d="M13 5 L20 5 L27 25 L18 25 L23 14 L15 16 L20 25 L5 25 Z" fill="url(#brand-grad-azure)" opacity=".92"/>
    </svg>`;

  TV.registerFormat({
    id: 'azure',
    label: 'Azure',
    short: 'Azure',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://learn.microsoft.com/azure/',
    docsLabel: 'Microsoft Learn — Azure',
    visible: true,
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: (function () {
      const groups = TV.ServiceDetail.navGroupsFor('azure', { homeLabel: 'Overview' });
      const iq = TV.InterviewQA && TV.InterviewQA.navGroup('azure', TV.AzureInterviewQA);
      if (iq) groups.push(iq);
      return groups;
    })(),
  });
})();
