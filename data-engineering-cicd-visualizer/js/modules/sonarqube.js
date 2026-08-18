/* modules/sonarqube.js — Tier 2 · SonarQube (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "sonarqube",
    title: "SonarQube",
    tool: "--tool-sonarqube",
    icon: "🔎",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The automated code inspector with a gate — RetailFlow's pipeline fails the build if test coverage on the revenue module drops below the agreed threshold.",
    mentalImage: "STATIC ANALYSIS + QUALITY GATE",

    flowTitle: "Code passing through the quality gate",
    flow: ["Code", "sonar-scanner", "Static analysis", "Quality gate", "PASS / FAIL"],

    why: "Code review catches a lot, but humans miss subtle bugs, security holes, and slowly rotting quality — and 'we'll add tests later' quietly erodes coverage until a critical module is barely tested.",
    what: "SonarQube is a <b>static-analysis platform</b>: without running the code, it scans for bugs, vulnerabilities, and code smells, measures coverage and duplication, then enforces a <b>quality gate</b> that passes or fails the build.",
    how: "A scanner analyzes the code in CI and reports metrics to SonarQube; the <b>quality gate</b> compares them against thresholds (e.g. coverage ≥ 80%) and returns PASS or FAIL — a FAIL blocks the merge.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "SonarQube is like a spell-checker for code. It reads your code without running it and flags likely bugs, risky patterns, and messy spots — then a <b>gate</b> decides whether the code is clean enough to ship." },
        { h: "What it finds", body: "<ul><li><b>Bugs</b> — code that will likely misbehave.</li><li><b>Vulnerabilities</b> — security weaknesses.</li><li><b>Code smells</b> — maintainability problems.</li><li><b>Coverage</b> & <b>duplication</b> — how well-tested and how repetitive the code is.</li></ul>" },
        { h: "RetailFlow example", body: "An engineer tweaks the revenue module but skips writing tests. SonarQube sees coverage on that module dropped below the threshold, the <b>quality gate fails</b>, and the pull request is blocked until tests are added." }
      ],
      intermediate: [
        { h: "The quality gate", body: "A <b>quality gate</b> is a set of pass/fail conditions — e.g. 'coverage on new code ≥ 80%', 'zero new bugs', 'duplication < 3%'. If any condition fails, the gate is RED and CI fails the job, so bad code can't merge." },
        { h: "New code vs overall", body: "Modern SonarQube focuses on the <b>'Clean as You Code'</b> model: enforce strict standards on <i>new</i> code in each PR rather than boiling the ocean on legacy debt. Quality improves incrementally without blocking the whole team on old code." },
        { h: "Fitting into CI", body: "A <code>sonar-scanner</code> (or the SonarQube GitHub Action) runs as a step after tests, uploads coverage, and the workflow waits on the gate result. RetailFlow makes the gate a required check, so a RED gate stops the merge." }
      ],
      proficient: [
        { h: "Static analysis, not tests", body: "SonarQube analyzes code <i>without executing it</i> — complementary to pytest (which runs it) and data-quality checks (which validate output). It ingests the coverage report your tests produce but adds bug/vulnerability/smell detection tests can't." },
        { h: "Tuning the gate", body: "Too strict and teams route around it; too loose and it's theater. RetailFlow tunes rules per language, marks false positives, and gates on <b>new-code</b> metrics so the signal stays honest and actionable — coverage on the revenue module is a hard blocker." },
        { h: "Security & maintainability angle", body: "SonarQube flags injection risks, hardcoded secrets, and hotspots for review, and tracks the maintainability/reliability ratings that quantify technical debt — giving leads an objective, trend-able quality signal instead of gut feel." }
      ]
    },

    micro: ["static analysis", "sonar-scanner", "bugs", "code smells", "vulnerabilities", "security hotspots",
      "duplication", "coverage", "quality gate", "new code", "Clean as You Code", "technical debt",
      "reliability rating", "false positive", "required check"],

    before: ["reviewers miss bugs", "coverage silently rots", "secrets slip in", "duplication grows", "quality is a gut feel"],
    after: ["automated code scan", "coverage enforced", "vulnerabilities flagged", "gate blocks bad merges", "quality is measured"],

    failure: {
      title: "Coverage drops on the revenue module — gate blocks the merge",
      steps: ["Edit net-revenue formula", "skip the unit tests", "open PR", "sonar-scanner runs", "coverage on new code < 80%", "quality gate RED → CI fails → merge blocked"],
      explain: "The change to the revenue formula shipped without tests, dropping coverage on new code below the threshold. The <b>quality gate</b> turned RED and failed the CI job, so the untested revenue change couldn't merge until tests were added — the gate stopped rot at the door instead of after production."
    },

    whenNot: "SonarQube is for <b>code</b> quality — it won't tell you the <i>data</i> is stale (that's the data-quality layer) or that the code is functionally wrong (that's your tests). Don't set an unrealistically strict gate on a large legacy repo either; gate on new code and improve incrementally, or the team will just disable the check.",

    story: {
      situation: "RetailFlow requires solid test coverage on the revenue module because a bug there corrupts the executive dashboard.",
      problem: "Under deadline pressure, an engineer changes the net-revenue formula but skips the tests — and reviewers might not notice the coverage slip.",
      decision: "The team adds a SonarQube <b>quality gate</b> as a required CI check: coverage on new code must stay ≥ 80%.",
      tool: "SonarQube static analysis + quality gate.",
      result: "The scan sees coverage dropped, the gate goes RED, CI fails, and the PR is blocked until tests are written — the revenue module never merges under-tested.",
      remember: "The quality gate is a wall: RED code doesn't get through."
    },

    code: [{
      title: "SonarQube scan + quality gate as a required GitHub Actions step",
      lang: "yaml",
      code: "# .github/workflows/ci.yml\n" +
            "  quality:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    steps:\n" +
            "      - uses: actions/checkout@v4\n" +
            "      - name: Tests + coverage\n" +
            "        run: pytest --cov=transforms --cov-report=xml\n" +
            "      - name: SonarQube scan\n" +
            "        uses: SonarSource/sonarqube-scan-action@v4\n" +
            "        env:\n" +
            "          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}\n" +
            "      - name: Wait for quality gate   # fails the job if gate is RED\n" +
            "        uses: SonarSource/sonarqube-quality-gate-action@v1\n" +
            "        env:\n" +
            "          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}",
      highlights: [7, 12, 13]
    }],

    remember: "SonarQube reads your code without running it — bugs, vulnerabilities, smells, coverage — and a quality gate turns those metrics into a hard PASS/FAIL wall in CI: RED code can't merge.",

    retention: {
      question: "RetailFlow wants CI to block any PR that lowers test coverage on the revenue module below 80%, plus catch bugs and vulnerabilities automatically. What tool and mechanism does this?",
      answer: "<b>SonarQube</b> runs <b>static analysis</b> in CI (via <code>sonar-scanner</code> / its GitHub Action) to detect bugs, vulnerabilities, code smells, duplication, and coverage. A <b>quality gate</b> compares those against thresholds (coverage ≥ 80%); a RED gate fails the required check and blocks the merge."
    }
  }));
})();
