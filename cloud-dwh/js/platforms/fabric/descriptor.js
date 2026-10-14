/* Platform descriptor: fabric */
(function(){
  const viz=(window.CDWH=window.CDWH||{}); viz.P=viz.P||{};
  const P=(viz.P.fabric=viz.P.fabric||{});
  P.Modules=P.Modules||{}; P.data=P.data||{}; P.concepts=P.concepts||{};
  P.quizBank=P.quizBank||{}; P.interviewBank=P.interviewBank||{};
  P.meta={ id:"fabric", label:"Microsoft Fabric", short:"Fabric",
           tagline:"Fabric Warehouse", accent:"#13a884",
           docsUrl:"https://learn.microsoft.com/fabric/data-warehouse/", home:"home", logoSvg:"<svg viewBox=\"0 0 40 40\" width=\"26\" height=\"26\" aria-hidden=\"true\"><rect x=\"5\" y=\"9\" width=\"30\" height=\"7\" rx=\"2\" fill=\"#13a884\"/><rect x=\"5\" y=\"19\" width=\"30\" height=\"7\" rx=\"2\" fill=\"none\" stroke=\"#13a884\" stroke-width=\"2\"/><rect x=\"5\" y=\"29\" width=\"18\" height=\"5\" rx=\"2\" fill=\"#13a884\" opacity=\".6\"/></svg>" };
  P.navGroups = [
    {
      label: "🧠 Learn — Fundamentals",
      items: [
        { id: "home", label: "Home", icon: "🧭" },
        { id: "intro", label: "Introduction", icon: "🎬" },
        { id: "onelake", label: "OneLake", icon: "🌊" },
        { id: "warehouse-vs-lakehouse", label: "Warehouse vs Lakehouse", icon: "🏢" },
        { id: "polaris-engine", label: "Polaris Engine", icon: "⚙️" },
        { id: "delta-storage", label: "Delta-Native Storage", icon: "🔺" },
        { id: "sql-endpoint", label: "SQL Analytics Endpoint", icon: "🔌" },
      ],
    },
    {
      label: "🧠 Learn — Internals & Data",
      items: [
        { id: "directlake", label: "DirectLake Mode", icon: "⚡" },
        { id: "capacities", label: "Capacities & F-SKUs", icon: "🧮" },
        { id: "shortcuts", label: "Shortcuts", icon: "🔗" },
        { id: "mirroring", label: "Mirroring", icon: "🪞" },
        { id: "cross-db-queries", label: "Cross-Database Queries", icon: "🔀" },
        { id: "semantic-models", label: "Semantic Models", icon: "📐" },
      ],
    },
    {
      label: "🏗️ Platform & Orchestration",
      items: [
        { id: "workspaces-domains", label: "Workspaces & Domains", icon: "🗂️" },
        { id: "data-factory", label: "Data Factory Pipelines", icon: "🏭" },
        { id: "dataflows-gen2", label: "Dataflows Gen2", icon: "🔄" },
        { id: "git-deployment", label: "Git & Deployment Pipelines", icon: "🚀" },
        { id: "copilot", label: "Copilot in Fabric", icon: "🤖" },
      ],
    },
    {
      label: "🔐 Security & Governance",
      items: [
        { id: "rls-cls-masking", label: "RLS / CLS / Masking", icon: "🔒" },
        { id: "purview", label: "Microsoft Purview", icon: "🏷️" },
        { id: "medallion", label: "Medallion Architecture", icon: "🥇" },
      ],
    },
    {
      label: "🚨 Troubleshoot",
      items: [
        { id: "lab-troubleshooting", label: "Troubleshooting Lab", icon: "🔥" },
        { id: "lab-failure", label: "Architecture Failure", icon: "💥" },
        { id: "lab-de", label: "Fabric + Data Eng", icon: "🔗" },
      ],
    },
    {
      label: "🔎 Optimize",
      items: [
        { id: "lab-perf-opt", label: "Performance Optimization", icon: "🔎" },
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
        { id: "lab-security", label: "Security Design Lab", icon: "🔐" },
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
        { id: "comparison", label: "Fabric vs Field", icon: "🔬" },
        { id: "certification", label: "Fabric Cert Map", icon: "🎓" },
        { id: "e2e-flow", label: "E2E Capstone Flow", icon: "🎯" },
      ],
    },
  ];;
})();
