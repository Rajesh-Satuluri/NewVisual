// ── CAP trade-off picker (E18b) ─────────────────────────────────────────────
// A network partition splits your nodes. You cannot keep BOTH consistency and
// availability during the partition — pick one and see the concrete behaviour,
// plus real systems that make that choice.
//
// mount(container) → cleanup()

const CHOICES = {
  CP: {
    label: 'CP — keep Consistency',
    give: 'Availability',
    behaviour: 'The minority side refuses reads/writes (errors or timeouts) rather than risk serving stale or conflicting data. Clients on that side are down until the partition heals.',
    good: 'Money, inventory, bookings — anything where a wrong answer is worse than no answer.',
    systems: ['ZooKeeper / etcd', 'Spanner', 'HBase', 'traditional RDBMS (single primary)'],
  },
  AP: {
    label: 'AP — keep Availability',
    give: 'Consistency',
    behaviour: 'Both sides keep serving reads and writes from local data. They may diverge; conflicts are reconciled after the partition heals (last-write-wins, CRDTs, vector clocks).',
    good: 'Carts, feeds, likes, presence — a slightly stale answer now beats an error.',
    systems: ['Cassandra', 'DynamoDB (eventual)', 'Riak', 'DNS'],
  },
};

export function mount(container) {
  let partitioned = false;
  let choice = null;

  const root = document.createElement('div');
  root.className = 'wg wg-cap';
  root.innerHTML = `
    <div class="wg-cap-stage" id="cap-stage">
      <div class="wg-cap-side" id="cap-left"><div class="wg-cap-node">🖥️ Node 1</div><div class="wg-cap-node">🖥️ Node 2</div></div>
      <div class="wg-cap-link" id="cap-link"><span>network</span></div>
      <div class="wg-cap-side" id="cap-right"><div class="wg-cap-node">🖥️ Node 3</div><div class="wg-cap-client">👤 client</div></div>
    </div>
    <div class="wg-btnrow">
      <button class="sd-btn sd-btn-primary" id="cap-break">⚡ Trigger partition</button>
      <div class="wg-seg" id="cap-choice" hidden>
        <button class="wg-seg-btn" data-c="CP">Choose CP</button>
        <button class="wg-seg-btn" data-c="AP">Choose AP</button>
      </div>
      <button class="sd-btn" id="cap-heal" hidden>✓ Heal partition</button>
    </div>
    <div class="wg-note" id="cap-note">A healthy cluster gives you Consistency AND Availability. CAP only forces a choice <b>when a partition happens</b>. Trigger one to see.</div>
    <div class="wg-cap-detail" id="cap-detail" hidden></div>`;
  container.appendChild(root);

  const link = root.querySelector('#cap-link');
  const stage = root.querySelector('#cap-stage');
  const breakBtn = root.querySelector('#cap-break');
  const healBtn = root.querySelector('#cap-heal');
  const choiceSeg = root.querySelector('#cap-choice');
  const note = root.querySelector('#cap-note');
  const detail = root.querySelector('#cap-detail');

  function render() {
    link.classList.toggle('broken', partitioned);
    stage.classList.toggle('split', partitioned);
    breakBtn.hidden = partitioned;
    choiceSeg.hidden = !partitioned;
    healBtn.hidden = !partitioned;
    choiceSeg.querySelectorAll('.wg-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.c === choice));
    if (partitioned && choice) {
      const c = CHOICES[choice];
      note.innerHTML = `You kept <b>${choice === 'CP' ? 'Consistency' : 'Availability'}</b>, so during the partition you give up <b>${c.give}</b>.`;
      detail.hidden = false;
      detail.innerHTML = `
        <div class="wg-cap-row"><b>What happens</b><span>${c.behaviour}</span></div>
        <div class="wg-cap-row"><b>Fits</b><span>${c.good}</span></div>
        <div class="wg-cap-row"><b>Real systems</b><span>${c.systems.map(s => `<span class="sd-tag">${s}</span>`).join(' ')}</span></div>`;
    } else if (partitioned) {
      note.innerHTML = '🔌 Partition active. The client can only reach the right-hand side. Now choose: keep <b>C</b> or keep <b>A</b>?';
      detail.hidden = true;
    } else {
      note.innerHTML = 'A healthy cluster gives you Consistency AND Availability. CAP only forces a choice <b>when a partition happens</b>. Trigger one to see.';
      detail.hidden = true;
    }
  }

  breakBtn.addEventListener('click', () => { partitioned = true; choice = null; render(); });
  healBtn.addEventListener('click', () => { partitioned = false; choice = null; render(); });
  choiceSeg.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    choice = b.dataset.c; render();
  });

  render();
  return () => { root.remove(); };
}
