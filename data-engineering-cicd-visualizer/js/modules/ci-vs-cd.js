/* modules/ci-vs-cd.js — Tier 2 · CI vs CD (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "ci-vs-cd",
    title: "CI vs CD",
    tool: "--tool-ci",
    icon: "⚖️",
    eyebrow: "Tier 2 · Core CI/CD Concepts",
    subtitle: "Two different questions: CI asks 'is this change safe to integrate?'; CD asks 'how do we safely deliver it?' RetailFlow's revenue fix is continuously integrated on every PR, then delivered to prod behind an approval gate.",
    mentalImage: "INTEGRATE SAFELY ↔ DELIVER SAFELY",

    flowTitle: "CI hands a validated artifact to CD",
    flow: ["Code change", "Build", "Test", "Quality checks", "→ Artifact →", "Deploy", "Verify", "Promote"],

    why: "People say 'CI/CD' as one word and blur them together, then can't explain why a change passed all tests but still broke production — because <b>integrating</b> a change and <b>delivering</b> it are two separate problems with two separate gates.",
    what: "<b>CI (Continuous Integration)</b> proves a code change is safe to merge: build → test → quality checks. <b>CD (Continuous Delivery/Deployment)</b> takes the validated artifact and gets it running safely: deploy → verify → promote.",
    how: "CI runs on every push/PR and outputs a <b>validated artifact</b>. CD picks up that artifact and moves it through environments. The handoff point is the artifact — CI's output is CD's input.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "CI = catch problems in the <i>code</i> before it merges. CD = get the approved code <i>running</i> safely in production. One checks the change; the other ships it." },
        { h: "Two questions", body: "<ul><li><b>CI</b> answers: <i>Is this change safe to integrate?</i> (does it build, do tests pass, is quality OK?)</li><li><b>CD</b> answers: <i>How do we safely deliver it?</i> (deploy, verify it's healthy, promote to the next environment)</li></ul>" },
        { h: "RetailFlow example", body: "An engineer opens a PR with the net-revenue fix. <b>CI</b> builds it and runs pytest — green means safe to integrate. After merge, <b>CD</b> deploys the built artifact to test, verifies it, then to prod." }
      ],
      intermediate: [
        { h: "What CI actually does", body: "On every push/PR: install deps, <b>build</b>, run <b>unit + data tests</b>, run <b>quality checks</b> (lint, coverage, type checks, dbt tests). It fails fast and blocks merge if anything is red. Its product is a tested, reproducible <b>artifact</b> — not a deployment." },
        { h: "What CD actually does", body: "CD takes that one artifact and <b>deploys</b> it to an environment, <b>verifies</b> health (smoke tests, data checks, monitoring), then <b>promotes</b> the same artifact onward (dev → test → prod). It never rebuilds — it moves the proven artifact." },
        { h: "The handoff is the artifact", body: "The clean boundary between CI and CD is the <b>artifact</b>. CI produces it once; CD promotes that exact one. This is why a change can pass CI yet fail in prod — CI validated the <i>code</i>, but delivery (config, environment, data) is CD's job to verify." }
      ],
      proficient: [
        { h: "Continuous Delivery vs Continuous Deployment", body: "Both are 'CD'. <b>Continuous Delivery</b>: every validated change is <i>ready</i> to release, but a <b>human approves</b> the final push to prod. <b>Continuous Deployment</b>: no human gate — a passing pipeline <b>auto-releases</b> to prod. Delivery = one button away; Deployment = no button. Regulated/data-critical teams usually pick Delivery." },
        { h: "Where the gates live", body: "CI gates protect <code>main</code>: required checks, review, coverage thresholds. CD gates protect <i>production</i>: approvals, environment protection rules, progressive rollout, automated rollback on failed verification. Confusing the two leads to either unreviewed merges or unguarded deploys." },
        { h: "Interview framing", body: "Strong answer: 'CI integrates code changes safely and produces a validated artifact; CD delivers that artifact to environments safely. Continuous Delivery keeps a human approval before prod; Continuous Deployment removes it.' Naming the artifact handoff and the delivery-vs-deployment distinction signals real understanding." }
      ]
    },

    micro: ["continuous integration", "continuous delivery", "continuous deployment", "build", "automated tests",
      "quality checks", "validated artifact", "deploy", "verify / smoke test", "promote", "approval gate", "environment protection", "rollback"],

    before: ["'CI/CD' as one blurry word", "tests pass but prod breaks", "no clear handoff", "manual deploys", "unclear who approves prod"],
    after: ["CI: safe to integrate?", "CD: safe to deliver?", "artifact = handoff", "gated promotion", "approval before prod"],

    failure: {
      title: "Treating a passing CI run as 'shipped'",
      steps: ["PR passes all CI tests", "assumed safe in prod", "no deploy verify step", "prod env config differs", "revenue job fails at 7 AM"],
      explain: "CI proved the <b>code</b> was safe to integrate — it never touched production. <b>CD's</b> verify step (smoke tests + data checks after deploy) is what catches environment/config problems. Blurring CI and CD is exactly how a green pipeline still breaks prod."
    },

    whenNot: "Don't chase <b>Continuous Deployment</b> (fully automatic prod releases) for a business-critical data pipeline just because it's the buzzword. When a wrong number reaches the executive dashboard, <b>Continuous Delivery with a human approval gate</b> is the safer default — automate everything <i>up to</i> prod, keep a person on the final button until your verification and rollback are truly trustworthy.",

    story: {
      situation: "RetailFlow's engineer pushes the net-revenue fix; the number feeds the 7 AM executive dashboard, so a mistake is highly visible.",
      problem: "The team wants fast, safe iteration without risking an unreviewed, unverified change hitting production revenue.",
      decision: "CI runs on every PR (build + pytest + dbt tests → artifact); CD deploys that artifact to test, verifies it, then to prod behind a required approval.",
      tool: "Continuous Integration + Continuous Delivery.",
      result: "Every change is continuously integrated and always release-ready, but prod stays behind a human approval gate — speed with a safety catch.",
      remember: "CI decides if a change is safe to integrate; CD decides how to deliver it — and Continuous Delivery keeps a human on the final prod button."
    },

    code: [{
      title: "One pipeline, two responsibilities (CI job hands artifact to CD job)",
      lang: "yaml",
      code: "jobs:\n" +
            "  ci:                     # is this change safe to integrate?\n" +
            "    steps:\n" +
            "      - run: pip install -r requirements.txt\n" +
            "      - run: pytest tests/ && dbt test   # build + test + quality\n" +
            "      - run: python -m build             # produce the artifact\n" +
            "      - uses: actions/upload-artifact@v4\n" +
            "        with: { name: revenue-pipeline, path: dist/ }\n\n" +
            "  cd:                     # how do we safely deliver it?\n" +
            "    needs: ci\n" +
            "    environment: prod     # required approval = Continuous Delivery\n" +
            "    steps:\n" +
            "      - uses: actions/download-artifact@v4   # SAME artifact, not rebuilt\n" +
            "        with: { name: revenue-pipeline }\n" +
            "      - run: ./scripts/deploy.sh && ./scripts/smoke_test.sh  # deploy + verify",
      highlights: [5, 6, 12, 14]
    }],

    remember: "CI: 'is this change safe to integrate?' → validated artifact. CD: 'how do we safely deliver it?' → deploy, verify, promote. Delivery keeps a human gate; Deployment removes it.",

    retention: {
      question: "RetailFlow's revenue change passes every CI test but the team still won't auto-release it. Which CD variant are they using, and why?",
      answer: "<b>Continuous Delivery</b> — every change is validated and release-ready, but a <b>human approves</b> the final push to prod. Because the number feeds the exec dashboard, they keep a person on the button rather than <b>Continuous Deployment</b>'s fully automatic release."
    },

    production: [
      { h: "Build once, promote the same artifact", body: "CI produces one validated artifact; CD promotes <i>that exact one</i> through dev → test → prod. Rebuilding per environment reintroduces 'works in test, breaks in prod' drift." },
      { h: "Verify after deploy, not just before merge", body: "A green CI run never touched prod. CD's post-deploy smoke tests + data checks are what catch config/environment problems before the 7 AM dashboard reads a wrong number." },
      { h: "Gate prod with approvals (Continuous Delivery)", body: "For revenue-critical pipelines, keep a human approval before prod and automated rollback on failed verification — speed up to prod, a safety catch on the final button." },
      { h: "Separate the gates", body: "CI gates protect <code>main</code> (required checks, review, coverage); CD gates protect production (environment protection, progressive rollout). Confusing them yields unreviewed merges or unguarded deploys." }
    ],

    misconceptions: [
      { myth: "CI/CD is one thing.", truth: "CI answers 'is this change safe to integrate?' and outputs an artifact; CD answers 'how do we deliver it safely?' They're two problems with two gates joined at the artifact." },
      { myth: "A passing CI run means it's shipped.", truth: "CI only validated the code — it never deployed. Delivery (config, environment, data) is CD's job, which is why a green pipeline can still break prod." },
      { myth: "CD always means fully automatic releases to prod.", truth: "That's Continuous <b>Deployment</b>. Continuous <b>Delivery</b> keeps a human approval before prod — every change is release-<i>ready</i>, not auto-released." },
      { myth: "You should rebuild the artifact for each environment.", truth: "You promote the <b>same</b> artifact CI produced; rebuilding risks a different output reaching prod than the one you tested." }
    ],

    troubleshooting: [
      { symptom: "All CI tests passed but the job fails in prod at 7 AM.", cause: "Environment/config differences CI never exercised.", fix: "Add a CD verify stage (smoke test + data-quality check) after deploy; verify it would have caught the prod-only failure, then gate promotion on it." },
      { symptom: "Test and prod behave differently for the 'same' release.", cause: "The artifact was rebuilt per environment.", fix: "Build once in CI, publish the artifact, and have every deploy stage download that identical artifact; verify by comparing artifact digests across environments." },
      { symptom: "A bad change auto-released to prod with no sign-off.", cause: "Continuous Deployment with no approval gate on a critical pipeline.", fix: "Switch to Continuous Delivery — add a required environment approval before prod; verify the deploy now pauses for a named approver." },
      { symptom: "A failed deploy left prod in a broken state.", cause: "No automated rollback on failed verification.", fix: "Wire CD to roll back to the last-good artifact when smoke/data checks fail; verify by forcing a failing check in a drill." }
    ],

    interview: [
      { q: "What's the precise difference between CI and CD?", a: "CI integrates code changes safely and produces a validated artifact (build → test → quality checks); CD takes that artifact and delivers it to environments safely (deploy → verify → promote). The artifact is the handoff: CI's output is CD's input." },
      { q: "Continuous Delivery vs Continuous Deployment — which would you pick for a revenue pipeline and why?", a: "Continuous Delivery: every change is validated and release-ready but a human approves the final prod push. For a number feeding the executive dashboard, keeping a person on the button is safer than Deployment's fully automatic release until verification and rollback are truly trustworthy." },
      { q: "How can a change pass all CI tests yet still break production?", a: "CI validated the code in the CI environment; it never touched prod's config, data, or environment. Only CD's post-deploy verification (smoke tests, data checks) exercises those, which is why delivery needs its own gate." },
      { q: "Why is the artifact the clean boundary between CI and CD?", a: "CI builds and tests it once, giving a reproducible, immutable thing to promote; CD moves that exact artifact through environments without rebuilding, so what runs in prod is provably what was tested." }
    ],

    problem: {
      before: "Early teams integrated their work <i>rarely</i> — everyone coded in isolation for weeks, then tried to merge on a 'integration day'. Releases were manual, hand-run checklists performed late at night by whoever drew the short straw.",
      insufficient: "Big-bang integration means conflicts and bugs all surface at once, far from when they were introduced, so nobody remembers the context. Manual releases are slow, unrepeatable, and terrifying — which makes teams release <i>less</i> often, which makes each release bigger and riskier. A vicious cycle.",
      failureModes: [
        "Two engineers' month-old branches conflict badly and the 'merge day' burns a week.",
        "A release step is forgotten because it lived only in one person's head.",
        "The team ships rarely, so every release is a high-stakes event instead of a routine non-event."
      ]
    },
    intuition: {
      plain: "CI and CD break that cycle into two small, automated, constantly-running habits. CI keeps everyone's work merged together and proven safe, all the time. CD keeps a validated build always ready to ship, and ships it through a safe, repeatable path.",
      analogy: "CI is like merging onto a highway continuously in small, safe moves instead of waiting to cross all lanes at once. CD is an assembly line that moves the same proven part through identical stations to the showroom.",
      breaks: "The assembly-line image suggests one fixed speed and no human choice; real CD often keeps a deliberate human <i>approval gate</i> before production (Continuous Delivery), which an assembly line doesn't have."
    },
    definition: {
      formal: "<b>Continuous Integration</b> is the practice of merging every developer's changes into a shared mainline frequently (at least daily), each merge verified by an automated build and test suite. <b>Continuous Delivery</b> is the practice of keeping that validated build always in a releasable state, releasing to production on a human decision. <b>Continuous Deployment</b> goes one step further: every change that passes the pipeline is released to production automatically, with no human gate.",
      distinguish: [
        { from: "Continuous Delivery vs Continuous Deployment", note: "Delivery keeps a human approval before prod; Deployment removes it. Both abbreviate to 'CD' — always say which you mean." },
        { from: "CI vs CD", note: "CI is about <i>integrating</i> code safely (output: a validated artifact); CD is about <i>delivering</i> that artifact safely (output: a running, verified release)." },
        { from: "A pipeline vs the practice", note: "A 'CI/CD pipeline' is the automation; CI/CD are the <i>practices</i> that automation supports. You can own a pipeline and still not practise CI if people branch for weeks." }
      ]
    },
    mechanics: [
      { h: "CI loop", body: "On every push/PR, an automated run checks out the merge result, builds, runs unit + data tests and quality gates, and reports a pass/fail status. A red result blocks the merge. Its durable output is a tested, reproducible <b>artifact</b>." },
      { h: "The artifact handoff", body: "CI publishes exactly one artifact (a wheel, a Docker image at a digest, a dbt package). CD consumes <i>that</i> artifact — it never rebuilds — so what reaches prod is provably what was tested." },
      { h: "CD promotion", body: "CD deploys the artifact to an environment, runs post-deploy verification (smoke tests, data-quality checks), and only then promotes the same artifact onward. Failed verification triggers rollback or halts promotion." },
      { h: "Two sets of gates", body: "CI gates protect the mainline (required checks, review). CD gates protect production (environment approvals, progressive rollout). They are separate systems with separate owners." }
    ],
    comparisons: [
      { title: "Continuous Delivery vs Continuous Deployment", aLabel: "Continuous Delivery", bLabel: "Continuous Deployment",
        rows: [
          { dim: "Human gate before prod", a: "Yes — explicit approval", b: "No — fully automatic" },
          { dim: "Release trigger", a: "A person clicks release", b: "A green pipeline releases" },
          { dim: "Best fit", a: "Revenue/regulated/data-critical", b: "Mature teams with strong verification + fast rollback" },
          { dim: "Risk posture", a: "Safety catch on the button", b: "Trust the pipeline entirely" }
        ],
        verdict: "For a number feeding the 7 AM exec dashboard, choose <b>Delivery</b> until your automated verification and rollback are genuinely trustworthy." }
    ],
    io: [
      { given: "A PR whose unit + dbt tests pass in CI", produces: "A published, validated artifact and a green required check", note: "CI's product is the artifact, not a deployment." },
      { given: "That artifact deployed to prod, then a smoke test fails", produces: "Automated rollback to the last-good artifact; promotion halts", note: "CD's verify step catches environment/config problems CI never saw." }
    ],
    knowledgeChecks: [
      { level: "Recall", q: "What is the durable output of a CI run?",
        options: [
          { label: "A validated, reproducible artifact", ok: true, why: "CI builds and tests once, producing the artifact CD promotes." },
          { label: "A production deployment", ok: false, why: "That's CD; CI never deploys." },
          { label: "A merged pull request only", ok: false, why: "The merge is gated by CI, but its product is the tested artifact." }
        ], revisit: "ci-vs-cd" },
      { level: "Explain", q: "Why can a change pass all of CI and still break production?",
        options: [
          { label: "CI validated the code, not prod's config/data/environment", ok: true, why: "Only CD's post-deploy verification exercises production specifics." },
          { label: "CI tests are always wrong", ok: false, why: "CI tests are valuable; they just don't cover delivery concerns." },
          { label: "It can't — green CI means prod is safe", ok: false, why: "This is the exact misconception that causes 7 AM surprises." }
        ], revisit: "ci-vs-cd" },
      { level: "Apply", q: "A revenue pipeline must not auto-release to prod. Which practice do you adopt?",
        options: [
          { label: "Continuous Delivery with an approval gate", ok: true, why: "Automate everything up to prod, keep a human on the final button." },
          { label: "Continuous Deployment", ok: false, why: "That removes the human gate — wrong for a revenue-critical release." },
          { label: "Drop CD entirely", ok: false, why: "You still want safe, repeatable delivery — just gated." }
        ], revisit: "ci-vs-cd" },
      { level: "Decide", q: "Test and prod disagree for the 'same' release. Best structural fix?",
        options: [
          { label: "Build once in CI and promote the identical artifact", ok: true, why: "Rebuilding per environment reintroduces drift; promote one artifact by digest." },
          { label: "Rebuild more carefully each time", ok: false, why: "Any rebuild can differ; the fix is to not rebuild." },
          { label: "Only test in prod", ok: false, why: "That removes the safety of pre-prod validation." }
        ], revisit: "artifact-lifecycle" }
    ],
    mastery: {
      task: "Sketch a two-job pipeline for RetailFlow where CI produces one artifact and CD delivers it to prod behind an approval — and write two sentences on why you chose Continuous Delivery over Deployment.",
      acceptance: [
        "CI job builds and tests and publishes a single artifact.",
        "CD job consumes that same artifact (downloads, does not rebuild).",
        "CD job is gated by a prod environment approval.",
        "Your rationale names the exec-dashboard risk and the verification/rollback maturity bar."
      ]
    },
    furtherReading: [
      { title: "Continuous Integration", publisher: "Martin Fowler", url: "https://martinfowler.com/articles/continuousIntegration.html", why: "The canonical definition and the practices (frequent merges, self-testing builds) behind CI.", read: "The whole article — short and foundational.", reviewed: "2026-10-20" },
      { title: "Continuous Delivery", publisher: "Humble & Farley", url: "https://continuousdelivery.com/", why: "The source for the deployment-pipeline model and build-once/promote principle.", read: "Principles; the deployment pipeline.", reviewed: "2026-10-20" }
    ],

    related: ["github-actions", "deployment-strategies", "rollback", "artifact-lifecycle"]
  }));
})();
