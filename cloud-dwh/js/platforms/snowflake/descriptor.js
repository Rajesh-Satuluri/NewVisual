/* Platform descriptor: snowflake */
(function(){
  const viz=(window.CDWH=window.CDWH||{}); viz.P=viz.P||{};
  const P=(viz.P.snowflake=viz.P.snowflake||{});
  P.Modules=P.Modules||{}; P.data=P.data||{}; P.concepts=P.concepts||{};
  P.quizBank=P.quizBank||{}; P.interviewBank=P.interviewBank||{};
  P.meta={ id:"snowflake", label:"Snowflake", short:"Snowflake", version:"v3.5",
           tagline:"Netflix on Snowflake", accent:"#29b5e8",
           docsUrl:"https://docs.snowflake.com", home:"home", logoSvg:"<svg viewBox=\"0 0 40 40\" width=\"26\" height=\"26\" aria-hidden=\"true\"><rect x=\"5\" y=\"9\" width=\"30\" height=\"7\" rx=\"2\" fill=\"#29b5e8\"/><rect x=\"5\" y=\"19\" width=\"30\" height=\"7\" rx=\"2\" fill=\"none\" stroke=\"#29b5e8\" stroke-width=\"2\"/><rect x=\"5\" y=\"29\" width=\"18\" height=\"5\" rx=\"2\" fill=\"#29b5e8\" opacity=\".6\"/></svg>" };
  P.navGroups = [
    {
      label: '🧠 Learn — Fundamentals',
      items: [
        { id: 'home',          label: 'Home',             icon: '❄️' },
        { id: 'intro',         label: 'Introduction',     icon: '🎬' },
        { id: 'architecture',  label: 'Architecture',     icon: '🏛️' },
        { id: 'cloud-services',label: 'Cloud Services',   icon: '☁️' },
        { id: 'storage',       label: 'Storage Layer',    icon: '🗄️' },
        { id: 'compute',       label: 'Compute Layer',    icon: '⚡' },
      ],
    },
    {
      label: '🧠 Learn — Internals & Data',
      items: [
        { id: 'query-execution', label: 'Query Execution', icon: '🔍' },
        { id: 'caching',         label: 'Caching',          icon: '💾' },
        { id: 'data-loading',    label: 'Data Loading',     icon: '📥' },
        { id: 'loading-workshop',label: 'Loading Workshop', icon: '🧰' },
        { id: 'loading-incremental', label: 'Incremental & CDC', icon: '🔀' },
        { id: 'semi-structured', label: 'Semi-Structured',  icon: '🧩' },
        { id: 'data-engineering',label: 'Data Engineering',  icon: '🔧' },
        { id: 'objects',         label: 'Objects & Hierarchy', icon: '🗂️' },
        { id: 'advanced',        label: 'Advanced Features',   icon: '🚀' },
      ],
    },
    {
      label: '🔐 Learn — Security & Platform',
      items: [
        { id: 'rbac',        label: 'RBAC & Roles',        icon: '🔑' },
        { id: 'security',    label: 'Security & Governance',icon: '🔒' },
        { id: 'governance',  label: 'Data Governance',     icon: '🏷️' },
        { id: 'data-sharing',label: 'Data Sharing',        icon: '🤝' },
        { id: 'apps',        label: 'Apps on Snowflake',   icon: '🧱' },
        { id: 'business-continuity', label: 'Business Continuity', icon: '🛟' },
        { id: 'editions',    label: 'Editions & Connectivity', icon: '🌐' },
      ],
    },
    {
      label: '🚨 Troubleshoot',
      items: [
        { id: 'lab-troubleshooting', label: 'Troubleshooting Lab', icon: '🔥' },
        { id: 'lab-de',      label: 'Snowflake + Data Eng', icon: '🔗' },
        { id: 'lab-failure', label: 'Architecture Failure',  icon: '💥' },
        { id: 'loading-recovery', label: 'Recovery & Reconcile', icon: '🧯' },
      ],
    },
    {
      label: '🔎 Optimize',
      items: [
        { id: 'lab-query-opt',    label: 'Query Optimization Lab', icon: '🔎' },
        { id: 'lab-cost',         label: 'Cost Decision Lab',      icon: '💰' },
        { id: 'cost-performance', label: 'Cost & Performance',     icon: '📊' },
      ],
    },
    {
      label: '🎯 Practice',
      items: [
        { id: 'lab-decisions',      label: 'Feature Decisions',   icon: '⚖️' },
        { id: 'lab-sql',            label: 'SQL Scenarios',       icon: '🧮' },
        { id: 'lab-traps',          label: 'Interview Traps',     icon: '⚠️' },
        { id: 'lab-cert-interview', label: 'Cert → Interview',    icon: '🎓' },
        { id: 'interview-prep',     label: 'Interview Prep',      icon: '💬' },
      ],
    },
    {
      label: '🏗️ Design',
      items: [
        { id: 'lab-design',   label: 'System Design',    icon: '🏗️' },
        { id: 'lab-rbac',     label: 'RBAC Design Lab',  icon: '🔐' },
        { id: 'lab-loading',  label: 'Data Loading Lab', icon: '📥' },
      ],
    },
    {
      label: '🎤 Interview',
      items: [
        { id: 'lab-chains',  label: 'Follow-Up Chains',    icon: '🎤' },
        { id: 'lab-answers', label: 'Bad → Good → Senior', icon: '🌟' },
        { id: 'lab-case',    label: 'E2E Case Study',      icon: '🎬' },
        { id: 'lab-mock',    label: 'Mock Interview',      icon: '🎙️' },
      ],
    },
    {
      label: '📊 Progress',
      items: [
        { id: 'lab-dashboard', label: 'Readiness Dashboard', icon: '📈' },
      ],
    },
    {
      label: '📚 Reference',
      items: [
        { id: 'reference',     label: 'Glossary & Cheat Sheet', icon: '📚' },
        { id: 'comparison',    label: 'Snowflake vs Field',     icon: '🔬' },
        { id: 'certification', label: 'SnowPro Cert Map',       icon: '🎓' },
        { id: 'e2e-flow',      label: 'E2E Capstone Flow',      icon: '🎯' },
      ],
    },
  ];
})();
