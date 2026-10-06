/* ============================================================
   Cloud DE Visualizer — Learning taxonomy (Recommendation Engine).

   A THIN OVERLAY over the content that already exists. It does NOT
   duplicate any service/interview content — at load it reads the
   registered catalogs (TV.AwsServices, TV.AzureServices,
   TV.DatabricksServices and the *InterviewQA banks) and decorates
   every real, navigable topic with the metadata the engine needs:

     • a stable topic id        (service id, or "iq-<rawId>" for drills)
     • a deep-link route         (#<cloud>/<navId> — the real page)
     • readiness skill buckets   (sql / pyspark / azure / spark / …)
     • importance weights        ({interview, production, architecture})
     • prerequisites             (ids of topics that should come first)
     • difficulty / foundation   (for cold-start ordering + reasons)

   Topic id convention (unique across the whole set):
     - service pages  → the service id           e.g. "delta-lake"
     - interview drill→ "iq-" + the topic id      e.g. "iq-spark-arch"
   Prerequisites reference these same canonical ids.

   Output: TV.Taxonomy = { SKILLS, INTERVIEW_SKILLS, topics(), byId(),
                           forSkill(), roleWeights() }.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  /* ── Readiness skill buckets (the Interview Readiness axes) ── */
  const SKILLS = {
    sql:           'SQL',
    python:        'Python',
    pyspark:       'PySpark',
    spark:         'Spark internals',
    streaming:     'Streaming',
    aws:           'AWS',
    azure:         'Azure',
    databricks:    'Databricks',
    governance:    'Governance & security',
    production:    'Production',
    architecture:  'Architecture',
    troubleshooting:'Troubleshooting',
  };
  // Order shown in the Interview Readiness panel.
  const INTERVIEW_SKILLS = ['sql', 'python', 'pyspark', 'spark', 'streaming',
    'aws', 'azure', 'databricks', 'governance', 'production', 'architecture', 'troubleshooting'];

  /* ── Default importance by service category ───────────────── */
  const CAT_IMPORTANCE = {
    storage:      { interview: 76, production: 72, architecture: 72 },
    'ingest-etl': { interview: 82, production: 82, architecture: 66 },
    streaming:    { interview: 80, production: 74, architecture: 72 },
    analytics:    { interview: 76, production: 66, architecture: 66 },
    databases:    { interview: 60, production: 60, architecture: 55 },
    orchestration:{ interview: 72, production: 80, architecture: 60 },
    compute:      { interview: 74, production: 70, architecture: 56 },
    ml:           { interview: 44, production: 46, architecture: 42 },
    governance:   { interview: 70, production: 82, architecture: 66 },
    ops:          { interview: 62, production: 84, architecture: 56 },
  };
  const IQ_IMPORTANCE_DEFAULT = { interview: 85, production: 60, architecture: 56 };
  const FALLBACK_IMPORTANCE   = { interview: 65, production: 60, architecture: 55 };

  /* ── Base skills from cloud + category ────────────────────── */
  const CLOUD_SKILL = { aws: 'aws', azure: 'azure', databricks: 'databricks', fabric: 'azure' };
  const CAT_SKILLS = {
    streaming: ['streaming'],
    governance: ['governance'],
    ops: ['production', 'troubleshooting'],
    analytics: ['sql'],
    databases: ['sql'],
  };
  // SQL-engine services get the SQL bucket regardless of category.
  const SQL_SERVICES = new Set(['athena', 'redshift', 'redshift-spectrum',
    'azure-sql', 'synapse-analytics', 'synapse-serverless', 'databricks-sql', 'cosmos-db',
    'fabric-warehouse', 'fabric-lakehouse']);

  /* ── Per-topic overrides (high-value topics only) ────────────
     Everything not listed falls back to category/cloud defaults.
     keys are canonical topic ids. */
  const META = {
    /* — Databricks Spark chain (interview drills) — */
    'iq-spark-arch':    { foundation: true, difficulty: 'intro',    skills: ['spark', 'pyspark'], prereqs: [], importance: { interview: 90, production: 70, architecture: 60 } },
    'iq-transformations':{                  difficulty: 'intro',    skills: ['spark', 'pyspark'], prereqs: ['iq-spark-arch'] },
    'iq-partitioning':  {                   difficulty: 'intermediate', skills: ['spark'], prereqs: ['iq-spark-arch'], importance: { interview: 86, production: 78, architecture: 58 } },
    'iq-joins':         {                   difficulty: 'intermediate', skills: ['spark', 'pyspark'], prereqs: ['iq-partitioning'], importance: { interview: 86, production: 76, architecture: 58 } },
    'iq-memory-oom':    {                   difficulty: 'advanced', skills: ['spark', 'troubleshooting'], prereqs: ['iq-partitioning', 'iq-joins'], importance: { interview: 82, production: 80, architecture: 56 } },
    'iq-caching':       {                   difficulty: 'intermediate', skills: ['spark'], prereqs: ['iq-spark-arch'] },
    'iq-optimization':  {                   difficulty: 'advanced', skills: ['spark', 'pyspark'], prereqs: ['iq-partitioning', 'iq-joins', 'iq-caching'], importance: { interview: 88, production: 84, architecture: 60 } },
    'iq-pyspark-coding':{                   difficulty: 'intermediate', skills: ['pyspark', 'python'], prereqs: ['iq-transformations'], importance: { interview: 86, production: 66, architecture: 50 } },
    'iq-file-formats':  {                   difficulty: 'intro',    skills: ['spark'], prereqs: [], foundation: true },
    'iq-delta':         {                   difficulty: 'intermediate', skills: ['databricks'], prereqs: ['delta-lake'] },
    'iq-unity':         {                   difficulty: 'intermediate', skills: ['governance'], prereqs: ['unity-catalog'] },
    'iq-streaming':     {                   difficulty: 'advanced', skills: ['streaming', 'spark'], prereqs: ['iq-spark-arch'] },
    'iq-workflows':     {                   difficulty: 'intermediate', skills: ['production'], prereqs: [] },
    'iq-pricing':       {                   difficulty: 'intermediate', skills: ['production'], prereqs: [] },

    /* — Databricks services — */
    'delta-lake':       { foundation: true, difficulty: 'intro',    skills: ['databricks'], prereqs: ['iq-spark-arch'], importance: { interview: 90, production: 86, architecture: 72 } },
    'unity-catalog':    {                   difficulty: 'intermediate', skills: ['governance'], prereqs: [], importance: { interview: 84, production: 86, architecture: 70 } },
    'auto-loader':      {                   difficulty: 'intermediate', skills: ['streaming'], prereqs: ['delta-lake'], importance: { interview: 78, production: 82, architecture: 64 } },
    'structured-streaming': {               difficulty: 'advanced', skills: ['streaming'], prereqs: ['delta-lake', 'iq-spark-arch'], importance: { interview: 82, production: 78, architecture: 70 } },
    'change-data-feed': {                   difficulty: 'advanced', skills: ['databricks'], prereqs: ['delta-lake'], importance: { interview: 74, production: 80, architecture: 66 } },
    'delta-live-tables':{                   difficulty: 'advanced', prereqs: ['auto-loader', 'delta-lake'] },
    'photon':           {                   difficulty: 'intermediate', skills: ['spark'], prereqs: [] },
    'clusters':         {                   difficulty: 'intro',    skills: ['production'], prereqs: [] },
    'databricks-sql':   {                   difficulty: 'intermediate', skills: ['sql'], prereqs: [] },
    'delta-sharing':    {                   difficulty: 'advanced', skills: ['governance'] },
    'workflows':        {                   difficulty: 'intermediate', skills: ['production'] },

    /* — AWS services — */
    's3':               { foundation: true, difficulty: 'intro',    prereqs: [], importance: { interview: 84, production: 76, architecture: 76 } },
    'glue-catalog':     {                   difficulty: 'intro',    prereqs: ['s3'] },
    'glue-etl':         {                   difficulty: 'intermediate', skills: ['pyspark'], prereqs: ['glue-catalog'] },
    'athena':           {                   difficulty: 'intermediate', skills: ['sql'], prereqs: ['s3', 'glue-catalog'] },
    'redshift':         {                   difficulty: 'intermediate', skills: ['sql'], prereqs: [], importance: { interview: 80, production: 70, architecture: 66 } },
    'redshift-spectrum':{                   difficulty: 'advanced', skills: ['sql'], prereqs: ['redshift', 's3'] },
    'emr':              {                   difficulty: 'intermediate', skills: ['spark'], prereqs: ['s3'] },
    'kinesis':          {                   difficulty: 'intermediate', skills: ['streaming'], prereqs: [] },
    'msk':              {                   difficulty: 'advanced', skills: ['streaming'], prereqs: [] },
    'lake-formation':   {                   difficulty: 'advanced', skills: ['governance'], prereqs: ['glue-catalog'] },
    'step-functions':   {                   difficulty: 'intermediate', skills: ['production'], prereqs: [] },
    'mwaa':             {                   difficulty: 'intermediate', skills: ['production'], prereqs: [] },
    'lambda':           {                   difficulty: 'intro',    prereqs: [] },
    'dms':              {                   difficulty: 'intermediate', prereqs: [] },
    'iam':              {                   difficulty: 'intermediate', skills: ['governance', 'production'], prereqs: [], importance: { interview: 74, production: 86, architecture: 64 } },
    'kms':              {                   difficulty: 'intermediate', skills: ['governance'], prereqs: [], importance: { interview: 70, production: 80, architecture: 58 } },
    'cloudwatch':       {                   difficulty: 'intermediate', skills: ['production', 'troubleshooting'], prereqs: [], importance: { interview: 70, production: 86, architecture: 56 } },
    'cloudtrail':       {                   difficulty: 'intermediate', skills: ['governance', 'production'], prereqs: [], importance: { interview: 66, production: 80, architecture: 56 } },

    /* — Azure services — */
    'adls-gen2':        { foundation: true, difficulty: 'intro',    prereqs: [], importance: { interview: 86, production: 78, architecture: 76 } },
    'blob-storage':     {                   difficulty: 'intro',    prereqs: [] },
    'data-factory':     {                   difficulty: 'intro',    prereqs: [], importance: { interview: 84, production: 80, architecture: 64 } },
    'event-hubs':       {                   difficulty: 'intermediate', skills: ['streaming'], prereqs: [], importance: { interview: 80, production: 74, architecture: 70 } },
    'stream-analytics': {                   difficulty: 'intermediate', skills: ['streaming'], prereqs: ['event-hubs'] },
    'synapse-analytics':{                   difficulty: 'intermediate', skills: ['sql'], prereqs: ['adls-gen2'], importance: { interview: 78, production: 68, architecture: 66 } },
    'synapse-serverless':{                  difficulty: 'intermediate', skills: ['sql'], prereqs: ['adls-gen2'] },
    'azure-sql':        {                   difficulty: 'intro',    skills: ['sql'], prereqs: [] },
    'cosmos-db':        {                   difficulty: 'intermediate', prereqs: [] },
    'purview':          {                   difficulty: 'intermediate', skills: ['governance'], prereqs: [] },
    'entra-id':         {                   difficulty: 'intermediate', skills: ['governance', 'production'], prereqs: [] },
    'key-vault':        {                   difficulty: 'intro',    skills: ['production'], prereqs: [] },
    'azure-monitor':    {                   difficulty: 'intermediate', skills: ['production', 'troubleshooting'], prereqs: [] },

    /* — Azure ADF interview chain — */
    'iq-adf-fundamentals':{ foundation: true, difficulty: 'intro',  prereqs: [] },
    'iq-adf-ir':        {                   difficulty: 'intermediate', prereqs: ['iq-adf-fundamentals'] },
    'iq-adf-pipeline':  {                   difficulty: 'intro',    prereqs: ['iq-adf-fundamentals'] },
    'iq-adf-dataflows': {                   difficulty: 'intermediate', skills: ['pyspark'], prereqs: ['iq-adf-pipeline'] },
    'iq-adf-controlflow':{                  difficulty: 'intermediate', prereqs: ['iq-adf-pipeline'] },
    'iq-adf-params':    {                   difficulty: 'intermediate', prereqs: ['iq-adf-pipeline'] },
    'iq-adf-incremental':{                  difficulty: 'advanced', skills: ['production'], prereqs: ['iq-adf-pipeline'], importance: { interview: 84, production: 82, architecture: 60 } },
    'iq-adf-security':  {                   difficulty: 'intermediate', skills: ['governance', 'production'], prereqs: ['iq-adf-fundamentals'] },
    'iq-adf-cicd':      {                   difficulty: 'advanced', skills: ['production'], prereqs: ['iq-adf-pipeline'] },
    'iq-adf-monitoring':{                   difficulty: 'intermediate', skills: ['production', 'troubleshooting'], prereqs: ['iq-adf-pipeline'] },
    'iq-adf-performance':{                  difficulty: 'advanced', skills: ['production'], prereqs: ['iq-adf-dataflows'], importance: { interview: 82, production: 80, architecture: 56 } },
    'iq-adf-functions': {                   difficulty: 'intermediate', prereqs: ['iq-adf-pipeline'] },
    'iq-adf-scenarios': {                   difficulty: 'advanced', skills: ['architecture'], prereqs: ['iq-adf-incremental'], importance: { interview: 80, production: 66, architecture: 82 } },

    /* — Generic cross-cloud interview topics — */
    'iq-scenario':      { difficulty: 'advanced', skills: ['architecture'], importance: { interview: 82, production: 66, architecture: 82 } },
    'iq-cicd':          { difficulty: 'advanced', skills: ['production'] },
    'iq-cicd-migration':{ difficulty: 'advanced', skills: ['production', 'architecture'] },
    'iq-security':      { difficulty: 'intermediate', skills: ['governance', 'production'] },
    'iq-monitoring':    { difficulty: 'intermediate', skills: ['production', 'troubleshooting'] },
    'iq-orchestration': { difficulty: 'intermediate', skills: ['production'] },
    'iq-storage':       { difficulty: 'intro', foundation: true },
    'iq-synapse':       { difficulty: 'intermediate', skills: ['sql'] },
    'iq-streaming-aws': { difficulty: 'intermediate', skills: ['streaming'] },

    /* — Microsoft Fabric (DP-700) — */
    'onelake':             { foundation: true, difficulty: 'intro', prereqs: [], importance: { interview: 84, production: 76, architecture: 76 } },
    'fabric-lakehouse':    { difficulty: 'intermediate', skills: ['sql', 'pyspark'], prereqs: ['onelake'], importance: { interview: 84, production: 78, architecture: 70 } },
    'fabric-warehouse':    { difficulty: 'intermediate', skills: ['sql'], prereqs: ['onelake'] },
    'dataflow-gen2':       { difficulty: 'intro', prereqs: [] },
    'fabric-data-pipelines': { difficulty: 'intro', skills: ['production'], prereqs: [], importance: { interview: 82, production: 80, architecture: 64 } },
    'fabric-spark':        { difficulty: 'intermediate', skills: ['pyspark', 'spark'], prereqs: ['onelake'] },
    'eventstream':         { difficulty: 'intermediate', skills: ['streaming'], prereqs: [] },
    'eventhouse':          { difficulty: 'advanced', skills: ['streaming', 'sql'], prereqs: ['eventstream'] },
    'fabric-mirroring':    { difficulty: 'intermediate', skills: ['production'], prereqs: ['onelake'], importance: { interview: 74, production: 78, architecture: 62 } },
    'fabric-copy-job':     { difficulty: 'intro', skills: ['production'], prereqs: [], importance: { interview: 68, production: 80, architecture: 56 } },
    'fabric-sql-db':       { difficulty: 'intermediate', skills: ['sql', 'production'], prereqs: ['onelake'], importance: { interview: 70, production: 78, architecture: 64 } },
    'fabric-mlv':          { difficulty: 'intermediate', skills: ['sql'], prereqs: ['fabric-lakehouse'], importance: { interview: 72, production: 78, architecture: 66 } },
    'fabric-monitoring-hub': { difficulty: 'intro', skills: ['production', 'troubleshooting'], prereqs: [], importance: { interview: 66, production: 82, architecture: 54 } },
    'fabric-deployment-pipelines': { difficulty: 'intermediate', skills: ['production'], prereqs: [], importance: { interview: 70, production: 80, architecture: 62 } },
  };

  /* ── Build the flat topic list from registered catalogs ────── */
  function _skillsFor(cloud, category, id, meta) {
    const set = new Set();
    if (CLOUD_SKILL[cloud]) set.add(CLOUD_SKILL[cloud]);
    (CAT_SKILLS[category] || []).forEach(s => set.add(s));
    if (SQL_SERVICES.has(id)) set.add('sql');
    (meta.skills || []).forEach(s => set.add(s));
    return [...set];
  }

  function _mkService(svc, cloud) {
    const meta = META[svc.id] || {};
    const base = CAT_IMPORTANCE[svc.category] || FALLBACK_IMPORTANCE;
    return {
      id: svc.id,
      navId: svc.id,
      label: svc.name || svc.id,
      cloud: cloud,
      kind: 'service',
      category: svc.category || 'other',
      route: '#' + cloud + '/' + svc.id,
      skills: _skillsFor(cloud, svc.category, svc.id, meta),
      importance: meta.importance || base,
      prereqs: meta.prereqs || [],
      difficulty: meta.difficulty || 'intermediate',
      foundation: !!meta.foundation,
    };
  }

  function _mkInterview(topic, cloud) {
    const tid = 'iq-' + topic.id;
    // A few iq ids collide across clouds (e.g. "streaming" in aws+databricks);
    // disambiguate the AWS streaming drill's META lookup only.
    const metaKey = (cloud === 'aws' && topic.id === 'streaming') ? 'iq-streaming-aws' : tid;
    const meta = META[metaKey] || META[tid] || {};
    return {
      id: tid,
      navId: tid,
      label: topic.label || topic.id,
      cloud: cloud,
      kind: 'interview',
      category: 'interview',
      route: '#' + cloud + '/' + tid,
      skills: _skillsFor(cloud, 'interview', topic.id, meta),
      importance: meta.importance || IQ_IMPORTANCE_DEFAULT,
      prereqs: meta.prereqs || [],
      difficulty: meta.difficulty || 'intermediate',
      foundation: !!meta.foundation,
      questionCount: (topic.questions && topic.questions.length) || 0,
    };
  }

  let _topics = null, _index = null;

  function _build() {
    if (_topics) return;
    _topics = [];
    const push = (arr) => { if (arr) _topics.push(...arr); };

    const svc = (list, cloud) => (list || []).map(s => _mkService(s, cloud));
    push(svc(TV.AwsServices, 'aws'));
    push(svc(TV.AzureServices, 'azure'));
    push(svc(TV.DatabricksServices, 'databricks'));
    push(svc(TV.FabricServices, 'fabric'));

    const iq = (list, cloud) => (list || [])
      .filter(t => t && t.questions && t.questions.length) // only live drills
      .map(t => _mkInterview(t, cloud));
    push(iq(TV.AwsInterviewQA, 'aws'));
    push(iq(TV.AzureInterviewQA, 'azure'));
    push(iq(TV.DatabricksInterviewQA, 'databricks'));

    _index = {};
    _topics.forEach(t => { _index[t.id] = t; });
  }

  /* ── Role weight profiles (reweight the priority formula) ────
     Multipliers applied to importance axes + a few engine knobs.
     Data Engineer is the balanced baseline. */
  const ROLE_WEIGHTS = {
    'data-engineer':        { label: 'Data Engineer',        interview: 1.0, production: 1.0, architecture: 0.9, troubleshooting: 0.9 },
    'senior-data-engineer': { label: 'Senior Data Engineer', interview: 0.9, production: 1.25, architecture: 1.3, troubleshooting: 1.2 },
    'cloud-data-engineer':  { label: 'Cloud Data Engineer',  interview: 1.0, production: 1.1, architecture: 1.15, troubleshooting: 1.0 },
    'databricks-data-engineer': { label: 'Databricks Data Engineer', interview: 1.05, production: 1.05, architecture: 1.0, troubleshooting: 1.0, boostSkills: ['spark', 'pyspark', 'databricks', 'streaming'] },
    'aws-data-engineer':    { label: 'AWS Data Engineer',    interview: 1.0, production: 1.05, architecture: 1.0, troubleshooting: 1.0, boostSkills: ['aws'] },
    'azure-data-engineer':  { label: 'Azure Data Engineer',  interview: 1.0, production: 1.05, architecture: 1.0, troubleshooting: 1.0, boostSkills: ['azure'] },
    'analytics-engineer':   { label: 'Analytics Engineer',   interview: 1.0, production: 0.85, architecture: 0.85, troubleshooting: 0.8, boostSkills: ['sql'] },
    'data-platform-engineer': { label: 'Data Platform Engineer', interview: 0.9, production: 1.3, architecture: 1.2, troubleshooting: 1.15, boostSkills: ['governance', 'production'] },
  };

  /* ── Public API ──────────────────────────────────────────── */
  TV.Taxonomy = {
    SKILLS,
    INTERVIEW_SKILLS,
    ROLE_WEIGHTS,
    topics() { _build(); return _topics; },
    byId(id) { _build(); return _index[id] || null; },
    forSkill(skill) { _build(); return _topics.filter(t => t.skills.indexOf(skill) !== -1); },
    roleWeights(role) { return ROLE_WEIGHTS[role] || ROLE_WEIGHTS['data-engineer']; },
    roles() { return Object.keys(ROLE_WEIGHTS).map(id => ({ id, label: ROLE_WEIGHTS[id].label })); },
  };
})();
