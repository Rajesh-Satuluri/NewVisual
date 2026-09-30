import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
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

  buildLayers(container);
  buildACL(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
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
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Kafka Security Architecture</div><div class="section-desc">Three independent, composable layers — all active in production</div></div>
      <div style="display:flex;flex-direction:column;gap:20px">
        ${layers.map(l => `
          <div style="display:flex;gap:16px;background:var(--bg2);border:1px solid ${l.color};border-radius:12px;padding:20px">
            <div style="width:40px;height:40px;border-radius:50%;background:${l.color}22;border:2px solid ${l.color};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${l.icon}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:${l.color};margin-bottom:8px">Layer ${l.num}: ${l.label}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${l.details.map(d => `<code style="font-size:10px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:3px 8px;color:${l.color};font-family:monospace">${d}</code>`).join('')}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
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
