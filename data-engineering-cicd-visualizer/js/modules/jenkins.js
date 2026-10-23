/* modules/jenkins.js — Tier 3 · Jenkins (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "jenkins",
    title: "Jenkins",
    tool: "--tool-jenkins",
    icon: "🔧",
    eyebrow: "Tier 3 · Legacy CI (know it, don't over-invest)",
    subtitle: "The veteran self-hosted CI server still running many enterprise pipelines — worth recognizing, but for a new data engineer it's LOWER ROI than learning modern managed CI fundamentals first.",
    mentalImage: "SELF-HOSTED CI VETERAN",

    flowTitle: "A change moving through Jenkins",
    flow: ["Git", "Webhook", "Jenkins controller", "Pipeline", "Agent", "Build / Test", "Deploy"],

    why: "For years Jenkins <i>was</i> CI: an open-source server you host yourself, endlessly extensible via plugins. Many enterprises built their whole delivery process on it and still run it — so you'll meet it, even as new projects pick managed CI.",
    what: "Jenkins is a <b>self-hosted automation server</b> for CI/CD. A <b>controller</b> orchestrates jobs; <b>agents</b> run them; a <b>Jenkinsfile</b> in the repo defines the pipeline as <b>stages</b> and <b>steps</b>.",
    how: "A Git push fires a <b>webhook</b> to the Jenkins controller. It schedules the <b>pipeline</b> on an <b>agent</b>, which checks out the code and runs each <b>stage</b> (build → test → deploy), pulling secrets from the <b>credentials</b> store and capabilities from <b>plugins</b>.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Jenkins is a CI server your company runs on its own machines. When code is pushed, Jenkins wakes up and runs your build-and-test steps — the same job GitHub Actions does, but you own and maintain the server." },
        { h: "The core pieces", body: "<ul><li><b>Controller</b> — the brain that schedules jobs and shows results.</li><li><b>Agent</b> — a worker machine that actually runs the steps.</li><li><b>Jenkinsfile</b> — pipeline-as-code in your repo.</li><li><b>Stage</b> — a named phase (Build, Test, Deploy).</li></ul>" },
        { h: "RetailFlow example", body: "A legacy RetailFlow reporting system still runs on Jenkins. A push to its revenue code triggers a Jenkins pipeline that runs pytest and deploys — while the team plans to migrate it to managed CI." }
      ],
      intermediate: [
        { h: "Declarative Jenkinsfile", body: "Modern Jenkins uses a <b>declarative</b> <code>Jenkinsfile</code>: a <code>pipeline</code> block with <code>agent</code>, <code>stages</code>, and <code>steps</code>. It lives in the repo so the pipeline is versioned and reviewed like any other code." },
        { h: "Credentials & plugins", body: "Secrets live in the Jenkins <b>credentials</b> store and are injected via <code>withCredentials</code> — never hard-coded. Almost every integration (Git, Docker, cloud, Slack) comes from a <b>plugin</b>; the plugin ecosystem is Jenkins's superpower and its maintenance burden." },
        { h: "Controller / agent model", body: "The <b>controller</b> stays light and schedules work onto <b>agents</b> (static VMs, Docker, or Kubernetes-provisioned). Heavy builds run on agents so one machine doesn't become the bottleneck — but you're responsible for provisioning and patching all of it." }
      ],
      proficient: [
        { h: "Why enterprises still use it", body: "Sunk investment: hundreds of tuned Jenkinsfiles, shared libraries, on-prem agents with access to internal data, and air-gapped/regulated environments where a self-hosted server is a requirement. Rewriting all that is expensive, so Jenkins persists." },
        { h: "Why teams migrate away", body: "Jenkins means <b>you</b> run the servers: patching, plugin version hell, flaky agents, and security exposure. Managed CI (GitHub Actions, Azure Pipelines, GitLab CI) removes the ops burden with hosted runners, YAML config, and a curated action marketplace — so new projects rarely start on Jenkins." },
        { h: "Jenkins vs GitHub Actions (interview angle)", body: "Jenkins = <b>self-hosted, plugin-based, Groovy Jenkinsfile, you own the infra</b>. GitHub Actions = <b>managed, YAML, marketplace actions, GitHub owns the runners</b> (or you add self-hosted only where needed). Same CI concepts — the difference is who operates the platform. Know both terms; invest your learning in modern CI fundamentals." }
      ]
    },

    micro: ["controller", "agent / node", "pipeline", "Jenkinsfile", "stage", "step", "declarative pipeline",
      "credentials store", "plugin", "webhook trigger", "shared library", "executor", "workspace"],

    before: ["self-run CI server", "plugin version conflicts", "patch the agents yourself", "Groovy learning curve", "you own uptime"],
    after: ["managed hosted runners", "YAML pipelines", "curated marketplace", "no servers to patch", "provider owns uptime"],

    failure: {
      title: "Unpatched plugin breaks the nightly build",
      steps: ["Plugin auto-updates", "incompatible with pipeline", "nightly job fails silently", "revenue build never runs", "stale 7 AM dashboard"],
      explain: "This class of failure — plugin/version drift on a server <b>you</b> maintain — is exactly the ops burden managed CI removes. It's not that Jenkins can't work; it's that keeping it healthy is real, ongoing work a new data engineer shouldn't take on before mastering CI fundamentals."
    },

    whenNot: "Don't learn Jenkins deeply before you understand modern CI fundamentals (pipelines, stages, artifacts, gates) on a managed platform. As a new data engineer, Jenkins is <b>lower ROI</b>: recognize the controller/agent/Jenkinsfile vocabulary so you can work in a legacy shop, but invest your real time in GitHub Actions / Azure Pipelines. Don't start a greenfield project on Jenkins.",

    story: {
      situation: "A legacy RetailFlow revenue-reporting system still runs its CI on an on-prem Jenkins server the team inherited.",
      problem: "The Jenkins box needs constant plugin patching and only one engineer understands its Groovy pipeline — a fragile bottleneck.",
      decision: "The team keeps the existing Jenkinsfile running for now, but ports the pipeline's build → test → deploy stages to managed CI as part of a planned migration.",
      tool: "Jenkins (declarative pipeline) — being retired.",
      result: "The revenue build keeps flowing during migration; once it lands on managed CI, the server-maintenance burden disappears.",
      remember: "Jenkins taught the industry CI — but for a new data engineer it's a term to recognize, not the platform to master first."
    },

    code: [{
      title: "Jenkinsfile — declarative pipeline for the revenue build",
      lang: "groovy",
      code: "pipeline {\n" +
            "  agent { label 'linux' }\n" +
            "  stages {\n" +
            "    stage('Build') {\n" +
            "      steps { sh 'pip install -r requirements.txt' }\n" +
            "    }\n" +
            "    stage('Test') {\n" +
            "      steps { sh 'pytest tests/' }\n" +
            "    }\n" +
            "    stage('Deploy') {\n" +
            "      steps {\n" +
            "        withCredentials([string(credentialsId: 'prod-token', variable: 'TOKEN')]) {\n" +
            "          sh './scripts/deploy.sh'\n" +
            "        }\n" +
            "      }\n" +
            "    }\n" +
            "  }\n" +
            "}",
      highlights: [2, 8, 12]
    }],

    remember: "Jenkins is self-hosted CI: you own the controller, agents, and plugins. Same CI concepts as managed CI — just more ops. Recognize it; invest your learning in modern platforms.",

    retention: {
      question: "A RetailFlow legacy system runs on Jenkins. As a new data engineer, how much should you invest in learning it, and why?",
      answer: "Learn enough to <b>recognize the vocabulary</b> (controller, agent, Jenkinsfile, stages) so you can work in a legacy shop — but invest your real time in <b>modern managed CI fundamentals</b>. Jenkins's extra weight is self-hosting ops, not new CI concepts, so it's lower ROI to master first."
    },

    prerequisites: ["ci-vs-cd", "github-actions", "git"],

    production: [
      { h: "Credentials store, never hard-coded", body: "Secrets live in Jenkins <b>credentials</b> and are injected via <code>withCredentials</code>, masked in logs — the prod token for RetailFlow's revenue deploy should never appear in the Jenkinsfile." },
      { h: "You own patching and uptime", body: "Controller, agents, and every plugin are yours to patch. Unattended plugin/version drift is a real source of silent nightly-build failures — the ops burden managed CI removes." },
      { h: "Controller/agent isolation", body: "Keep the controller light and run builds on agents; a compromised or overloaded agent shouldn't take down scheduling. Lock down who can configure jobs and install plugins." },
      { h: "Pipeline-as-code for auditability", body: "Keep the <code>Jenkinsfile</code> in the repo so the pipeline is versioned and reviewed like any code, instead of click-configured jobs with no change history." }
    ],

    misconceptions: [
      { myth: "Jenkins is obsolete and nobody uses it.", truth: "Many enterprises still run large, tuned Jenkins estates — especially air-gapped/regulated shops — so you'll meet it; new projects just rarely start on it." },
      { myth: "Jenkins does CI that managed platforms can't.", truth: "The CI concepts are identical (stages, steps, artifacts, gates). The real difference is <b>who operates the server</b> — with Jenkins, you do." },
      { myth: "A declarative Jenkinsfile is written in YAML.", truth: "It's Groovy-based (declarative or scripted), not YAML — a common point of confusion versus GitHub Actions / Azure Pipelines." },
      { myth: "More plugins make Jenkins strictly better.", truth: "Plugins are its power <i>and</i> its maintenance burden — version conflicts and unpatched plugins are a leading cause of broken pipelines and security exposure." }
    ],

    troubleshooting: [
      { symptom: "The nightly revenue build stopped running silently.", cause: "A plugin auto-updated to an incompatible version.", fix: "Pin plugin versions, roll back the broken one, and re-run the job; verify the stage completes and add a build-failure alert so silence can't hide it again." },
      { symptom: "A push to Git doesn't trigger the pipeline.", cause: "The webhook isn't reaching the controller (network/firewall) or isn't configured.", fix: "Check the controller's webhook logs and the Git side's delivery history; re-register the webhook and verify a test push starts a build." },
      { symptom: "A secret leaked into the console log.", cause: "The value was echoed outside <code>withCredentials</code> or not stored as a credential.", fix: "Move it into the credentials store, wrap usage in <code>withCredentials</code>, rotate the exposed value, and verify the masked <code>****</code> appears in logs." },
      { symptom: "Builds queue forever and never start.", cause: "No available executors/agents, or agents disconnected.", fix: "Check agent connectivity and executor count; bring agents back online or add capacity, then verify the queue drains." },
      { symptom: "The pipeline works for one engineer but no one else can maintain it.", cause: "Groovy/shared-library knowledge is siloed.", fix: "Document the Jenkinsfile, move logic into reviewed shared libraries, and plan migration to managed CI; verify a second engineer can modify and run it." }
    ],

    interview: [
      { q: "Contrast Jenkins with GitHub Actions.", a: "Jenkins is self-hosted, plugin-based, with a Groovy <code>Jenkinsfile</code> — you own the controller, agents, patching, and uptime. GitHub Actions is managed with YAML workflows and a marketplace, where GitHub runs the runners (you add self-hosted only where needed). Same CI concepts; the difference is who operates the platform." },
      { q: "Why do enterprises keep Jenkins despite the ops burden?", a: "Sunk investment: hundreds of tuned Jenkinsfiles, shared libraries, on-prem agents with internal data access, and air-gapped/regulated environments where a self-hosted server is a requirement — rewriting all that is expensive, so Jenkins persists." },
      { q: "As a new data engineer, how much should you invest in Jenkins?", a: "Enough to recognize the vocabulary (controller, agent, Jenkinsfile, stages) so you can work in a legacy shop, but put your real learning into modern managed CI fundamentals — Jenkins's extra weight is self-hosting ops, not new CI concepts." },
      { q: "How are secrets handled safely in a Jenkins pipeline?", a: "They live in the Jenkins credentials store and are injected at runtime via <code>withCredentials</code>, which masks them in logs; they're never hard-coded in the Jenkinsfile, and a leaked value must be rotated, not just removed." }
    ],

    related: ["github-actions", "azure-devops", "ci-vs-cd", "secrets"]
  }));
})();
