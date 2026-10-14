/* ============================================================
   Redshift — Security & Governance (authentic, AWS-doc aligned)
   iam-rbac · kms-encryption · lake-formation
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    iamRbac: {
      eyebrow: 'Security', title: 'IAM & Role-Based Access Control',
      subtitle: 'IAM governs who can manage AWS resources and how Redshift reaches S3; database RBAC governs what users can do with data inside Redshift. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-iam-authentication-access-control.html',
      stage: { caption: 'Two layers of access control',
        groups: [
          { id: 'iam', label: 'AWS IAM', sub: 'resource & service access', nodes: [
            { id: 'role', label: 'IAM role', sub: 'cluster → S3/Glue' }, { id: 'perms', label: 'AWS permissions' } ], connectorAfter: 'authenticates to AWS' },
          { id: 'db', label: 'Database RBAC', sub: 'in-database privileges', nodes: [
            { id: 'roles', label: 'Database roles' }, { id: 'users', label: 'Users & groups' }, { id: 'grant', label: 'GRANT privileges' } ] },
        ] },
      steps: [
        { label: 'IAM', title: 'IAM controls AWS-level access', on: { spot: ['iam'], flow: ['role', 'perms'] },
          body: 'IAM decides who can create/modify clusters and what AWS services the cluster can reach. An <strong>IAM role attached to the cluster</strong> authorizes COPY/UNLOAD/Spectrum to use S3 and Glue.',
          facts: ['IAM role authorizes S3/Glue access (no embedded keys)', 'IAM also governs admin actions on the cluster', 'IAM identity can federate DB login too'] },
        { label: 'DB roles', title: 'Database RBAC inside Redshift', on: { spot: ['db'], flow: ['roles', 'users'] },
          body: 'Inside the database, <strong>RBAC</strong> groups privileges into <strong>database roles</strong> you grant to users — simpler than per-user grants.',
          facts: ['Roles bundle privileges; grant roles to users', 'Supports role hierarchies', 'System-defined roles exist for common admin tasks'] },
        { label: 'Grant', title: 'Grant least privilege', on: { spot: ['db'], flow: ['grant'] },
          body: 'Use <code>GRANT</code>/<code>REVOKE</code> at schema, table, column, and even row level (RLS) to give each role only what it needs.',
          facts: ['Column-level and row-level security supported', 'Least privilege via granular GRANTs', 'Separate IAM (AWS) from RBAC (data) concerns'] },
      ],
      code: { title: 'Database roles & grants', lang: 'sql', src:
`CREATE ROLE analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO ROLE analyst;
GRANT ROLE analyst TO "alice@netflix.example";

-- Column + row level:
GRANT SELECT (user_id, country, minutes) ON watch_events TO ROLE analyst;` },
      takeaways: [
        'IAM = AWS-level access (admin + cluster→S3/Glue via an attached role)',
        'Database RBAC = in-database privileges via roles granted to users',
        'Enforce least privilege with schema/table/column/row-level GRANTs',
      ],
    },

    kmsEncryption: {
      eyebrow: 'Security', title: 'Encryption & KMS',
      subtitle: 'Redshift encrypts data at rest with AWS KMS (or HSM) and in transit with SSL. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-db-encryption.html',
      stage: { caption: 'Protect data at rest and in transit',
        groups: [
          { id: 'rest', label: 'At rest', sub: 'AWS KMS / HSM', nodes: [{ id: 'kms', label: 'KMS key' }, { id: 'blocks', label: 'Encrypted blocks + RMS' }, { id: 'backups', label: 'Encrypted snapshots' }] },
          { id: 'transit', label: 'In transit', sub: 'SSL/TLS', nodes: [{ id: 'ssl', label: 'SSL client connections' }] },
        ] },
      steps: [
        { label: 'At rest', title: 'KMS encrypts stored data', on: { spot: ['rest'], flow: ['kms', 'blocks'] },
          body: 'With encryption enabled, Redshift uses a <strong>KMS</strong>-managed key hierarchy to encrypt data blocks, managed storage, and metadata.',
          facts: ['AWS KMS manages keys (or CloudHSM)', 'Covers data blocks and Redshift Managed Storage', 'Envelope-encryption key hierarchy'] },
        { label: 'Snapshots', title: 'Snapshots inherit encryption', on: { spot: ['rest'], flow: ['backups'] },
          body: 'Automated and manual <strong>snapshots</strong> of an encrypted cluster are encrypted too, including when copied cross-region.',
          facts: ['Snapshots encrypted with the cluster key', 'Cross-region snapshot copy stays encrypted'] },
        { label: 'In transit', title: 'SSL protects connections', on: { spot: ['transit'], flow: ['ssl'] },
          body: 'Client connections use <strong>SSL/TLS</strong>; you can require SSL so no plaintext connections are allowed.',
          facts: ['SSL/TLS for client connections', 'Can require SSL via parameter group', 'VPC + security groups add network isolation'] },
      ],
      takeaways: [
        'At rest: KMS-managed key hierarchy encrypts blocks, RMS, and metadata',
        'Snapshots inherit encryption, including cross-region copies',
        'In transit: SSL/TLS client connections (can be required)',
      ],
    },

    lakeFormation: {
      eyebrow: 'Security', title: 'Lake Formation Integration',
      subtitle: 'AWS Lake Formation centralizes fine-grained permissions for data-lake tables that Redshift Spectrum queries. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/spectrum-lake-formation.html',
      stage: { caption: 'Central governance for the lake',
        groups: [
          { id: 'lf', label: 'AWS Lake Formation', sub: 'central permissions', nodes: [{ id: 'db', label: 'DB / table grants' }, { id: 'col', label: 'Column-level' }, { id: 'row', label: 'Row-level filters' }], connectorAfter: 'enforced on query' },
          { id: 'spectrum', label: 'Redshift Spectrum', nodes: [{ id: 'q', label: 'External table query' }] },
          { id: 's3', label: 'S3 lake (Glue catalog)', nodes: [{ id: 'data', label: 'Lake data' }] },
        ] },
      steps: [
        { label: 'Central', title: 'Permissions defined once', on: { spot: ['lf'], flow: ['db', 'col', 'row'] },
          body: 'Lake Formation lets you grant <strong>fine-grained</strong> permissions (database, table, column, and row-level) on Glue-cataloged lake data in one place.',
          facts: ['Database/table/column/row-level grants', 'Managed centrally in Lake Formation', 'Consistent across analytics services'] },
        { label: 'Enforce', title: 'Enforced when Spectrum queries', on: { spot: ['spectrum'], conn: ['lf'], flow: ['q'] },
          body: 'When Redshift Spectrum queries external tables, Lake Formation <strong>enforces</strong> those permissions — users only see rows/columns they\'re allowed to.',
          facts: ['Spectrum honors Lake Formation grants', 'Column masking & row filters applied at query time'] },
        { label: 'One policy', title: 'One policy, many engines', on: { spot: ['lf', 's3'], flow: ['data'] },
          body: 'The same Lake Formation policy governs Athena, EMR, and Redshift Spectrum — define access once, enforce everywhere.',
          facts: ['Shared governance across AWS analytics', 'Reduces policy drift and duplication'] },
      ],
      takeaways: [
        'Lake Formation centralizes fine-grained (db/table/column/row) lake permissions',
        'Redshift Spectrum enforces those grants at query time',
        'One policy governs Spectrum, Athena, and EMR consistently',
      ],
    },
  };

  Kit.registerAll('redshift', SPECS);
})();
