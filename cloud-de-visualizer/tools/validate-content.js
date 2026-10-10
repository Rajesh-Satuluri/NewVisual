#!/usr/bin/env node
/* ============================================================
   Cloud DE Visualizer — content validator  (Phase 0 / F0.1)

   A zero-dependency, offline structural gate over every content
   bank. It loads the browser data modules under a minimal window
   shim, then asserts:

     1. Stable-ID integrity  — unique ids where ids must be unique.
     2. Referential integrity — cert questions / labs point at real
        certifications + domains; objectives + path steps point at
        real taxonomy topics; quiz/question answer indices are valid.
     3. Required fields       — every content shape has its mandatory
        keys (incl. schemaVersion + lastReviewed once F0.2 lands).
     4. Link hygiene          — every officialRef/reference url is a
        well-formed https URL.
     5. Duplicate detection   — near-duplicate question/answer stems
        within a bank (normalised + token-Jaccard).

   It does NOT verify vendor facts (pricing, quotas, exam formats) —
   that stays a manual, cited process. This checks STRUCTURE + LINKS.

   Usage:
     node tools/validate-content.js            # validate, exit 1 on error
     node tools/validate-content.js --selftest # inject a broken record,
                                               # prove the checks fire
     node tools/validate-content.js --warn-only# never exit non-zero
     node tools/validate-content.js --json      # machine-readable report

   Exit code: 0 = clean (warnings allowed), 1 = one or more errors.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'js', 'data');

const args = process.argv.slice(2);
const OPT = {
  selftest: args.includes('--selftest'),
  warnOnly: args.includes('--warn-only'),
  json: args.includes('--json'),
  // schemaVersion/lastReviewed become hard errors once F0.2 backfills
  // them. Until the first run after backfill they'd be noise, so the
  // flag flips them error<->warn without code churn.
  strictMeta: !args.includes('--no-strict-meta'),
};

/* ── Load order: taxonomy + certifications first (others reference
   them), then everything else. Files are plain IIFEs attaching to
   window.TableViz, so a shared sandbox collects the whole namespace. */
const LOAD_ORDER = [
  '_meta.js',
  'taxonomy.js',
  'certifications.js',
  'intuition.js',
  'equivalences.js',
  'quiz-bank.js',
  'cert-questions.js',
  'cert-labs.js',
  'cert-traps.js',
  'cert-compare.js',
  'learning-paths.js',
  'aws-services.js',
  'azure-services.js',
  'databricks-services.js',
  'fabric-services.js',
  'aws-interview-qa.js',
  'azure-interview-qa.js',
  'databricks-interview-qa.js',
  'fabric-interview-qa.js',
  'incidents.js',
  'incidents-databricks.js',
  'incidents-aws.js',
  'incidents-azure.js',
  'incidents-fabric.js',
  'design-challenges.js',
];

/* ── Findings ─────────────────────────────────────────────── */
const errors = [];
const warnings = [];
function err(file, msg) { errors.push({ file, msg }); }
function warn(file, msg) { warnings.push({ file, msg }); }

/* ── Load the namespace under a browser-ish shim ──────────── */
function loadNamespace(mutate) {
  const noop = () => {};
  const elProxy = new Proxy({}, {
    get() { return noop; },
    set() { return true; },
  });
  const documentShim = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => elProxy,
    addEventListener: noop,
    head: elProxy, body: elProxy, documentElement: elProxy,
  };
  const windowShim = {};
  windowShim.window = windowShim;
  windowShim.document = documentShim;
  windowShim.addEventListener = noop;
  windowShim.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  windowShim.console = console;

  const sandbox = vm.createContext(windowShim);

  for (const fname of LOAD_ORDER) {
    const fpath = path.join(DATA, fname);
    if (!fs.existsSync(fpath)) { err(fname, 'data file missing'); continue; }
    let src = fs.readFileSync(fpath, 'utf8');
    if (mutate) src = mutate(fname, src) || src;
    try {
      vm.runInContext(src, sandbox, { filename: fname });
    } catch (e) {
      err(fname, 'failed to load: ' + e.message);
    }
  }
  return windowShim.TableViz || {};
}

/* ── Helpers ──────────────────────────────────────────────── */
function isHttpsUrl(u) {
  if (typeof u !== 'string' || !u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' && !!parsed.hostname && parsed.hostname.includes('.');
  } catch (_) { return false; }
}

function checkRef(file, ref, where) {
  if (!ref || typeof ref !== 'object') { err(file, `${where}: missing officialRef/reference object`); return; }
  if (!ref.label || typeof ref.label !== 'string') err(file, `${where}: ref.label missing`);
  if (!isHttpsUrl(ref.url)) err(file, `${where}: ref.url not a well-formed https URL (${JSON.stringify(ref.url)})`);
}

/* Content meta is held centrally (TV.ContentMeta, js/data/_meta.js) at
   bank granularity, not stamped on every record. We assert each bank
   has a registry entry with a valid lastReviewed; records MAY carry an
   override lastReviewed, which must be well-formed if present. */
let META = null;
function checkBankMeta(file, bankId) {
  if (!META) { err('_meta.js', 'TV.ContentMeta not defined'); return; }
  if (!META.has(bankId)) {
    (OPT.strictMeta ? err : warn)('_meta.js', `bank "${bankId}" has no ContentMeta entry (schemaVersion/lastReviewed/source)`);
    return;
  }
  const m = META.banks[bankId];
  if (!m.lastReviewed || !/^\d{4}-\d{2}-\d{2}$/.test(String(m.lastReviewed))) {
    err('_meta.js', `bank "${bankId}": lastReviewed missing/!YYYY-MM-DD (${m.lastReviewed})`);
  }
  if (!m.source) err('_meta.js', `bank "${bankId}": source missing`);
}
function checkRecordMetaOverride(file, obj, where) {
  if (obj && obj.lastReviewed != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(obj.lastReviewed))) {
    err(file, `${where}: lastReviewed override not YYYY-MM-DD (${obj.lastReviewed})`);
  }
}

/* normalise a question stem for duplicate detection */
function normStem(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[`'"“”‘’]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(s) { return new Set(normStem(s).split(' ').filter(Boolean)); }
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
const DUP_THRESHOLD = 0.82; // high-token-overlap stems in the same bank

function checkDupes(file, bankLabel, items, getText) {
  const seenExact = new Map();
  const toks = items.map(it => ({ it, text: getText(it), tk: tokens(getText(it)) }));
  for (let i = 0; i < toks.length; i++) {
    const n = normStem(toks[i].text);
    if (!n) continue;
    if (seenExact.has(n)) {
      err(file, `${bankLabel}: exact-duplicate stem — "${toks[i].text.slice(0, 70)}…"`);
    } else seenExact.set(n, i);
    for (let j = i + 1; j < toks.length; j++) {
      const sim = jaccard(toks[i].tk, toks[j].tk);
      if (sim >= DUP_THRESHOLD && normStem(toks[j].text) !== n) {
        warn(file, `${bankLabel}: near-duplicate (${sim.toFixed(2)}) — "${toks[i].text.slice(0, 55)}…" ≈ "${toks[j].text.slice(0, 55)}…"`);
      }
    }
  }
}

/* ── The checks ───────────────────────────────────────────── */
function validate(TV) {
  /* ---- content-meta registry (bank-level provenance) ---- */
  META = TV.ContentMeta || null;
  if (!META) err('_meta.js', 'TV.ContentMeta not defined — content provenance cannot be verified');
  else {
    for (const bankId of [
      'certifications', 'cert-questions', 'cert-labs', 'cert-traps', 'cert-compare',
      'quiz-bank', 'learning-paths', 'taxonomy', 'intuition', 'equivalences',
      'aws-services', 'azure-services', 'databricks-services', 'fabric-services',
      'aws-interview-qa', 'azure-interview-qa', 'databricks-interview-qa', 'fabric-interview-qa',
      'incidents', 'design-challenges',
    ]) checkBankMeta('_meta.js', bankId);
  }

  /* ---- taxonomy index (for referential checks) ---- */
  let topicIds = new Set();
  try {
    const topics = (TV.Taxonomy && TV.Taxonomy.topics()) || [];
    topicIds = new Set(topics.map(t => t.id));
  } catch (e) { err('taxonomy.js', 'topics() threw: ' + e.message); }
  if (topicIds.size === 0) warn('taxonomy.js', 'no taxonomy topics resolved — referential topic checks skipped');

  /* ---- certifications: build domain maps ---- */
  const certDomains = {};            // certId -> Set(domainId)
  const certObjectives = {};         // certId -> Set(objectiveId)
  const knownCerts = new Set();
  const Certs = TV.Certifications;
  if (!Certs) { err('certifications.js', 'TV.Certifications not defined'); }
  else {
    const all = (Certs.tracks || []).concat(Certs.retired || []);
    for (const c of all) {
      const id = c.certificationId;
      if (!id) { err('certifications.js', 'a certification has no certificationId'); continue; }
      knownCerts.add(id);
      certDomains[id] = new Set();
      certObjectives[id] = new Set();
      for (const d of (c.domains || [])) {
        if (!d.id) err('certifications.js', `${id}: a domain has no id`);
        certDomains[id].add(d.id);
        for (const o of (d.objectives || [])) {
          if (!o.id) err('certifications.js', `${id}/${d.id}: an objective has no id`);
          certObjectives[id].add(o.id);
          for (const tid of (o.topicIds || [])) {
            if (topicIds.size && !topicIds.has(tid)) {
              warn('certifications.js', `${id}/${o.id}: topicId "${tid}" not in taxonomy`);
            }
          }
        }
      }
      // required cert fields + official links
      for (const f of ['vendor', 'name', 'status', 'officialExamUrl']) {
        if (!c[f]) err('certifications.js', `${id}: missing "${f}"`);
      }
      if (c.officialExamUrl && !isHttpsUrl(c.officialExamUrl)) err('certifications.js', `${id}: officialExamUrl malformed`);
      if (c.officialGuideUrl && !isHttpsUrl(c.officialGuideUrl)) err('certifications.js', `${id}: officialGuideUrl malformed`);
      checkRecordMetaOverride('certifications.js', c, id);
    }
  }

  /* ---- cert practice questions ---- */
  const qIds = new Set();
  const CQ = TV.CertQuestions;
  if (!CQ) err('cert-questions.js', 'TV.CertQuestions not defined');
  else {
    // enumerate EVERY bank key (certIds()), so orphan banks are caught too
    const bankKeys = CQ.certIds ? CQ.certIds() : [...knownCerts];
    const banks = {};
    for (const certId of bankKeys) {
      const list = CQ.byCert ? CQ.byCert(certId) : [];
      if (list && list.length) banks[certId] = list;
    }
    for (const [certId, list] of Object.entries(banks)) {
      if (!knownCerts.has(certId)) err('cert-questions.js', `bank "${certId}" has no matching certification`);
      const domSet = certDomains[certId] || new Set();
      for (const q of list) {
        const where = `${certId}/${q.id || '??'}`;
        if (!q.id) err('cert-questions.js', `${certId}: question with no id`);
        else if (qIds.has(q.id)) err('cert-questions.js', `duplicate question id "${q.id}"`);
        else qIds.add(q.id);

        for (const f of ['domainId', 'q', 'explanation', 'whyWrong']) {
          if (!q[f]) err('cert-questions.js', `${where}: missing "${f}"`);
        }
        if (q.domainId && domSet.size && !domSet.has(q.domainId)) {
          err('cert-questions.js', `${where}: domainId "${q.domainId}" not a domain of ${certId}`);
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          err('cert-questions.js', `${where}: options must be an array of ≥2`);
        } else {
          const multi = Array.isArray(q.answer);
          const idxs = multi ? q.answer : [q.answer];
          for (const a of idxs) {
            if (!Number.isInteger(a) || a < 0 || a >= q.options.length) {
              err('cert-questions.js', `${where}: answer index ${a} out of range (0..${q.options.length - 1})`);
            }
          }
          if (!multi && (typeof q.answer !== 'number')) err('cert-questions.js', `${where}: answer must be a number (or array for multi)`);
        }
        if (q.level != null && (!Number.isInteger(q.level) || q.level < 1 || q.level > 7)) {
          err('cert-questions.js', `${where}: level ${q.level} outside 1..7`);
        }
        checkRef('cert-questions.js', q.officialRef, where);
        checkRecordMetaOverride('cert-questions.js', q, where);
      }
      checkDupes('cert-questions.js', `bank ${certId}`, list, q => q.q);
    }
  }

  /* ---- quiz bank ---- */
  const QB = TV.QuizBank;
  if (!QB) warn('quiz-bank.js', 'TV.QuizBank not defined');
  else {
    for (const [topic, list] of Object.entries(QB)) {
      if (!Array.isArray(list)) { err('quiz-bank.js', `bank "${topic}" is not an array`); continue; }
      for (let i = 0; i < list.length; i++) {
        const q = list[i];
        const where = `${topic}[${i}]`;
        if (!q.q) err('quiz-bank.js', `${where}: missing q`);
        if (!q.why) err('quiz-bank.js', `${where}: missing why`);
        if (!Array.isArray(q.options) || q.options.length < 2) err('quiz-bank.js', `${where}: options must be ≥2`);
        else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
          err('quiz-bank.js', `${where}: answer index out of range`);
        }
        if (q.topic && topicIds.size && !topicIds.has(q.topic)) warn('quiz-bank.js', `${where}: topic "${q.topic}" not in taxonomy`);
      }
      checkDupes('quiz-bank.js', `topic ${topic}`, list.filter(x => x && x.q), q => q.q);
    }
  }

  /* ---- labs ---- */
  const labIds = new Set();
  const Labs = TV.CertLabs;
  if (!Labs) warn('cert-labs.js', 'TV.CertLabs not defined');
  else {
    for (const lab of (Labs.list || [])) {
      const where = lab.id || '??';
      if (!lab.id) err('cert-labs.js', 'lab with no id');
      else if (labIds.has(lab.id)) err('cert-labs.js', `duplicate lab id "${lab.id}"`);
      else labIds.add(lab.id);
      for (const f of ['title', 'objective', 'steps', 'verify']) {
        if (!lab[f] || (Array.isArray(lab[f]) && !lab[f].length)) err('cert-labs.js', `${where}: missing/empty "${f}"`);
      }
      for (const cid of (lab.certIds || [])) {
        if (!knownCerts.has(cid)) err('cert-labs.js', `${where}: certId "${cid}" unknown`);
        if (lab.domainId && certDomains[cid] && certDomains[cid].size && !certDomains[cid].has(lab.domainId)) {
          warn('cert-labs.js', `${where}: domainId "${lab.domainId}" not in ${cid}`);
        }
      }
      if (lab.officialRef) checkRef('cert-labs.js', lab.officialRef, where);
      checkRecordMetaOverride('cert-labs.js', lab, where);
    }
  }

  /* ---- learning paths ---- */
  const pathIds = new Set();
  for (const p of (TV.LearningPaths || [])) {
    const where = p.id || '??';
    if (!p.id) err('learning-paths.js', 'path with no id');
    else if (pathIds.has(p.id)) err('learning-paths.js', `duplicate path id "${p.id}"`);
    else pathIds.add(p.id);
    for (const f of ['title', 'goal', 'steps']) if (!p[f]) err('learning-paths.js', `${where}: missing "${f}"`);
    for (const s of (p.steps || [])) {
      if (topicIds.size && !topicIds.has(s)) warn('learning-paths.js', `${where}: step "${s}" not in taxonomy`);
    }
  }

  /* ---- services (per-format id uniqueness + required doc spine) ---- */
  const SERVICE_BANKS = {
    'aws-services.js': TV.AwsServices,
    'azure-services.js': TV.AzureServices,
    'databricks-services.js': TV.DatabricksServices,
    'fabric-services.js': TV.FabricServices,
  };
  for (const [file, bank] of Object.entries(SERVICE_BANKS)) {
    if (!Array.isArray(bank)) { err(file, 'service bank not an array / not defined'); continue; }
    const ids = new Set();
    for (const s of bank) {
      const where = s.id || '??';
      if (!s.id) err(file, 'service with no id');
      else if (ids.has(s.id)) err(file, `duplicate service id "${s.id}" within format`);
      else ids.add(s.id);
      for (const f of ['name', 'what', 'why', 'how']) if (!s[f]) err(file, `${where}: missing section "${f}"`);
      // interview questions embedded in a service, if present
      if (Array.isArray(s.interview)) {
        for (const iq of s.interview) if (!iq.q || !iq.a) err(file, `${where}: interview item missing q/a`);
      }
      checkRecordMetaOverride(file, s, where);
    }
  }

  /* ---- incidents ---- */
  const INC = TV.Incidents;
  if (!INC) warn('incidents.js', 'TV.Incidents not defined');
  else {
    const incIds = new Set();
    const clouds = new Set(INC.CLOUDS || []);
    for (const inc of INC.list()) {
      const where = inc.id || '??';
      if (!inc.id) err('incidents.js', 'incident with no id');
      else if (incIds.has(inc.id)) err('incidents.js', `duplicate incident id "${inc.id}"`);
      else incIds.add(inc.id);
      if (!clouds.has(inc.cloud)) err('incidents.js', `${where}: cloud "${inc.cloud}" not in ${[...clouds].join('/')}`);
      for (const f of ['title', 'context', 'expected']) if (!inc[f]) err('incidents.js', `${where}: missing "${f}"`);
      if (!Array.isArray(inc.symptoms) || !inc.symptoms.length) err('incidents.js', `${where}: needs symptoms[]`);
      if (!Array.isArray(inc.investigations) || inc.investigations.length < 2) err('incidents.js', `${where}: needs ≥2 investigations`);
      else {
        const invIds = new Set();
        let keyCount = 0;
        inc.investigations.forEach(iv => {
          if (!iv.id || !iv.label) err('incidents.js', `${where}: investigation missing id/label`);
          if (invIds.has(iv.id)) err('incidents.js', `${where}: duplicate investigation id "${iv.id}"`);
          invIds.add(iv.id);
          if (iv.key) keyCount++;
          if (!(inc.evidence || {})[iv.id]) err('incidents.js', `${where}: no evidence for investigation "${iv.id}"`);
        });
        if (!keyCount) err('incidents.js', `${where}: at least one investigation must be key:true`);
      }
      ['rootCauses', 'remediations'].forEach(fld => {
        const arr = inc[fld];
        if (!Array.isArray(arr) || arr.length < 2) { err('incidents.js', `${where}: ${fld} needs ≥2 options`); return; }
        const correct = arr.filter(x => x.correct).length;
        if (correct !== 1) err('incidents.js', `${where}: ${fld} must have exactly one correct (has ${correct})`);
        arr.forEach(x => { if (!x.text) err('incidents.js', `${where}: ${fld} option missing text`); });
      });
      for (const f of ['validation', 'prevention', 'followUps']) {
        if (inc[f] != null && !Array.isArray(inc[f])) err('incidents.js', `${where}: ${f} must be an array`);
      }
      if (inc.officialRef) checkRef('incidents.js', inc.officialRef, where);
      checkRecordMetaOverride('incidents.js', inc, where);
    }
  }

  /* ---- design challenges ---- */
  const DC = TV.DesignChallenges;
  if (!DC) warn('design-challenges.js', 'TV.DesignChallenges not defined');
  else {
    const dcIds = new Set();
    for (const ch of DC.all()) {
      const where = ch.id || '??';
      if (!ch.id) err('design-challenges.js', 'challenge with no id');
      else if (dcIds.has(ch.id)) err('design-challenges.js', `duplicate challenge id "${ch.id}"`);
      else dcIds.add(ch.id);
      for (const f of ['title', 'scenario', 'difficulty']) if (!ch[f]) err('design-challenges.js', `${where}: missing "${f}"`);
      if (!Array.isArray(ch.requirements) || !ch.requirements.length) err('design-challenges.js', `${where}: needs requirements[]`);
      if (!Array.isArray(ch.decisions) || !ch.decisions.length) err('design-challenges.js', `${where}: needs decisions[]`);
      else {
        const decIds = new Set();
        ch.decisions.forEach(d => {
          const dw = `${where}/${d.id || '??'}`;
          if (!d.id) err('design-challenges.js', `${where}: decision missing id`);
          else if (decIds.has(d.id)) err('design-challenges.js', `${where}: duplicate decision id "${d.id}"`);
          else decIds.add(d.id);
          if (!d.question) err('design-challenges.js', `${dw}: missing question`);
          if (!Array.isArray(d.options) || d.options.length < 2) { err('design-challenges.js', `${dw}: needs ≥2 options`); return; }
          const optIds = new Set();
          let correct = 0;
          d.options.forEach(o => {
            if (!o.id) err('design-challenges.js', `${dw}: option missing id`);
            else if (optIds.has(o.id)) err('design-challenges.js', `${dw}: duplicate option id "${o.id}"`);
            else optIds.add(o.id);
            if (!o.label) err('design-challenges.js', `${dw}: option "${o.id}" missing label`);
            if (!o.rationale) err('design-challenges.js', `${dw}: option "${o.id}" missing rationale`);
            if (o.correct) correct++;
          });
          if (correct !== 1) err('design-challenges.js', `${dw}: must have exactly one correct option (has ${correct})`);
        });
      }
      for (const f of ['tradeoffs', 'reference']) {
        if (ch[f] != null && !Array.isArray(ch[f])) err('design-challenges.js', `${where}: ${f} must be an array`);
      }
      (ch.refs || []).forEach((r, i) => checkRef('design-challenges.js', r, `${where} ref[${i}]`));
    }
  }

  /* ---- interview QA banks ---- */
  const IQ_BANKS = {
    'aws-interview-qa.js': TV.AwsInterviewQA,
    'azure-interview-qa.js': TV.AzureInterviewQA,
    'databricks-interview-qa.js': TV.DatabricksInterviewQA,
    'fabric-interview-qa.js': TV.FabricInterviewQA,
  };
  for (const [file, topicsArr] of Object.entries(IQ_BANKS)) {
    if (!Array.isArray(topicsArr)) { err(file, 'interview bank not an array / not defined'); continue; }
    const ids = new Set();
    for (const t of topicsArr) {
      if (!t.id) err(file, 'interview topic with no id');
      else if (ids.has(t.id)) err(file, `duplicate interview topic id "${t.id}"`);
      else ids.add(t.id);
      if (!Array.isArray(t.questions) || !t.questions.length) { err(file, `${t.id}: no questions`); continue; }
      for (let i = 0; i < t.questions.length; i++) {
        const qq = t.questions[i];
        if (!qq.q) err(file, `${t.id}[${i}]: missing q`);
        if (!qq.a) err(file, `${t.id}[${i}]: missing a`);
      }
      checkDupes(file, `topic ${t.id}`, t.questions.filter(x => x && x.q), q => q.q);
    }
  }
}

/* ── Self-test: inject a broken record and prove checks fire ── */
function selftest() {
  const broken =
    "'__broken__': [" +
    // record 1: valid-length options but out-of-range answer, bad domain,
    //           bad level, missing explanation/whyWrong, malformed url
    "{ id: '__b1', domainId: 'NOPE', level: 9, type: 'x', q: 'self test alpha', " +
    "options: ['a','b','c'], answer: 5, explanation: '', whyWrong: '', " +
    "officialRef: { label: 'x', url: 'ftp://bad' } }," +
    // record 2: options not a valid array (too short)
    "{ id: '__b2', domainId: 'NOPE', level: 2, type: 'x', q: 'self test beta', " +
    "options: ['only-one'], answer: 0, explanation: 'e', whyWrong: 'w', " +
    "officialRef: { label: 'x', url: 'https://example.com/x' } }" +
    "],";
  const probes = {
    'cert-questions.js': (src) => src.replace("const Q = {", "const Q = { " + broken),
  };
  const TV = loadNamespace((fname, src) => probes[fname] ? probes[fname](src) : src);
  validate(TV);

  const expected = [
    /bank "__broken__" has no matching certification/,
    /missing "explanation"|missing "whyWrong"/,
    /answer index 5 out of range/,
    /options must be an array/,
    /ref.url not a well-formed/,
    /level 9 outside/,
  ];
  const text = errors.map(e => e.msg).join('\n');
  const missed = expected.filter(re => !re.test(text));
  console.log(`\nSelf-test: injected one broken record → ${errors.length} errors raised.`);
  if (missed.length) {
    console.log('✗ Self-test FAILED — these checks did not fire:');
    missed.forEach(re => console.log('   ' + re));
    process.exit(1);
  }
  console.log('✓ Self-test passed — all injected defects were caught.');
  process.exit(0);
}

/* ── Run ──────────────────────────────────────────────────── */
if (OPT.selftest) { selftest(); }

const TV = loadNamespace(null);
validate(TV);

if (OPT.json) {
  console.log(JSON.stringify({ errors, warnings, ok: errors.length === 0 }, null, 2));
} else {
  if (warnings.length) {
    console.log(`\n⚠  ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`   [${w.file}] ${w.msg}`);
  }
  if (errors.length) {
    console.log(`\n✗  ${errors.length} error(s):`);
    for (const e of errors) console.log(`   [${e.file}] ${e.msg}`);
  }
  if (!errors.length) console.log(`\n✓  Content valid — ${warnings.length} warning(s), 0 errors.`);
}

if (errors.length && !OPT.warnOnly) process.exit(1);
process.exit(0);
