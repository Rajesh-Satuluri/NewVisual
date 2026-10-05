/* ============================================================
   Format descriptor — AWS. Registers the AWS service detail
   pages + overview home and derives the sidebar navGroups from
   the catalogue. Interview Q&A wiring lands once populated.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.ServiceDetail.registerAll('aws', TV.AwsServices);
  // Register the topic-wise interview-question drill pages (populated later).
  if (TV.InterviewQA && TV.AwsInterviewQA) TV.InterviewQA.register('aws', TV.AwsInterviewQA);
  TV.ServiceDetail.registerHome('aws', {
    title: 'Amazon Web Services',
    subtitle: 'The interview-critical AWS data services — S3, Glue Data Catalog, Glue ETL, Lake Formation, EMR, Athena, Redshift, Redshift Spectrum, Kinesis, MSK, Step Functions, MWAA, Lambda and DMS — each broken down six ways: what it is, why it exists, how it works, the DE use case, its integrations and its runtime behavior, with interview Q&A on every page.',
  });

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-aws" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff9900"/><stop offset="100%" stop-color="#ffbf66"/>
        </linearGradient>
      </defs>
      <path d="M6 20 q10 6 20 0" stroke="url(#brand-grad-aws)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M22 18 l5 2 l-2 5" stroke="url(#brand-grad-aws)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="7" y="8" width="5" height="7" rx="1" fill="url(#brand-grad-aws)" opacity=".85"/>
      <rect x="14" y="8" width="5" height="7" rx="1" fill="url(#brand-grad-aws)" opacity=".6"/>
      <rect x="21" y="8" width="5" height="7" rx="1" fill="url(#brand-grad-aws)" opacity=".4"/>
    </svg>`;

  TV.registerFormat({
    id: 'aws',
    label: 'AWS',
    short: 'AWS',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://docs.aws.amazon.com/',
    docsLabel: 'AWS Docs',
    visible: true,
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: (function () {
      const groups = TV.ServiceDetail.navGroupsFor('aws', { homeLabel: 'Overview' });
      const iq = TV.InterviewQA && TV.InterviewQA.navGroup('aws', TV.AwsInterviewQA);
      if (iq) groups.push(iq);
      return groups;
    })(),
  });
})();
