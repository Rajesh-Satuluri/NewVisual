/* content/disk-io.js — the "Disk I/O" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/disk-io-scene.js. Rendered through the shared course shell. */

export const diskIoLesson = {
  id: 'disk-io',
  title: 'Disk I/O',
  group: 'Storage Engine',
  summary: 'Why reading a byte from disk costs a million times more than reading it from RAM — the mechanical and electronic physics that every storage structure is quietly designed around.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['ioOps', 'latency', 'throughput', 'seeks'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The latency wall between RAM and disk', step: 0 },
    { text: 'Inside an HDD: seek, rotate, transfer', step: 1 },
    { text: 'Inside an SSD: flash pages and erase blocks', step: 2 },
    { text: 'The true cost of a single I/O', step: 3 },
    { text: 'Write amplification and why SSDs wear out', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Latency wall',
      title: 'The wall between RAM and disk',
      body: [
        `A CPU adds two numbers in under a nanosecond. Fetching a byte from RAM takes about a hundred nanoseconds. Fetching that same byte from a spinning disk takes <b>ten milliseconds</b> — roughly <span class="term">a hundred thousand times longer</span>.`,
        `Scaled to human time, if a RAM access felt like a sip of coffee, a disk access would be a two-week vacation. While the disk arm crawls to the data, the CPU could have run millions of instructions. This gap is the single most important fact in storage engineering.`,
      ],
      callout: { kind: 'warn', text: 'One disk I/O wastes millions of CPU cycles. A database is fast not because the CPU is fast, but because it avoids disk I/O wherever it possibly can.' },
      metrics: { ioOps: 1, latency: 10, throughput: 0, seeks: 1 },
      scene: { view: 'bottleneck', note: 'Nanoseconds in silicon, milliseconds on disk — a hundred-thousand-fold cliff.' },
    },
    { // 1 — HOW IT WORKS
      chapter: 'technique', short: 'Inside an HDD',
      title: 'A spinning disk, measured in moving parts',
      body: [
        `A hard drive stores bits as magnetic marks on a platter that spins thousands of times a minute. To read one, a mechanical arm must physically swing the head to the right <span class="term">track</span> — that is <b>seek time</b>. Then it waits for the platter to rotate the right <span class="term">sector</span> under the head — <b>rotational delay</b>. Only then does the <b>transfer</b> begin.`,
        `Seek and rotation are mechanical, so they dominate: a random read spends almost all its time moving metal into position, and almost none actually reading.`,
      ],
      callout: { kind: 'insight', text: 'HDD cost = seek + rotational delay + transfer. The first two are mechanical motion — which is exactly why random access on a HDD is so brutally slow.' },
      changes: ['+ seek: arm → track', '+ rotate: platter → sector', '+ transfer: read bytes'],
      metrics: { ioOps: 1, latency: 10, throughput: 120, seeks: 1 },
      scene: { view: 'hdd', note: 'Arm seeks to the track, platter rotates to the sector, then bytes flow.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Inside an SSD',
      title: 'Flash: fast, but with its own rules',
      body: [
        `A solid-state drive has no moving parts. Data lives in <span class="term">flash cells</span>, grouped into <b>pages</b> (the unit you read and write, a few KB) which are grouped into <b>erase blocks</b> (the unit you can erase, a few MB). Many flash chips sit on parallel <b>channels</b>, so the controller reads several at once.`,
        `With no arm to move, a random read is nearly as fast as a sequential one — microseconds, not milliseconds. That single property reshapes everything a storage engine is allowed to assume.`,
      ],
      callout: { kind: 'tip', text: 'SSD random reads are ~100× faster than HDD because nothing moves. Read in pages, erase in blocks, spread across parallel channels.' },
      changes: ['+ flash pages (read unit)', '+ erase blocks (erase unit)', '+ parallel channels'],
      metrics: { ioOps: 1, latency: 1, throughput: 550, seeks: 0 },
      scene: { view: 'ssd', note: 'No moving parts — flash pages in erase blocks, read in parallel across channels.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Anatomy of an I/O',
      title: 'What one read actually costs',
      body: [
        `Stack the costs and the contrast is stark. On a HDD, one random read is <b>seek (~4 ms) + rotation (~4 ms) + transfer (~0.1 ms)</b> — the data movement is a rounding error next to the mechanical wait.`,
        `On an SSD, there is no seek and no rotation: the cost is essentially just <b>transfer plus a little controller overhead</b>, well under a tenth of a millisecond. Same byte, two completely different bills.`,
      ],
      callout: { kind: 'insight', text: 'On a HDD, positioning dwarfs transfer. On an SSD, positioning is free — so the whole cost model, and the data structures built on it, change.' },
      changes: ['HDD: 8 ms positioning', 'SSD: ~0.05 ms, no positioning', '~ latency collapses'],
      metrics: { ioOps: 1, latency: 8, throughput: 550, seeks: 1 },
      scene: { view: 'cost', note: 'HDD pays seek + rotate + transfer; the SSD pays transfer alone.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Write amplification',
      title: 'Why SSDs wear out',
      body: [
        `SSDs have a catch: a flash page cannot be overwritten in place. To change even one byte, the controller must <span class="term">read</span> the surrounding data, <span class="term">erase</span> the whole block, and <span class="term">rewrite</span> everything back. A tiny logical write becomes a large physical one — <b>write amplification</b>.`,
        `Worse, each erase block tolerates only so many erase cycles before it dies, so amplification literally shortens the drive's life. This is why append-only designs like LSM-trees, which turn random writes into big sequential ones, are so kind to flash.`,
      ],
      callout: { kind: 'warn', text: 'A 1 KB logical write can trigger a multi-MB erase-and-rewrite. Write amplification burns throughput and wears the flash — minimise and batch your writes.' },
      changes: ['small write → full-block rewrite', '+ wear per erase cycle', '~ sequential writes win'],
      metrics: { ioOps: 6, latency: 3, throughput: 90, seeks: 0 },
      scene: { view: 'amplification', note: 'One small logical write forces a read–erase–rewrite of an entire block.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The constraint everything is built around',
      body: [
        `Two devices, two cost shapes. A <b>HDD</b> pays seek + rotation + transfer, so it loves big sequential reads and hates random ones. An <b>SSD</b> reads randomly for almost free but erases in whole blocks, so it rewards batched, sequential writes and punishes tiny scattered ones.`,
        `Every structure ahead — pages, buffer pools, B-trees, LSM-trees — exists to turn the access pattern the application wants into the access pattern the disk is good at. Disk I/O is the bottleneck the whole storage engine is engineered around.`,
      ],
      callout: { kind: 'insight', text: 'HDD: sequential good, random bad. SSD: random reads cheap, writes erase whole blocks. Shape your I/O to the device and the database flies.' },
      metrics: { ioOps: 1, latency: 1, throughput: 550, seeks: 0 },
      scene: { view: 'recap', note: 'Match the access pattern to the device — the one rule beneath every storage structure.' },
    },
  ],
};
