/* modules/cli-yaml-deps.js — Level 2 · Command Line, YAML, Dependencies & Builds
   A new foundations lesson (Iteration 4) filling curriculum Level 2.
   Built on the concept-module factory at golden-template depth. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "cli-yaml-deps",
    title: "Command Line, YAML & Dependencies",
    tool: "--brand",
    icon: "⌨️",
    eyebrow: "Level 2 · Foundations",
    subtitle: "The quiet building blocks every pipeline and workflow rests on: the terminal, exit codes, environment variables, pinned dependencies, YAML, and a repeatable build. Get these right and CI stops being mysterious.",
    mentalImage: "THE PLUMBING UNDER CI/CD",

    flowTitle: "From a command to a reproducible build",
    flow: ["open a shell", "set env vars", "create venv", "pip install (pinned)", "run command", "exit code 0/1", "build artifact"],

    problem: {
      before: "People ran scripts by double-clicking, installed packages globally with whatever version pip grabbed that day, and wrote config as ad-hoc files each tool parsed differently.",
      insufficient: "Global installs mean two projects fight over one package version. 'Latest' dependencies mean a build that worked yesterday breaks today when an upstream release lands. And a CI runner has no human to double-click — it needs commands that signal success or failure unambiguously.",
      failureModes: [
        "A job passes locally but fails on the runner because a dependency silently upgraded.",
        "A script 'finishes' but a later step wrongly assumes it succeeded, because nobody checked the exit code.",
        "A one-space YAML indentation error makes a whole workflow invalid."
      ]
    },

    intuition: {
      plain: "A CI runner is a computer with no human at the keyboard. Everything it does is a command whose success is reported by a number (the exit code), in an environment you describe with variables and a pinned list of dependencies, configured by YAML. Learn to think like that headless machine and CI becomes predictable.",
      analogy: "Think of a recipe followed by a robot cook: exact ingredients with exact quantities (pinned deps), a labelled pantry (environment variables), and steps that either complete or stop the whole dish (exit codes).",
      breaks: "A human cook improvises and recovers from a missing ingredient; the robot does not — if a step returns non-zero or a package version drifts, it just stops. That rigidity is the point: it's what makes the build reproducible."
    },

    definition: {
      formal: "An <b>exit code</b> is the integer a process returns on completion; 0 means success, non-zero means failure. An <b>environment variable</b> is a named value in a process's environment, inherited by child processes. A <b>virtual environment</b> is an isolated Python installation with its own packages. A <b>lockfile</b> pins the exact resolved version (and often hash) of every dependency. <b>YAML</b> is an indentation-sensitive data-serialization format used for configuration.",
      distinguish: [
        { from: "Environment variable vs secret", note: "Both are env values at runtime, but a <b>secret</b> is sensitive (a token) and must be masked and stored in a secret manager; ordinary config (a region) is just a variable." },
        { from: "requirements.txt vs a lockfile", note: "A loose <code>requirements.txt</code> (e.g. <code>pandas</code>) allows any version; a lockfile pins the exact resolved versions so every install is identical." },
        { from: "Build-time vs runtime dependency", note: "A build-time dep (a compiler, a packager) is needed to produce the artifact; a runtime dep is needed to run it. Shipping build-time deps to prod bloats and risks the image." }
      ]
    },

    why: "Every CI step is a shell command in a described environment. If you don't understand exit codes, env vars, and pinned dependencies, CI failures look like magic — and 'works on my machine' keeps winning.",
    what: "The portable foundation beneath all CI/CD: a shell and working directory, environment variables and exit codes, isolated and <b>pinned</b> dependencies, YAML configuration, and a build that produces the same artifact every time.",
    how: "You run commands in a shell; each returns an exit code CI checks. You isolate dependencies in a virtual environment and pin them in a lockfile so installs are identical. You configure tools in YAML. The result is a repeatable build that emits an artifact.",

    levels: {
      beginner: [
        { h: "The terminal is just typing commands", body: "A <b>shell</b> runs commands one line at a time in a <b>working directory</b>. <code>cd</code> changes directory, <code>ls</code> lists files, <code>python script.py</code> runs a script. CI does exactly this — no clicking." },
        { h: "Exit codes: the success signal", body: "Every command returns a number when it finishes: <b>0 = success</b>, anything else = failure. CI reads that number to decide pass or fail. <code>pytest</code> returning non-zero is what turns a check red." },
        { h: "Why pin dependencies", body: "If your project says just <code>pandas</code>, you get whatever version exists today. Pin it (<code>pandas==2.2.2</code>) so the build that passed yesterday still passes tomorrow." }
      ],
      intermediate: [
        { h: "Virtual environments", body: "<code>python -m venv .venv</code> then activate it to get an isolated set of packages per project, so two projects' dependencies don't collide. CI creates a fresh one each run." },
        { h: "Lockfiles & reproducibility", body: "A lockfile records the exact resolved version (and hash) of every transitive dependency. Installing from it gives a byte-for-byte identical dependency set on your laptop and the runner." },
        { h: "YAML without tears", body: "YAML is indentation-sensitive (spaces, never tabs). Maps are <code>key: value</code>; lists use <code>-</code>. A single wrong indent changes meaning or invalidates the file — which is why a workflow can silently fail to run." }
      ],
      proficient: [
        { h: "Config vs secrets (12-factor)", body: "Keep configuration in the environment, and keep <i>secrets</i> out of code and out of plaintext variables entirely. The same artifact reads different env values per environment — config changes, the build doesn't." },
        { h: "Build-time vs runtime deps", body: "Separate what's needed to <i>build</i> (compilers, build backends) from what's needed to <i>run</i>. Multi-stage Docker builds drop build-time deps from the final image for a smaller, safer artifact." },
        { h: "Deterministic builds", body: "Pin the base image by digest, pin dependencies by hash, avoid network calls at build time where possible — so the artifact is a pure function of its inputs and two builds of the same commit are identical." }
      ]
    },

    micro: ["shell", "working directory", "PATH", "environment variable", "exit code", "stdout/stderr",
      "process", "pip", "virtual environment", "requirements.txt", "lockfile", "pinning", "YAML",
      "indentation", "map", "list", "secret vs config", "build artifact", "reproducible build"],

    mechanics: [
      { h: "Processes and exit codes", body: "Running a command spawns a <b>process</b> that writes to stdout/stderr and returns an integer exit code. In a shell you can read it as <code>$?</code>; in CI, a non-zero code fails the step. Chaining with <code>&&</code> runs the next command only if the previous succeeded." },
      { h: "Environment & PATH", body: "A process inherits environment variables from its parent. <code>PATH</code> lists directories searched for executables — 'command not found' usually means the tool isn't on PATH. CI injects secrets/config as env vars for steps to read." },
      { h: "Dependency resolution & isolation", body: "<code>pip install</code> resolves a dependency graph and installs into the active environment. A <b>virtual environment</b> gives each project its own site-packages; installing from a <b>lockfile</b> skips resolution and reproduces an exact set." },
      { h: "YAML parsing", body: "A YAML parser turns indentation-structured text into nested maps and lists. Because structure is whitespace, an indentation mistake doesn't error loudly — it quietly produces the wrong structure, which is why workflow YAML must be validated." }
    ],

    trace: [
      { t: "Runner starts a fresh shell in the repo working directory", state: "running", detail: "No leftover packages or env from any previous run." },
      { t: "export DATABRICKS_HOST and read secrets from the environment", state: "running", detail: "Config/secrets arrive as environment variables, not hard-coded." },
      { t: "python -m venv .venv && source .venv/bin/activate", state: "success", detail: "An isolated environment so installs don't touch system Python." },
      { t: "pip install -r requirements.lock", state: "success", detail: "Exact pinned versions installed — identical to the author's machine." },
      { t: "pytest -q", state: "success", detail: "Tests pass; the process returns exit code 0." },
      { t: "python -m build", state: "success", detail: "Produces a wheel in dist/ — the artifact to promote." },
      { t: "A later deploy downloads that exact artifact", state: "deployed", detail: "What ships is provably what was built and tested." }
    ],

    annotated: [{
      title: "requirements.lock + a minimal CI step",
      lang: "yaml",
      code: "# requirements.lock  (pinned, reproducible)\n" +
            "pandas==2.2.2\n" +
            "pyspark==3.5.1\n" +
            "pytest==8.2.0\n" +
            "---\n" +
            "# a CI step that fails loudly on any error\n" +
            "steps:\n" +
            "  - run: |\n" +
            "      python -m venv .venv\n" +
            "      source .venv/bin/activate\n" +
            "      pip install -r requirements.lock\n" +
            "      pytest -q",
      notes: [
        { on: "pandas==2.2.2", what: "Pins the exact version.", why: "A loose <code>pandas</code> would float to whatever is newest, so a passing build could break with no code change.", ifRemoved: "Builds become non-reproducible and 'works on my machine' returns." },
        { on: "run: |", what: "A multi-line shell block.", why: "Each line runs in order; a non-zero exit from any line fails the step.", ifRemoved: "You can't sequence the setup commands in one step." },
        { on: "source .venv/bin/activate", what: "Activates the isolated environment.", why: "So pip installs into the project venv, not system Python.", ifRemoved: "Installs leak into the system and can collide across projects." }
      ]
    }],

    io: [
      { given: "A command that succeeds (<code>pytest</code> all green)", produces: "Exit code <b>0</b> → the CI step passes", note: "CI reads the exit code, not the console text." },
      { given: "A loose <code>requirements.txt</code> and an upstream release overnight", produces: "A different dependency set than yesterday → possible surprise failure", note: "Why pinning/lockfiles exist." },
      { given: "A YAML file with one wrong indent", produces: "A structurally different (or invalid) config → the workflow may not run", note: "Validate YAML; whitespace is structure." }
    ],

    comparisons: [
      { title: "Loose requirements vs lockfile", aLabel: "requirements.txt (loose)", bLabel: "lockfile (pinned)",
        rows: [
          { dim: "Version chosen", a: "Whatever resolves today", b: "Exact, recorded version" },
          { dim: "Reproducible?", a: "No", b: "Yes — identical every install" },
          { dim: "Catches upstream breakage", a: "No — it just happens", b: "Yes — only changes when you update the lock" },
          { dim: "Use for", a: "Quick experiments", b: "CI and anything shipped" }
        ],
        verdict: "Develop with loose ranges if you like, but <b>install from a lockfile</b> in CI and production." },
      { title: "Config vs secret", aLabel: "Config (variable)", bLabel: "Secret",
        rows: [
          { dim: "Example", a: "AWS_REGION, warehouse name", b: "API token, DB password" },
          { dim: "Sensitive?", a: "No", b: "Yes" },
          { dim: "Storage", a: "Plain variable / env", b: "Secret manager, encrypted + masked" },
          { dim: "In logs", a: "Fine to print", b: "Must never print" }
        ],
        verdict: "Both arrive as environment values, but a credential in a plaintext variable is a security bug." }
    ],

    failures: [
      { symptom: "'Command not found' in a CI step.",
        evidence: "The step exits non-zero immediately; the tool name is unrecognized.",
        rootCause: "The executable isn't installed or isn't on PATH in the runner.",
        investigation: ["Confirm the install step ran and succeeded.", "Check whether activation (venv) happened in the same step.", "Echo PATH to see what's available."],
        correction: "Install the tool and/or activate the environment in the same step that uses it.",
        verification: "The command runs and the step passes.",
        prevention: "Keep install + use in one step, or persist the environment correctly between steps." },
      { symptom: "A build that passed yesterday fails today with no code change.",
        evidence: "A dependency resolved to a newer version in the logs.",
        rootCause: "Dependencies are unpinned, so an upstream release changed the install.",
        investigation: ["Diff the installed versions against the last good run.", "Check for loose ranges in requirements."],
        correction: "Pin versions and install from a lockfile.",
        verification: "Re-running reproduces the exact dependency set.",
        prevention: "Install from a lockfile in CI; update it deliberately." },
      { symptom: "A workflow silently never runs after a YAML edit.",
        evidence: "Nothing appears in the Actions tab; no error on the commit.",
        rootCause: "An indentation mistake made the YAML invalid or changed its structure.",
        investigation: ["Open the Actions tab for a parse error.", "Lint the YAML; check indentation (spaces, not tabs)."],
        correction: "Fix the indentation/structure.",
        verification: "A new run appears and reports.",
        prevention: "Lint YAML in review; use an editor that shows whitespace." }
    ],

    knowledgeChecks: [
      { level: "Recall", q: "What exit code means success?",
        options: [
          { label: "0", ok: true, why: "Zero means success; non-zero means failure." },
          { label: "1", ok: false, why: "1 (any non-zero) signals failure." },
          { label: "200", ok: false, why: "That's an HTTP status, not a process exit code." }
        ], revisit: "cli-yaml-deps" },
      { level: "Explain", q: "Why install from a lockfile in CI?",
        options: [
          { label: "To reproduce an identical dependency set every run", ok: true, why: "Pinned, resolved versions remove 'it upgraded overnight' failures." },
          { label: "To install faster only", ok: false, why: "Speed is a side benefit; reproducibility is the point." },
          { label: "Lockfiles aren't needed in CI", ok: false, why: "CI is exactly where reproducibility matters most." }
        ], revisit: "cli-yaml-deps" },
      { level: "Predict", q: "Your requirements say just <code>pandas</code> and a new pandas ships overnight. Next CI run?",
        options: [
          { label: "May install the new version and behave differently", ok: true, why: "Loose specs float to the newest compatible release." },
          { label: "Always installs the old version", ok: false, why: "Nothing pins it to the old version." },
          { label: "Refuses to install", ok: false, why: "It installs — just possibly a different version." }
        ], revisit: "cli-yaml-deps" },
      { level: "Troubleshoot", q: "A secret value appears in plaintext in your logs. Most likely cause?",
        options: [
          { label: "It was stored as a variable, not a masked secret", ok: true, why: "Variables are plaintext; credentials belong in masked secrets." },
          { label: "Logs always show secrets", ok: false, why: "Properly stored secrets are masked in logs." },
          { label: "The runner is broken", ok: false, why: "Far more likely it was mis-stored as a variable." }
        ], revisit: "secrets" },
      { level: "Apply", q: "You want two commands to run, the second only if the first succeeds. What do you write?",
        options: [
          { label: "<code>cmd1 && cmd2</code>", ok: true, why: "<code>&&</code> runs cmd2 only on cmd1's success (exit 0)." },
          { label: "<code>cmd1 ; cmd2</code>", ok: false, why: "<code>;</code> runs cmd2 regardless of cmd1's result." },
          { label: "<code>cmd1 || cmd2</code>", ok: false, why: "<code>||</code> runs cmd2 only if cmd1 <i>fails</i>." }
        ], revisit: "cli-yaml-deps" },
      { level: "Decide", q: "A build-time compiler dependency — should it ship in the production image?",
        options: [
          { label: "No — drop it in a multi-stage build", ok: true, why: "Runtime images shouldn't carry build-only tools; it bloats and widens attack surface." },
          { label: "Yes — always include everything", ok: false, why: "That bloats the image and adds risk." },
          { label: "It doesn't matter", ok: false, why: "Image size and security both suffer if build deps ship." }
        ], revisit: "docker" }
    ],

    mastery: {
      task: "Write the shell steps that, from a clean checkout, produce a reproducible test run for RetailFlow's revenue package — isolating dependencies, installing pinned versions, and failing the whole sequence if any step fails.",
      acceptance: [
        "Creates and activates a virtual environment.",
        "Installs from a pinned lockfile (not loose ranges).",
        "Runs the tests such that a non-zero exit fails the sequence (uses && or a failing-fast block).",
        "Reads any credential from an environment variable, never hard-codes it."
      ],
      hint: "python -m venv .venv && source .venv/bin/activate && pip install -r requirements.lock && pytest -q"
    },

    misconceptions: [
      { myth: "A command that printed output must have succeeded.", truth: "Success is the <b>exit code</b> (0), not whether it printed text. A tool can print errors and still need its non-zero code checked." },
      { myth: "<code>requirements.txt</code> makes builds reproducible.", truth: "Only if versions are pinned (ideally with hashes). Loose specs float to new releases and break reproducibility." },
      { myth: "Environment variables are a safe place for secrets.", truth: "Plain variables are fine for config but not secrets — use a secret manager that encrypts and masks; never print a credential." },
      { myth: "YAML and JSON indentation are interchangeable and forgiving.", truth: "YAML structure <i>is</i> its indentation (spaces, not tabs); a wrong indent silently changes meaning." }
    ],

    interview: [
      { q: "What does a process exit code tell CI, and how is it used?", a: "It's the integer a process returns on completion — 0 for success, non-zero for failure. CI reads it to decide whether a step passed; chaining with <code>&&</code> stops on the first failure, which is how a failing test turns a check red." },
      { q: "Why pin dependencies with a lockfile for CI and production?", a: "So every install reproduces an identical, resolved dependency set (often verified by hash). Loose specs float to new upstream releases, so a build that passed can break with no code change — the classic non-reproducible-build failure." },
      { q: "How do you separate configuration from secrets, and why does it matter?", a: "Config (region, warehouse) can be plain environment variables; secrets (tokens, passwords) go in a secret manager that encrypts and masks them. Putting a credential in a plaintext variable leaks it in logs — a real security bug — while keeping config in the environment lets the same artifact run everywhere." },
      { q: "What makes a build reproducible?", a: "Its output depends only on its inputs: pinned dependencies (by version and hash), a pinned base image (by digest), and no uncontrolled network or time-dependent steps — so two builds of the same commit produce the same artifact." }
    ],

    furtherReading: [
      { title: "Python venv — Creation of virtual environments", publisher: "Python docs", url: "https://docs.python.org/3/library/venv.html", why: "The standard way to isolate per-project dependencies.", read: "The whole short page.", reviewed: "2026-10-20" },
      { title: "pip — Requirements & constraints", publisher: "pip docs", url: "https://pip.pypa.io/en/stable/", why: "How requirements files, pinning, and hashes work.", read: "User guide → Requirements files; Secure installs (hash-checking).", reviewed: "2026-10-20" },
      { title: "The Twelve-Factor App — Config", publisher: "12factor.net", url: "https://12factor.net/config", why: "Why configuration (and secrets) belong in the environment, not the code.", read: "Factor III — Config.", reviewed: "2026-10-20" }
    ],

    remember: "A CI runner is a headless computer: commands return exit codes (0 = pass), environment variables carry config/secrets, pinned lockfiles make installs identical, and YAML's indentation is its structure. Master these and CI stops being magic.",

    related: ["github-actions", "docker", "secrets", "git"]
  }));
})();
