import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What are the three security layers in Kafka and how do they interact?', a: 'Three independent layers: (1) Encryption (TLS/SSL): encrypts data in transit between clients and brokers, and between brokers. Configured via listeners=SSL://... and ssl.truststore/keystore settings. (2) Authentication (SASL): proves identity. Options: SASL/PLAIN (username+password, production: use with TLS), SASL/SCRAM-SHA-256/512 (challenge-response, credentials in ZK/KRaft), SASL/GSSAPI (Kerberos, for enterprise AD integration), SASL/OAUTHBEARER (JWT, for cloud-native). (3) Authorization (ACLs): controls what an authenticated principal can do. Defined via kafka-acls.sh or programmatically.', tip: 'Typical Amazon setup: TLS everywhere + SASL/SCRAM-512 for service auth + ACLs for topic-level access control. mTLS for highest assurance services.' },
  { q: 'How do Kafka ACLs work and what is the principle of least privilege applied to topics?', a: 'ACLs are stored in ZooKeeper or KRaft metadata. Each ACL specifies: Principal (User:service-account), Resource (Topic:orders, Group:fulfillment-group), Operation (READ, WRITE, CREATE, DESCRIBE, DELETE), Permission (ALLOW/DENY), Host (*). Least privilege: the fulfillment service account has WRITE on the orders topic and READ on its consumer group — nothing else. The fraud service has READ on orders, READ on its own group. Neither can CREATE or DELETE topics (ops team only). Wildcard DENY overrides ALLOW — use carefully.', tip: 'ACL pitfalls: forgetting to grant DESCRIBE on a topic prevents the consumer from fetching metadata even if READ is allowed. Grant both READ + DESCRIBE for consumers.' },
  { q: 'What is mTLS (mutual TLS) and when should you use it for Kafka?', a: 'Regular TLS: only the server presents a certificate (broker), client authenticates separately (SASL). mTLS: both parties present certificates — the broker also validates the client certificate against a trusted CA. The CN or SAN of the client certificate becomes the Kafka principal (ssl.client.auth=required). Use mTLS when: (1) Service-to-service auth in high-security environments where certificate management is mature. (2) No SASL infrastructure available. (3) Zero-trust networks. Drawback: certificate rotation is operationally complex at scale — automate with cert-manager or AWS ACM.', tip: 'Amazon uses mTLS for intra-cluster broker-to-broker replication and for the most sensitive services (payment, identity). Regular SASL/SCRAM for operational tooling.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M15 · Operations',
    title: 'Security',
    subtitle: 'TLS encryption, SASL authentication, ACL authorization — Amazon\'s security stack',
    tabs: [
      { id: 'layers', label: '🔐 Security Layers' },
      { id: 'acl',    label: '📋 ACL Matrix' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const c1 = buildLayers(container);
  buildACL(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return () => { c1 && c1(); };
}

function buildLayers(container) {
  const tab = container.querySelector('#tab-layers');
  const layers = [
    { num: '1', label: 'TLS Encryption', color: '#3B82F6', icon: '🔒', details: [
      'listeners=SSL://broker:9093',
      'ssl.keystore.location=/certs/broker.jks',
      'ssl.truststore.location=/certs/ca.jks',
      'Encrypts: client↔broker, broker↔broker',
      'Mutual TLS: ssl.client.auth=required (optional)',
    ]},
    { num: '2', label: 'SASL Authentication', color: '#8B5CF6', icon: '🪪', details: [
      'SASL/PLAIN — username+password (dev only)',
      'SASL/SCRAM-SHA-256 / SHA-512 — production',
      'SASL/GSSAPI (Kerberos) — enterprise AD',
      'SASL/OAUTHBEARER — JWT / cloud-native',
      'Principal maps to ACL subject',
    ]},
    { num: '3', label: 'ACL Authorization', color: '#FF6900', icon: '📋', details: [
      'ALLOW User:order-svc WRITE Topic:orders',
      'ALLOW User:fraud-svc READ Topic:orders',
      'ALLOW User:fraud-svc READ Group:fraud-group',
      'DENY User:* DELETE Topic:* (wildcard deny)',
      'Stored in KRaft metadata (__cluster_metadata)',
    ]},
  ];
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Before a client can read or write a topic, its request must clear <b>three independent gates</b> in order: <b>TLS</b> (encrypt the connection, optionally prove identity by certificate) → <b>SASL</b> (authenticate — <i>who are you?</i>) → <b>ACL</b> (authorize — <i>are you allowed to do this?</i>). Run each scenario and watch exactly where a request succeeds or gets rejected.</div>
      <canvas id="sec-canvas" width="820" height="280" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="sec-ok">✅ order-svc writes orders</button>
        <button class="ctrl-btn" id="sec-auth">✖ wrong password</button>
        <button class="ctrl-btn" id="sec-acl">✖ analytics-svc writes orders</button>
        <span class="ctrl-label" id="sec-status">Pick a scenario to send a request</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Kafka security is <strong>three separate concerns</strong>, and mixing them up is the most common interview mistake. <strong>Encryption</strong> (TLS/SSL) protects data <em>in transit</em> so nobody on the network can read or tamper with it — but encryption alone says nothing about identity. <strong>Authentication</strong> (SASL) establishes <em>who the caller is</em> by mapping the connection to a principal like <code>User:order-svc</code>. <strong>Authorization</strong> (ACLs) decides <em>what that principal may do</em> — WRITE to <code>orders</code>, READ from a group, and nothing else.</p>
      <p>The gates run in that order, and each can reject independently. The "wrong password" scenario clears TLS (the bytes are encrypted fine) but fails at <strong>SASL</strong> — Kafka never learns a valid identity, so the request dies before authorization is even considered. The "analytics-svc writes orders" scenario is more subtle: the caller is <em>perfectly authenticated</em> (it really is analytics-svc) but has no <code>WRITE</code> ACL on <code>orders</code>, so it's rejected at the <strong>ACL</strong> gate with <code>TopicAuthorizationException</code>. Authenticated ≠ authorized.</p>
      <p>The SASL mechanism itself has production-grade choices: <code>SASL/SCRAM-SHA-512</code> (salted challenge-response, credentials in KRaft metadata) for service accounts, <code>SASL/GSSAPI</code> (Kerberos) for enterprise Active Directory, <code>SASL/OAUTHBEARER</code> (JWT) for cloud-native. Avoid <code>SASL/PLAIN</code> unless it rides inside TLS. A stronger option folds authentication into the TLS gate itself: <strong>mutual TLS</strong> (<code>ssl.client.auth=required</code>), where the client presents its own certificate and the cert's CN/SAN becomes the principal — Amazon uses mTLS for broker-to-broker replication and its most sensitive services.</p>
      <p><strong>Interview angle:</strong> state the stack as "TLS for confidentiality, SASL for authentication, ACLs for authorization," then name the least-privilege model: each service gets exactly the operations it needs. The classic ACL gotcha — a consumer needs both <code>READ</code> <em>and</em> <code>DESCRIBE</code> on the topic (plus <code>READ</code> on its group); grant READ alone and it still can't fetch metadata. And remember a wildcard <code>DENY</code> always beats an <code>ALLOW</code>. See the ACL Matrix tab for the full per-service grid.</p>
    </div>
    <div class="scroll-content" style="margin-top:2px">
      <div class="section-header"><div class="section-title">The three layers in config — reference</div><div class="section-desc">What each gate above looks like in server.properties / kafka-acls</div></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${layers.map(l => `
          <div style="display:flex;gap:16px;background:var(--bg2);border:1px solid ${l.color};border-radius:12px;padding:18px">
            <div style="width:40px;height:40px;border-radius:50%;background:${l.color}22;border:2px solid ${l.color};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${l.icon}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:${l.color};margin-bottom:8px">Gate ${l.num}: ${l.label}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${l.details.map(d => `<code style="font-size:10px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:3px 8px;color:${l.color};font-family:monospace">${d}</code>`).join('')}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  const canvas = tab.querySelector('#sec-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const CLIENT_X = 70, TOPIC_X = 748, GY = 120;
  const gates = [
    { id: 'tls',  x: 250, label: 'TLS',  sub: 'encrypt + cert', color: '#3B82F6' },
    { id: 'sasl', x: 410, label: 'SASL', sub: 'authenticate',   color: '#8B5CF6' },
    { id: 'acl',  x: 570, label: 'ACL',  sub: 'authorize',      color: '#FF6900' },
  ];
  // scenario → index of the gate that rejects (null = passes all)
  const SCEN = {
    ok:   { fail: null, label: 'order-svc', note: '' },
    auth: { fail: 1,    label: 'order-svc (bad pw)', note: 'SASL: authentication failed — SaslAuthenticationException' },
    acl:  { fail: 2,    label: 'analytics-svc', note: 'ACL: no WRITE on orders — TopicAuthorizationException' },
  };
  let scen = null, px = CLIENT_X, moving = false, result = '';
  let raf = null, lastT = 0;

  function start(key) {
    scen = SCEN[key]; px = CLIENT_X + 40; moving = true; result = '';
    const st = tab.querySelector('#sec-status');
    if (st) st.textContent = 'Request travelling…';
  }

  function targetX() {
    if (!scen) return CLIENT_X;
    return scen.fail === null ? TOPIC_X : gates[scen.fail].x;
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    if (moving) {
      px += 420 * dt;
      const tx = targetX();
      if (px >= tx) { px = tx; moving = false;
        result = scen.fail === null ? 'ok' : 'fail';
        const st = tab.querySelector('#sec-status');
        if (st) st.textContent = scen.fail === null
          ? '✅ Authorized — record written to orders'
          : '✖ Rejected · ' + scen.note;
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // baseline track
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CLIENT_X, GY); ctx.lineTo(TOPIC_X, GY); ctx.stroke();

    // client
    drawBox(ctx, CLIENT_X - 40, GY - 26, 80, 52, '#10B981', 'Client', scen ? scen.label : 'service');
    // topic
    const topicOk = result === 'ok';
    drawBox(ctx, TOPIC_X - 40, GY - 26, 80, 52, topicOk ? '#10B981' : '#334155', 'Topic', 'orders');

    // gates
    gates.forEach((g, i) => {
      let state = 'idle';
      if (scen) {
        const reached = px >= g.x - 1;
        if (scen.fail === i && reached) state = 'fail';
        else if ((scen.fail === null || i < scen.fail) && reached) state = 'pass';
      }
      const col = state === 'fail' ? '#EF4444' : state === 'pass' ? '#10B981' : g.color;
      drawBox(ctx, g.x - 46, GY - 34, 92, 68, col, g.label, g.sub);
      ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui'; ctx.fillStyle = col;
      if (state === 'pass') ctx.fillText('✓', g.x, GY - 44);
      else if (state === 'fail') ctx.fillText('✕', g.x, GY - 44);
    });

    // request packet
    if (scen) {
      const col = (result === 'fail' && !moving) ? '#EF4444' : '#F59E0B';
      ctx.beginPath(); ctx.arc(px, GY, 9, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = '#0A0E1A'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('WRITE', px, GY + 26);
    }

    // caption line
    ctx.textAlign = 'left'; ctx.font = '11px system-ui'; ctx.fillStyle = '#94A3B8';
    ctx.fillText('Each gate is independent: encryption ≠ identity, and authenticated ≠ authorized.', CLIENT_X - 10, 210);
    if (result === 'fail' && !moving) {
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px system-ui';
      ctx.fillText(scen.note, CLIENT_X - 10, 232);
    } else if (result === 'ok') {
      ctx.fillStyle = '#10B981'; ctx.font = 'bold 11px system-ui';
      ctx.fillText('Passed all three gates → record appended to orders.', CLIENT_X - 10, 232);
    }

    raf = requestAnimationFrame(draw);
  }

  function drawBox(c, x, y, w, h, color, title, sub) {
    c.fillStyle = color + '22'; c.strokeStyle = color; c.lineWidth = 2;
    c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke();
    c.textAlign = 'center';
    c.font = 'bold 12px system-ui'; c.fillStyle = color;
    c.fillText(title, x + w / 2, y + h / 2 - 2);
    c.font = '9px system-ui'; c.fillStyle = '#94A3B8';
    c.fillText(sub, x + w / 2, y + h / 2 + 13);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  tab.querySelector('#sec-ok').addEventListener('click', () => start('ok'));
  tab.querySelector('#sec-auth').addEventListener('click', () => start('auth'));
  tab.querySelector('#sec-acl').addEventListener('click', () => start('acl'));

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildACL(container) {
  const tab = container.querySelector('#tab-acl');
  const matrix = [
    { principal: 'User:order-svc',       resource: 'Topic:orders',         ops: { WRITE: '✅', READ: '❌', CREATE: '❌', DELETE: '❌', DESCRIBE: '✅' } },
    { principal: 'User:fraud-svc',        resource: 'Topic:orders',         ops: { WRITE: '❌', READ: '✅', CREATE: '❌', DELETE: '❌', DESCRIBE: '✅' } },
    { principal: 'User:fraud-svc',        resource: 'Group:fraud-group',    ops: { WRITE: '—', READ: '✅', CREATE: '—', DELETE: '❌', DESCRIBE: '✅' } },
    { principal: 'User:fulfillment-svc',  resource: 'Topic:orders',         ops: { WRITE: '❌', READ: '✅', CREATE: '❌', DELETE: '❌', DESCRIBE: '✅' } },
    { principal: 'User:ops-team',         resource: 'Topic:*',              ops: { WRITE: '✅', READ: '✅', CREATE: '✅', DELETE: '✅', DESCRIBE: '✅' } },
    { principal: 'User:analytics-svc',    resource: 'Topic:orders',         ops: { WRITE: '❌', READ: '✅', CREATE: '❌', DELETE: '❌', DESCRIBE: '✅' } },
  ];
  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">ACL Matrix — Amazon Order Pipeline</div><div class="section-desc">Least privilege: each service only has what it needs</div></div>
      <div class="canvas-explainer" style="border-top:none;border-radius:10px;margin-bottom:16px">
        <p>This is the <strong>authorization</strong> gate from the handshake, written out per service. Read each row as "this principal may do these operations on this resource." The design rule is <strong>least privilege</strong>: <code>order-svc</code> can only <code>WRITE</code> + <code>DESCRIBE</code> <code>orders</code> — it can't read it back, can't touch other topics, can't create or delete anything. The read-only services (<code>fraud-svc</code>, <code>fulfillment-svc</code>, <code>analytics-svc</code>) get <code>READ</code> + <code>DESCRIBE</code> and nothing more; only <code>ops-team</code> holds <code>CREATE</code>/<code>DELETE</code>.</p>
        <p>Two things to notice. A consumer needs a grant on <em>two</em> resources — <code>READ</code>+<code>DESCRIBE</code> on the <strong>topic</strong> and <code>READ</code> on its <strong>consumer group</strong> (see the <code>fraud-svc → Group:fraud-group</code> row); miss the group grant and it authenticates fine but can't commit offsets. And <code>DESCRIBE</code> is the quiet prerequisite — without it a client can't even fetch metadata, so a topic with <code>READ</code> but no <code>DESCRIBE</code> fails before it reads a single record. ACLs live in KRaft metadata and are evaluated on every request; a wildcard <code>DENY</code> always wins over an <code>ALLOW</code>.</p>
      </div>
      <table class="compare-table">
        <thead><tr><th>Principal</th><th>Resource</th><th>WRITE</th><th>READ</th><th>CREATE</th><th>DELETE</th><th>DESCRIBE</th></tr></thead>
        <tbody>${matrix.map(r => `
          <tr>
            <td style="font-family:monospace;font-size:11px;color:var(--accent)">${r.principal}</td>
            <td style="font-family:monospace;font-size:11px;color:var(--text2)">${r.resource}</td>
            ${Object.values(r.ops).map(v => `<td style="text-align:center">${v}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
