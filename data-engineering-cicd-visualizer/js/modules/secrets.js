/* modules/secrets.js — Tier 2 · Secrets & Environment Management (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "secrets",
    title: "Secrets & Environment Management",
    tool: "--tool-secrets",
    icon: "🔐",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Keeping credentials out of code — RetailFlow's pipeline reaches the payments API through a Key Vault secret injected at runtime, never a password sitting in a Git file.",
    mentalImage: "CODE · CONFIG · SECRETS",

    flowTitle: "A secret reaching the pipeline",
    flow: ["Secret store", "OIDC / identity", "CI requests secret", "Injected at runtime", "Pipeline reads env var", "Payments API"],

    why: "The classic breach: someone writes <code>PASSWORD=abc123</code> in the repo, it's pushed to GitHub, and that credential is now permanently in Git history for anyone with access — leaks like this cause real incidents.",
    what: "Secrets management <b>separates Code, Config, and Secrets</b>: source lives in Git, environment-specific settings live in config, and credentials live in a dedicated <b>secret store</b> that injects them at runtime.",
    how: "The pipeline never contains the password. A secret store (Key Vault, Secrets Manager, GitHub Secrets) holds it; the workload authenticates with a short-lived identity (OIDC), and the secret is <b>injected as an environment variable</b> when the job runs.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Think of three separate drawers: <b>Code</b> (your logic, in Git), <b>Config</b> (which database, safe to see), and <b>Secrets</b> (passwords and keys, locked away). Never mix a secret into the code drawer." },
        { h: "Never commit a password", body: "Writing <code>PASSWORD=abc123</code> in a file and pushing it means the secret is now in Git history <b>forever</b> — deleting the line later doesn't remove it. Keep secrets out of the repo entirely." },
        { h: "RetailFlow example", body: "The revenue pipeline calls a payments API that needs a key. The key lives in <b>Azure Key Vault</b>; at runtime it's handed to the job as an environment variable. The code just reads <code>os.environ['PAYMENTS_API_KEY']</code> — it never contains the value." }
      ],
      intermediate: [
        { h: "Where secrets live", body: "<ul><li><b>GitHub Secrets</b> — for CI workflow steps.</li><li><b>Azure Key Vault</b> / <b>AWS Secrets Manager</b> — cloud secret stores with access policies.</li><li><b>Kubernetes Secrets</b> — for pods at runtime.</li><li><b>Databricks secret scopes</b> — for notebooks/jobs.</li></ul>" },
        { h: "Injection & environment separation", body: "Secrets are <b>injected</b> at runtime as env vars or mounted files — never baked into images or code. Each environment gets its own secret: dev's payments key differs from prod's, so a dev leak can't touch production money." },
        { h: "Least privilege & rotation", body: "Grant each identity only the secrets it needs (<b>least privilege</b>). <b>Rotate</b> secrets on a schedule and immediately after any suspected leak, so an exposed credential has a short useful life." }
      ],
      proficient: [
        { h: "OIDC & short-lived credentials", body: "The strongest pattern uses <b>no stored long-lived secret at all</b>: GitHub Actions authenticates to Azure/AWS via <b>OIDC</b>, exchanging a signed workflow token for a short-lived cloud credential. Nothing durable to leak, and access expires in minutes." },
        { h: "Defense in depth", body: "Combine store-level access policies, per-environment isolation, audit logging on secret reads, and pre-commit / push secret scanning. Secret scanning + push protection stops <code>PASSWORD=abc123</code> before it ever lands in history." },
        { h: "Incident response", body: "A leaked secret is not 'fixed' by deleting the commit — the value must be treated as compromised and <b>rotated</b>: issue a new credential, update the store, revoke the old one, then scrub history. Rotation is the real remediation, not the git rewrite." }
      ]
    },

    micro: ["GitHub Secrets", "Azure Key Vault", "AWS Secrets Manager", "Kubernetes Secrets",
      "Databricks secret scopes", "secret injection", "environment variable", "environment separation",
      "least privilege", "secret rotation", "OIDC", "short-lived credentials", "secret scanning", "audit log"],

    before: ["PASSWORD=abc123 in repo", "same key everywhere", "credential in Git history", "no rotation", "one leak = full access"],
    after: ["secrets in a vault", "injected at runtime", "per-environment keys", "OIDC short-lived creds", "rotate on demand"],

    failure: {
      title: "Payments API key committed to Git",
      steps: ["Hard-code key in config.py", "git push", "key now in history", "repo/log exposed", "leak → attacker hits payments API", "rotate the key"],
      explain: "Once pushed, the credential lives in Git history and cannot be un-seen. The only real fix is to <b>rotate</b> — issue a new key in Key Vault, revoke the old one, and inject the new one at runtime. <b>Secret scanning with push protection</b> would have blocked the commit entirely."
    },

    whenNot: "A secret store is for <b>credentials</b>, not for non-sensitive config. Don't push connection <i>hostnames</i>, feature flags, or region names through Key Vault — that's ordinary config that belongs in checked-in files. Over-vaulting harmless values adds friction and hides what's actually sensitive.",

    story: {
      situation: "RetailFlow's revenue pipeline must call the payments API, which requires a secret key.",
      problem: "An early version hard-coded the key in a config file — one push away from leaking it into Git history forever.",
      decision: "The team moves the key into <b>Azure Key Vault</b>, grants the pipeline's identity least-privilege read access, and injects it as an env var at runtime (via OIDC, no stored password).",
      tool: "Azure Key Vault + runtime secret injection.",
      result: "The code reads <code>PAYMENTS_API_KEY</code> from the environment and never contains the value. Rotating the key is a vault update — no code change, no leak.",
      remember: "Secrets live in the vault and arrive at runtime — never in the code."
    },

    code: [{
      title: "Inject a Key Vault secret at runtime — never in code",
      lang: "yaml",
      code: "# .github/workflows/pipeline.yml\n" +
            "jobs:\n" +
            "  run-pipeline:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    permissions:\n" +
            "      id-token: write        # enable OIDC (no stored password)\n" +
            "    steps:\n" +
            "      - uses: azure/login@v2\n" +
            "        with:\n" +
            "          client-id: ${{ secrets.AZURE_CLIENT_ID }}\n" +
            "          tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n" +
            "          subscription-id: ${{ secrets.AZURE_SUB_ID }}\n" +
            "      - name: Fetch payments key and run\n" +
            "        run: |\n" +
            "          export PAYMENTS_API_KEY=$(az keyvault secret show \\\n" +
            "            --vault-name retailflow-kv --name payments-api-key \\\n" +
            "            --query value -o tsv)\n" +
            "          python run_revenue_pipeline.py   # reads os.environ['PAYMENTS_API_KEY']",
      highlights: [6, 15, 19]
    }],

    remember: "Code, config, and secrets are three separate drawers — the secret lives in a vault and is injected at runtime; if it ever leaks, you rotate it, you don't just delete the commit.",

    retention: {
      question: "RetailFlow's pipeline needs a payments API key but must never store it in the repo. How should the key reach the code, and what do you do if it leaks?",
      answer: "Keep the key in a <b>secret store</b> (Azure Key Vault), grant the pipeline least-privilege access via <b>OIDC</b> short-lived credentials, and <b>inject it at runtime</b> as an env var the code reads — the value is never in Git. If it leaks, <b>rotate</b> it (new key, revoke old); deleting the commit is not enough."
    }
  }));
})();
