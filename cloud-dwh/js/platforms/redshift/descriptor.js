/* Platform descriptor: redshift */
(function(){
  const viz=(window.CDWH=window.CDWH||{}); viz.P=viz.P||{};
  const P=(viz.P.redshift=viz.P.redshift||{});
  P.Modules=P.Modules||{}; P.data=P.data||{}; P.concepts=P.concepts||{};
  P.quizBank=P.quizBank||{}; P.interviewBank=P.interviewBank||{};
  P.meta={ id:"redshift", label:"Amazon Redshift", short:"Redshift",
           tagline:"Netflix on AWS", accent:"#4da3e0",
           docsUrl:"https://docs.aws.amazon.com/redshift/", home:"home", logoSvg:"<svg viewBox=\"0 0 40 40\" width=\"26\" height=\"26\" aria-hidden=\"true\"><rect x=\"5\" y=\"9\" width=\"30\" height=\"7\" rx=\"2\" fill=\"#4da3e0\"/><rect x=\"5\" y=\"19\" width=\"30\" height=\"7\" rx=\"2\" fill=\"none\" stroke=\"#4da3e0\" stroke-width=\"2\"/><rect x=\"5\" y=\"29\" width=\"18\" height=\"5\" rx=\"2\" fill=\"#4da3e0\" opacity=\".6\"/></svg>" };
  P.navGroups = [
    {
      label: "🧠 Learn — Fundamentals",
      items: [
        { id: "home", label: "Home", icon: "🧭" },
        { id: "intro", label: "Introduction", icon: "🎬" },
        { id: "architecture", label: "Architecture", icon: "🏛️" },
        { id: "ra3-managed-storage", label: "RA3 & Managed Storage", icon: "🗄️" },
        { id: "serverless", label: "Redshift Serverless", icon: "⚡" },
        { id: "columnar-storage", label: "Columnar Storage & Zone Maps", icon: "📊" },
      ],
    },
    {
      label: "🧠 Learn — Internals & Data",
      items: [
        { id: "distribution-styles", label: "Distribution Styles", icon: "🔀" },
        { id: "sort-keys", label: "Sort Keys", icon: "↕️" },
        { id: "compression", label: "Compression & Encoding", icon: "🗜️" },
        { id: "vacuum-analyze", label: "VACUUM & ANALYZE", icon: "🧹" },
        { id: "query-execution", label: "Query Execution", icon: "🔍" },
        { id: "result-caching", label: "Result Caching", icon: "💾" },
        { id: "materialized-views", label: "Materialized Views", icon: "🧱" },
      ],
    },
    {
      label: "⚡ Scale & Performance",
      items: [
        { id: "wlm", label: "Workload Management (WLM)", icon: "🚦" },
        { id: "concurrency-scaling", label: "Concurrency Scaling", icon: "➕" },
        { id: "resize", label: "Elastic vs Classic Resize", icon: "📏" },
        { id: "short-query-accel", label: "Short Query Acceleration", icon: "🏃" },
        { id: "cost-performance", label: "Cost & Performance", icon: "💰" },
      ],
    },
    {
      label: "🔌 Ecosystem & Integration",
      items: [
        { id: "spectrum", label: "Redshift Spectrum", icon: "🪣" },
        { id: "federated-query", label: "Federated Query", icon: "🌉" },
        { id: "datashares", label: "Data Sharing (Datashares)", icon: "🤝" },
        { id: "redshift-ml", label: "Redshift ML", icon: "🤖" },
        { id: "super-partiql", label: "SUPER & PartiQL", icon: "🧩" },
        { id: "copy-unload", label: "COPY & UNLOAD", icon: "🔁" },
      ],
    },
    {
      label: "🔐 Security & Governance",
      items: [
        { id: "iam-rbac", label: "IAM & RBAC", icon: "🔑" },
        { id: "kms-encryption", label: "Encryption & KMS", icon: "🔒" },
        { id: "lake-formation", label: "Lake Formation Integration", icon: "🏞️" },
      ],
    },
    {
      label: "🚨 Troubleshoot",
      items: [
        { id: "lab-troubleshooting", label: "Troubleshooting Lab", icon: "🔥" },
        { id: "lab-failure", label: "Architecture Failure", icon: "💥" },
        { id: "lab-de", label: "Redshift + Data Eng", icon: "🔗" },
      ],
    },
    {
      label: "🔎 Optimize",
      items: [
        { id: "lab-query-opt", label: "Query Optimization Lab", icon: "🔎" },
        { id: "lab-cost", label: "Cost Decision Lab", icon: "💸" },
      ],
    },
    {
      label: "🎯 Practice",
      items: [
        { id: "lab-decisions", label: "Feature Decisions", icon: "⚖️" },
        { id: "lab-sql", label: "SQL Scenarios", icon: "🧮" },
        { id: "lab-traps", label: "Interview Traps", icon: "⚠️" },
        { id: "lab-cert-interview", label: "Cert → Interview", icon: "🎓" },
        { id: "interview-prep", label: "Interview Prep", icon: "💬" },
      ],
    },
    {
      label: "🏗️ Design",
      items: [
        { id: "lab-design", label: "System Design", icon: "🏗️" },
        { id: "lab-rbac", label: "RBAC Design Lab", icon: "🔐" },
        { id: "lab-loading", label: "Data Loading Lab", icon: "📥" },
      ],
    },
    {
      label: "🎤 Interview",
      items: [
        { id: "lab-chains", label: "Follow-Up Chains", icon: "🎤" },
        { id: "lab-answers", label: "Bad → Good → Senior", icon: "🌟" },
        { id: "lab-case", label: "E2E Case Study", icon: "🎬" },
        { id: "lab-mock", label: "Mock Interview", icon: "🎙️" },
      ],
    },
    {
      label: "📊 Progress",
      items: [
        { id: "lab-dashboard", label: "Readiness Dashboard", icon: "📈" },
      ],
    },
    {
      label: "📚 Reference",
      items: [
        { id: "reference", label: "Glossary & Cheat Sheet", icon: "📚" },
        { id: "comparison", label: "Redshift vs Field", icon: "🔬" },
        { id: "certification", label: "AWS Cert Map", icon: "🎓" },
        { id: "e2e-flow", label: "E2E Capstone Flow", icon: "🎯" },
      ],
    },
  ];;
})();
