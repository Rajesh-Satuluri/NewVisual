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

    related: ["github-actions", "deployment-strategies", "rollback", "artifact-lifecycle"]
  }));
})();
