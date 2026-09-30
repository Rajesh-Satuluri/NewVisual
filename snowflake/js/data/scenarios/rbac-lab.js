/* RBAC Design Lab — seed bank (design renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'rb-analyst-ro', area: 'rbac-lab', category: 'Access design', difficulty: 'beginner',
      tag: '🔐 Requirement',
      title: 'Read-only analysts on production analytics',
      requirements: 'Analysts must query production analytics tables but must never modify them.',
      steps: [
        {
          prompt: 'How do you grant this?',
          choices: [
            { text: 'Create an access role with SELECT on the schema, grant it to an ANALYST business role', correct: true, why: 'Access role holds SELECT-only privileges; business role is what analysts get — clean, least-privilege, auditable.' },
            { text: 'Grant analysts OWNERSHIP of the tables', correct: false, why: 'Ownership implies full control including modify/drop — the opposite of read-only.' },
            { text: 'Grant ALL PRIVILEGES on the database', correct: false, why: 'Massive over-privilege; violates least privilege.' },
          ],
          insight: 'Separate access roles (privileges) from business roles (people).',
        },
        {
          prompt: 'New tables are added to the schema monthly. How do analysts get access automatically?',
          choices: [
            { text: 'GRANT SELECT ON FUTURE TABLES IN SCHEMA to the access role', correct: true, why: 'Future grants cover objects created later without manual re-grants.' },
            { text: 'Re-grant every table by hand each month', correct: false, why: 'Manual, error-prone, and forgotten access is the classic RBAC bug.' },
            { text: 'Give analysts CREATE so they self-serve', correct: false, why: 'Wrong privilege and over-permissive.' },
          ],
        },
      ],
      architecture: 'ANALYST business role ← analytics_read access role (SELECT on schema + FUTURE SELECT). Backfill existing tables once; future grants cover new ones.',
      tradeoffs: 'Two-tier roles add a little structure now for far easier maintenance and auditing later.',
      failureModes: 'Missing future grants → new tables invisible to analysts. Backfill + future grants together.',
      cost: 'No compute cost; purely governance.',
      interviewAnswer: 'I create a read access role with SELECT on the schema plus a future grant, and grant that to an ANALYST business role. Least privilege, no ownership, and future grants so monthly new tables are covered automatically — then I backfill existing tables once.',
    },
    {
      id: 'rb-eng-staging', area: 'rbac-lab', category: 'Access design', difficulty: 'intermediate',
      tag: '🔐 Requirement',
      title: 'Engineers create in staging, no PII in prod',
      requirements: 'Data engineers can create/modify tables in STAGING but must not read sensitive PII columns in PRODUCTION.',
      steps: [
        {
          prompt: 'How do you grant staging create rights?',
          choices: [
            { text: 'Access role with CREATE TABLE + DML on STAGING, granted to ENGINEER role', correct: true, why: 'Scoped create/DML on staging only — least privilege for their build work.' },
            { text: 'Grant CREATE on the whole account', correct: false, why: 'Far too broad.' },
            { text: 'Make engineers ACCOUNTADMIN', correct: false, why: 'Extreme over-privilege.' },
          ],
        },
        {
          prompt: 'How do you block PII reads in production while allowing non-PII access?',
          choices: [
            { text: 'Dynamic data masking policies on PII columns tied to role', correct: true, why: 'Masking policies reveal/obscure column values per role, so engineers see non-PII but PII is masked.' },
            { text: 'Trust engineers not to query PII', correct: false, why: 'Governance cannot rely on trust.' },
            { text: 'Deny all production access', correct: false, why: 'Overly restrictive; they may legitimately need non-PII prod data.' },
          ],
          insight: 'Column-level control = masking policies; row-level = row-access policies.',
        },
      ],
      architecture: 'ENGINEER role ← staging_rw access role (CREATE/DML on STAGING) + prod_read access role (SELECT on PROD). Masking policies on PII columns unmask only for privileged roles.',
      tradeoffs: 'Masking adds policy management but enables safe shared access to the same tables.',
      failureModes: 'PII exposed if a column is added without a masking policy — govern masking via tags/policies.',
      cost: 'Negligible; policy evaluation at query time.',
      interviewAnswer: 'I scope a staging_rw access role for CREATE/DML on STAGING and a prod_read role for SELECT, both under the ENGINEER role, then apply dynamic masking policies on PII columns so engineers see non-PII in production while PII stays masked for their role.',
    },
    {
      id: 'rb-denied', area: 'rbac-lab', category: 'Troubleshooting', difficulty: 'intermediate',
      tag: '🔐 Requirement',
      title: 'User has the role but still gets denied',
      requirements: 'A user was granted the correct role but SELECT on a new table fails with insufficient privileges. Design the diagnosis.',
      steps: [
        {
          prompt: 'First thing to verify?',
          choices: [
            { text: 'The role is active/inherited in the session (or default role)', correct: true, why: 'Grants are inert until the role is actually in use or inherited by the active role.' },
            { text: 'The table size', correct: false, why: 'Irrelevant to authorization.' },
            { text: 'Whether Time Travel is on', correct: false, why: 'Unrelated to privileges.' },
          ],
        },
        {
          prompt: 'Role is active but the NEW table still fails. Why?',
          choices: [
            { text: 'No future grant, so objects created after the grant are uncovered', correct: true, why: 'Existing-object grants do not cover later-created tables; future grants do.' },
            { text: 'The table must be recreated', correct: false, why: 'Unnecessary; add the grant/future grant.' },
            { text: 'Ownership transfers on query', correct: false, why: 'It does not.' },
          ],
          insight: 'Walk the chain: user → active role → hierarchy → object grants → future grants → ownership.',
        },
      ],
      architecture: 'Ensure the role is default/active or inherited; add FUTURE grants for new objects; backfill existing objects; verify ownership is on a standard role.',
      tradeoffs: 'Managed-access schemas centralize grant control at the cost of some flexibility.',
      failureModes: 'Scattered ownership from ad-hoc creators; standardize the creating role.',
      cost: 'Governance only.',
      interviewAnswer: 'I diagnose down the chain: is the role active/inherited, does the privilege exist at each level, and was the object created after the grant? Here the role was active but there was no future grant, so I add future grants, backfill existing tables, and standardize ownership so this stops recurring.',
    },
    {
      id: 'rb-hierarchy', area: 'rbac-lab', category: 'Hierarchy', difficulty: 'advanced',
      tag: '🔐 Requirement',
      title: 'Design a clean role hierarchy',
      requirements: 'Multiple teams need layered access that rolls up to admins without granting privileges directly to users.',
      steps: [
        {
          prompt: 'How do you structure roles?',
          choices: [
            { text: 'Functional access roles granted into business roles, business roles into users, rolling up to SYSADMIN', correct: true, why: 'Privileges live on access roles; business roles compose them; a hierarchy rolls up so admins inherit.' },
            { text: 'Grant privileges directly to each user', correct: false, why: 'Unmanageable and unauditable at scale.' },
            { text: 'One super-role everyone shares', correct: false, why: 'No isolation or least privilege.' },
          ],
          insight: 'Grant roles to roles to build inheritance; grant privileges only to (access) roles.',
        },
        {
          prompt: 'Where should custom roles ultimately roll up?',
          choices: [
            { text: 'Into SYSADMIN (which manages objects), keeping ACCOUNTADMIN minimal', correct: true, why: 'SYSADMIN should own/administer objects; ACCOUNTADMIN is reserved and audited.' },
            { text: 'Into ACCOUNTADMIN for convenience', correct: false, why: 'Over-privileges the account admin and muddies separation of duties.' },
            { text: 'Nowhere — leave them orphaned', correct: false, why: 'Orphaned roles complicate administration.' },
          ],
        },
      ],
      architecture: 'Users ← business roles ← access roles (object privileges). Custom roles roll up to SYSADMIN; ACCOUNTADMIN/SECURITYADMIN reserved and audited.',
      tradeoffs: 'More roles to manage vs clear, auditable, least-privilege access.',
      failureModes: 'Role explosion; keep a naming convention and periodic review.',
      cost: 'Governance only.',
      interviewAnswer: 'Privileges go only on access roles, which are granted into business roles, which are granted to users — a hierarchy that rolls up to SYSADMIN for object administration while ACCOUNTADMIN stays minimal and audited. This keeps access least-privilege, inheritable, and auditable.',
    },
    {
      id: 'rb-managed-access', area: 'rbac-lab', category: 'Ownership', difficulty: 'advanced',
      tag: '🔐 Requirement',
      title: 'Prevent scattered ownership',
      requirements: 'Different roles create objects in a shared schema, so ownership scatters and grants become inconsistent.',
      steps: [
        {
          prompt: 'How do you centralize grant control?',
          choices: [
            { text: 'Use a MANAGED ACCESS schema so only the schema owner manages grants', correct: true, why: 'In managed-access schemas, object owners cannot grant on their objects; the schema owner centralizes all grants.' },
            { text: 'Let each creator manage their own grants', correct: false, why: 'Exactly what causes inconsistency.' },
            { text: 'Grant everyone ownership', correct: false, why: 'Worsens the sprawl.' },
          ],
          insight: 'Managed-access schemas move grant authority to the schema owner.',
        },
        {
          prompt: 'How do you keep ownership predictable?',
          choices: [
            { text: 'Have a single standard role create objects (or use CREATE ... COPY GRANTS patterns)', correct: true, why: 'A consistent creating role keeps ownership uniform and grants predictable.' },
            { text: 'Rotate creators randomly', correct: false, why: 'Guarantees scattered ownership.' },
            { text: 'Ignore ownership', correct: false, why: 'Leads to the denied-access bugs.' },
          ],
        },
      ],
      architecture: 'Managed-access schema owned by a functional role; a standard creating role owns objects; grants centralized at the schema owner; future grants for new objects.',
      tradeoffs: 'Central control reduces team autonomy slightly but eliminates grant drift.',
      failureModes: 'Bypassing the standard creating role; enforce via process/CI.',
      cost: 'Governance only.',
      interviewAnswer: 'I make the schema managed-access so only the schema owner controls grants, and I have a single standard role create objects so ownership stays uniform. Combined with future grants, this eliminates the scattered-ownership and inconsistent-grant problems.',
    },
    {
      id: 'rb-row-access', area: 'rbac-lab', category: 'Row-level', difficulty: 'advanced',
      tag: '🔐 Requirement',
      title: 'Region-restricted row visibility',
      requirements: 'Sales reps must see only their own region\'s rows in a shared orders table.',
      steps: [
        {
          prompt: 'How do you enforce per-region row visibility?',
          choices: [
            { text: 'A row-access policy mapping the active role/region to allowed rows', correct: true, why: 'Row-access policies filter rows at query time based on role/context — one table, many role-specific views.' },
            { text: 'A separate table per region', correct: false, why: 'Duplicative and hard to maintain.' },
            { text: 'Trust reps to filter their queries', correct: false, why: 'Not enforceable governance.' },
          ],
          insight: 'Row-level control = row-access policies; column-level = masking.',
        },
        {
          prompt: 'How do reps get the right region mapping?',
          choices: [
            { text: 'Drive the policy from a mapping table (role/user → region)', correct: true, why: 'A lookup keeps the policy data-driven and maintainable as reps/regions change.' },
            { text: 'Hard-code regions in the policy body', correct: false, why: 'Brittle; every change requires editing the policy.' },
            { text: 'Create a role per rep', correct: false, why: 'Role explosion.' },
          ],
        },
      ],
      architecture: 'Row-access policy on orders referencing a role/region mapping table; one shared table serves all regions with role-scoped visibility.',
      tradeoffs: 'Policy evaluation adds slight query overhead vs strong, centralized enforcement.',
      failureModes: 'Stale mapping table; keep it maintained and tested.',
      cost: 'Minor query-time policy evaluation.',
      interviewAnswer: 'I attach a row-access policy to the shared orders table, driven by a role/region mapping table, so each rep sees only their region from one table. It is enforced server-side and stays maintainable because the mapping is data-driven rather than hard-coded.',
    },
    {
      id: 'rb-share-secure', area: 'rbac-lab', category: 'Sharing', difficulty: 'intermediate',
      tag: '🔐 Requirement',
      title: 'Expose a governed slice to another team',
      requirements: 'Another internal team needs a limited, governed view of your data without access to underlying raw tables.',
      steps: [
        {
          prompt: 'What do you expose?',
          choices: [
            { text: 'Secure views with only the permitted columns/rows, granted to their role', correct: true, why: 'Secure views hide the underlying query/definition and expose exactly the permitted slice.' },
            { text: 'Direct SELECT on the raw base tables', correct: false, why: 'Over-exposes data and internal structure.' },
            { text: 'A copy of the data for them', correct: false, why: 'Duplicative and drift-prone.' },
          ],
          insight: 'Secure views (not regular views) prevent definition/data leakage.',
        },
        {
          prompt: 'How do you grant it cleanly?',
          choices: [
            { text: 'Grant SELECT on the secure views to their access role, with future grants if the view set grows', correct: true, why: 'Role-based grant keeps it least-privilege and maintainable.' },
            { text: 'Grant to individual users', correct: false, why: 'Unmanageable and unauditable.' },
            { text: 'Grant ownership of the views', correct: false, why: 'Gives them control they should not have.' },
          ],
        },
      ],
      architecture: 'Secure views over base tables (permitted rows/cols) → granted SELECT to the consumer team\'s access role; base tables remain hidden.',
      tradeoffs: 'Secure views may limit some optimizations vs regular views, in exchange for governance.',
      failureModes: 'Using regular views leaks definitions; always use secure views for cross-team exposure.',
      cost: 'Governance only.',
      interviewAnswer: 'I expose secure views limited to the permitted rows and columns and grant SELECT on them to the other team\'s access role, keeping the raw tables hidden. Secure views prevent definition/data leakage, and role-based grants keep it least-privilege and auditable.',
    },
    {
      id: 'rb-service-account', area: 'rbac-lab', category: 'Automation', difficulty: 'intermediate',
      tag: '🔐 Requirement',
      title: 'Least-privilege service account for a pipeline',
      requirements: 'An ETL service account must load and transform in specific schemas but nothing more.',
      steps: [
        {
          prompt: 'How do you scope the service account?',
          choices: [
            { text: 'A dedicated role with exactly the needed CREATE/DML/SELECT on target schemas, key-pair auth', correct: true, why: 'A purpose-built role with minimal privileges and key-pair (not password) auth is the least-privilege pattern for automation.' },
            { text: 'Reuse a human admin\'s role', correct: false, why: 'Over-privileged and ties automation to a person.' },
            { text: 'Give it SYSADMIN', correct: false, why: 'Far more than the pipeline needs.' },
          ],
          insight: 'Automation gets its own minimal role and key-pair auth, never a human/admin role.',
        },
        {
          prompt: 'How do you bound its compute cost?',
          choices: [
            { text: 'Its own warehouse with resource monitor + short auto-suspend', correct: true, why: 'Dedicated warehouse isolates and attributes cost; monitor caps runaway spend.' },
            { text: 'Share the BI warehouse', correct: false, why: 'Mixes workloads and cost.' },
            { text: 'No limits', correct: false, why: 'Risks runaway credits.' },
          ],
        },
      ],
      architecture: 'Service role: CREATE/DML/SELECT on target schemas only; key-pair auth; dedicated warehouse with resource monitor and short auto-suspend.',
      tradeoffs: 'More roles/warehouses to manage vs isolation, security, and cost attribution.',
      failureModes: 'Credential leakage; rotate keys and restrict network policy.',
      cost: 'Bounded by the resource monitor; isolated for attribution.',
      interviewAnswer: 'I give the pipeline a dedicated least-privilege role with only the CREATE/DML/SELECT it needs on target schemas, authenticate with key-pair, and run it on its own warehouse with a resource monitor and short auto-suspend — never reusing a human or admin role.',
    },
    {
      id: 'rb-temp-access', area: 'rbac-lab', category: 'Access design', difficulty: 'beginner',
      tag: '🔐 Requirement',
      title: 'Temporary elevated access for an incident',
      requirements: 'An on-call engineer needs elevated access during an incident, but it must not become permanent.',
      steps: [
        {
          prompt: 'How do you grant it responsibly?',
          choices: [
            { text: 'Grant a dedicated break-glass role, time-boxed and audited, revoked after', correct: true, why: 'A specific, audited break-glass role that is granted temporarily and revoked keeps elevation controlled.' },
            { text: 'Permanently add them to ACCOUNTADMIN', correct: false, why: 'Permanent over-privilege; the exact anti-pattern.' },
            { text: 'Share the admin password', correct: false, why: 'Unauditable and insecure.' },
          ],
          insight: 'Elevation should be explicit, time-boxed, audited, and reversible.',
        },
      ],
      architecture: 'Break-glass role with the minimum elevated privileges; granted for the incident window; usage audited via ACCESS_HISTORY; revoked afterward.',
      tradeoffs: 'Slight process overhead vs strong control and auditability.',
      failureModes: 'Forgetting to revoke; automate expiry/review.',
      cost: 'Governance only.',
      interviewAnswer: 'I would use a dedicated break-glass role with the minimum elevated privileges, grant it for the incident window only, audit its use, and revoke it afterward — never permanent ACCOUNTADMIN or shared credentials.',
    },
    {
      id: 'rb-audit', area: 'rbac-lab', category: 'Governance', difficulty: 'advanced',
      tag: '🔐 Requirement',
      title: 'Audit who accessed sensitive data',
      requirements: 'Compliance asks who queried PII tables over the last quarter.',
      steps: [
        {
          prompt: 'Where do you get this?',
          choices: [
            { text: 'ACCOUNT_USAGE ACCESS_HISTORY / QUERY_HISTORY views', correct: true, why: 'ACCESS_HISTORY records the objects (and columns) each query touched; QUERY_HISTORY gives the who/when/what.' },
            { text: 'Guess from role grants', correct: false, why: 'Grants show potential access, not actual access.' },
            { text: 'Ask users to self-report', correct: false, why: 'Unreliable for compliance.' },
          ],
          insight: 'Grants = potential access; ACCESS_HISTORY = actual access.',
        },
        {
          prompt: 'How do you make audits sustainable?',
          choices: [
            { text: 'Tag PII objects and build recurring audit queries/alerts on tagged access', correct: true, why: 'Object tagging plus scheduled audit queries make compliance reporting repeatable and targeted.' },
            { text: 'Run ad-hoc queries only when asked', correct: false, why: 'Reactive; misses ongoing monitoring.' },
            { text: 'Disable logging to save space', correct: false, why: 'Defeats auditability.' },
          ],
        },
      ],
      architecture: 'Tag PII objects; recurring audit over ACCESS_HISTORY/QUERY_HISTORY filtered to tagged objects; alerts on unexpected access.',
      tradeoffs: 'Some latency in ACCOUNT_USAGE views; acceptable for audit use.',
      failureModes: 'Untagged PII escaping audits; govern tagging as part of provisioning.',
      cost: 'Minor query cost for recurring audits.',
      interviewAnswer: 'Grants show who could access data; ACCESS_HISTORY shows who actually did. I would tag PII objects and run recurring audit queries over ACCESS_HISTORY and QUERY_HISTORY filtered to those tags, with alerts on unexpected access, so compliance reporting is targeted and repeatable.',
    },
    {
      id: 'rb-inherit-vs-secondary', area: 'rbac-lab', category: 'Hierarchy', difficulty: 'advanced',
      tag: '🔐 Requirement',
      title: 'User needs privileges from two role trees at once',
      requirements: 'A user occasionally needs privileges spanning two separate role hierarchies in one query.',
      steps: [
        {
          prompt: 'How do you enable combined privileges?',
          choices: [
            { text: 'Use secondary roles (USE SECONDARY ROLES ALL) so the session can combine granted roles', correct: true, why: 'Secondary roles let a session use the union of the user\'s granted roles for authorization, spanning trees.' },
            { text: 'Merge the two hierarchies into one giant role', correct: false, why: 'Breaks least privilege and separation of duties.' },
            { text: 'Grant the user everything', correct: false, why: 'Over-privilege.' },
          ],
          insight: 'Primary role owns created objects; secondary roles broaden authorization for the session.',
        },
      ],
      architecture: 'Grant both roles to the user; enable secondary roles so the session authorizes against the union while the primary role governs object creation/ownership.',
      tradeoffs: 'Secondary roles broaden access in-session; keep object ownership tied to the intended primary role.',
      failureModes: 'Unexpected ownership if creating objects under the wrong primary role; set the primary role deliberately.',
      cost: 'Governance only.',
      interviewAnswer: 'I grant both roles to the user and enable secondary roles so the session authorizes against the union of their roles across both trees, while keeping the primary role deliberate so created objects get the right owner. That avoids merging hierarchies or over-granting.',
    },
    {
      id: 'rb-least-priv-review', area: 'rbac-lab', category: 'Governance', difficulty: 'intermediate',
      tag: '🔐 Requirement',
      title: 'Detect and remove over-privilege',
      requirements: 'Over time, roles accumulated privileges no one uses. Design a least-privilege cleanup.',
      steps: [
        {
          prompt: 'How do you find unused privileges?',
          choices: [
            { text: 'Compare granted privileges against actual usage in ACCESS_HISTORY over time', correct: true, why: 'Usage data reveals which grants are never exercised — candidates for removal.' },
            { text: 'Ask each team what they think they use', correct: false, why: 'Perception rarely matches reality.' },
            { text: 'Remove random grants and see who complains', correct: false, why: 'Reckless and disruptive.' },
          ],
        },
        {
          prompt: 'How do you keep it least-privilege going forward?',
          choices: [
            { text: 'Periodic access reviews + provision via standard role templates', correct: true, why: 'Recurring reviews plus templated provisioning prevent drift back to over-privilege.' },
            { text: 'One-time cleanup and never revisit', correct: false, why: 'Privilege creep returns.' },
            { text: 'Grant broadly to avoid tickets', correct: false, why: 'Directly causes over-privilege.' },
          ],
        },
      ],
      architecture: 'Baseline grants vs ACCESS_HISTORY usage → revoke unused → template-based provisioning → scheduled access reviews.',
      tradeoffs: 'Review effort vs a durable least-privilege posture.',
      failureModes: 'Revoking a rarely-but-legitimately used grant; stage changes and monitor.',
      cost: 'Governance/analysis only.',
      interviewAnswer: 'I compare each role\'s granted privileges to what it actually exercises in ACCESS_HISTORY, revoke the unused ones carefully, then prevent drift with standard provisioning templates and periodic access reviews — turning least privilege into an ongoing process, not a one-off.',
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('rbac-lab', S);
})();
