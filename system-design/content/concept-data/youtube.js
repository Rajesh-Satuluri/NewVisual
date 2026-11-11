export default {
  id: "youtube",
  title: "Design YouTube",
  icon: "▶️",
  chapter: 14,
  group: "Scale & media",
  summary: "Upload, store, transcode, and stream video to a global audience. The heavy lifting is an asynchronous transcoding pipeline, blob storage for enormous files, and a CDN that delivers the right quality to each viewer with low latency.",
  widget: "abr-streaming",
  widgetIntro: "This is why a video is transcoded into a **ladder** of renditions (240p…4K). The player downloads small segments and, for each one, picks the **highest-quality rendition the measured bandwidth can sustain** — **adaptive bitrate** streaming — while keeping a **buffer** as a shock absorber for dips.\n\nHit **network drop** and watch the player step *down* the ladder and keep playing, rather than freezing on a fixed quality. If bandwidth stays below the current bitrate and the buffer drains to zero, playback **stalls** — which is exactly what adaptive bitrate is designed to avoid by switching down early.",
  sections: [
    {
      title: "Requirements",
      body: "Users upload videos; viewers stream them smoothly worldwide at the best quality their connection allows.",
      bullets: [
        "Upload large video files reliably.",
        "Stream with low startup latency and adaptive quality (240p…4K).",
        "Massive scale, read-heavy (views ≫ uploads), global audience.",
        "Store metadata (title, owner, views) and the video bytes separately.",
      ],
    },
    {
      title: "Split metadata from the bytes",
      body: "Two very different storage problems. **Metadata** (title, description, uploader, view count, thumbnails) is small, structured, and queried a lot — a database (often sharded) + cache. **Video content** is huge binary blobs — object/blob storage (S3-style), not a database.",
      rules: ["Metadata → DB + cache. Video bytes → blob/object storage + CDN."],
    },
    {
      title: "The upload path",
      body: "The client uploads to blob storage (often directly via pre-signed URLs, with chunked/resumable upload for big files). Once stored, an event is enqueued to kick off processing. The upload is acknowledged quickly; the video isn't watchable until transcoding finishes.",
      flow: ["Client", "Chunked upload → blob storage (original)", "Enqueue transcode job", "Processing pipeline"],
    },
    {
      title: "Transcoding pipeline (the core)",
      body: "A raw upload must be converted into many formats/resolutions and bitrates so it can stream adaptively on any device. This is CPU-heavy and slow, so it's done **asynchronously** by a fleet of workers: the video is split into segments, transcoded in parallel into multiple renditions (e.g. H.264/VP9 at 240p–4K), packaged for adaptive streaming (HLS/DASH), and the outputs are written back to blob storage.",
      flow: ["Original", "Segment", "Transcode in parallel (240p…4K)", "Package HLS/DASH", "Store renditions", "Mark ready"],
      body2: "Fan-out/fan-in: one video → many parallel transcode tasks → recombined manifest. Workers scale with the queue.",
    },
    {
      title: "The streaming path & CDN",
      body: "Viewing is overwhelmingly read-heavy and latency-sensitive, so transcoded renditions are served from a **CDN** — edge servers cache video segments close to viewers. The player uses **adaptive bitrate streaming**: it downloads a manifest, then fetches small segments, switching rendition up or down based on measured bandwidth so playback doesn't stall.",
      rules: ["CDN edge caching + adaptive bitrate (HLS/DASH) = low startup latency, no buffering across varying networks."],
    },
    {
      title: "Scaling & cost",
      body: "Popular videos are cached hot at the edge; the long tail is fetched from origin blob storage on demand. Transcoding is the big compute cost — done once per video, amortized over all views. View counts are high-write, so they're often aggregated/approximated (batched counters) rather than incremented synchronously per view.",
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "YouTube is two very different systems bolted together: a heavy asynchronous upload/transcode pipeline on the write side, and a massively cached CDN read path. Here's how a video gets from a phone to a billion screens.",
  deepDive: [
    {
      title: "Write-once, read-a-billion-times",
      body: "Uploads are rare and expensive; views are constant and must be cheap. The whole design splits along that asymmetry — a slow async pipeline for ingest, an aggressively cached edge for delivery.",
      stats: [
        { value: "async", label: "upload + transcode (minutes, offline)", tone: "blue" },
        { value: "CDN", label: "99%+ of view bytes served from edge", tone: "green" },
        { value: "N renditions", label: "per video (144p…4K) for adaptive bitrate", tone: "accent" },
        { value: "metadata ≪ blob", label: "DB holds pointers; files live in object storage", tone: "amber" },
      ],
    },
    {
      title: "The upload & transcode pipeline",
      svg: `<svg viewBox="0 0 620 130" width="620" role="img" aria-label="Upload and transcode pipeline" style="font-family:system-ui">
        <rect x="8" y="48" width="86" height="40" rx="8" fill="none" stroke="#4F46E5" stroke-width="1.5"/><text x="51" y="72" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">Upload</text>
        <rect x="118" y="48" width="96" height="40" rx="8" fill="none" stroke="#4F46E5" stroke-width="1.5"/><text x="166" y="66" text-anchor="middle" fill="currentColor" font-size="10" font-weight="700">Raw blob</text><text x="166" y="80" text-anchor="middle" fill="currentColor" font-size="9" opacity="0.7">+ queue job</text>
        <rect x="238" y="48" width="110" height="40" rx="8" fill="none" stroke="#F59E0B" stroke-width="1.5"/><text x="293" y="66" text-anchor="middle" fill="currentColor" font-size="10" font-weight="700">Transcode</text><text x="293" y="80" text-anchor="middle" fill="currentColor" font-size="9" opacity="0.7">N renditions</text>
        <rect x="372" y="48" width="110" height="40" rx="8" fill="none" stroke="#10B981" stroke-width="1.5"/><text x="427" y="66" text-anchor="middle" fill="currentColor" font-size="10" font-weight="700">Object store</text><text x="427" y="80" text-anchor="middle" fill="currentColor" font-size="9" opacity="0.7">+ mark ready</text>
        <rect x="506" y="48" width="106" height="40" rx="8" fill="none" stroke="#10B981" stroke-width="1.5"/><text x="559" y="72" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">CDN edge</text>
        <line x1="94" y1="68" x2="116" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#ytA)"/>
        <line x1="214" y1="68" x2="236" y2="68" stroke="#F59E0B" stroke-width="1.5" marker-end="url(#ytAm)"/>
        <line x1="348" y1="68" x2="370" y2="68" stroke="#10B981" stroke-width="1.5" marker-end="url(#ytG)"/>
        <line x1="482" y1="68" x2="504" y2="68" stroke="#10B981" stroke-width="1.5" marker-end="url(#ytG)"/>
        <defs>
          <marker id="ytA" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="currentColor"/></marker>
          <marker id="ytAm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#F59E0B"/></marker>
          <marker id="ytG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#10B981"/></marker>
        </defs>
      </svg>`,
      caption: "Ingest is fully async: the uploader returns immediately; transcoding fans out into per-resolution jobs before the video is marked ready.",
    },
    {
      title: "Why transcode into many renditions",
      compare: {
        title: "Serving the video",
        cols: [
          { title: "Store one original, serve it to all", tone: "bad", body: "Simplest, but…", points: [
            "A phone on 3G can't play a 4K stream — buffering, drop-offs.",
            "Wastes bandwidth for small screens.",
            "No way to adapt when the network changes mid-play.",
          ] },
          { title: "Transcode to a ladder + adaptive bitrate (HLS/DASH)", tone: "good", body: "Many renditions, chunked.", points: [
            "The player picks a quality to match the live network.",
            "Chunked segments switch quality seamlessly mid-stream.",
            "Edge-cacheable chunks → most bytes never touch origin.",
          ] },
        ],
      },
    },
    {
      title: "Metadata vs blobs, and the read path",
      body: "Keep **metadata** (title, owner, rendition list, view count) in a database; keep the **video bytes** in object storage fronted by a CDN. A watch request resolves metadata once, then streams chunks straight from the nearest edge.",
      callouts: [
        { tone: "key", label: "Separation of concerns:", body: "The DB is tiny and queryable; the blob store is huge and dumb. Never put video bytes in your database." },
        { tone: "tip", label: "Popularity is skewed:", body: "A small set of videos drives most views, so CDN caching is enormously effective — size the edge to the hot set, like any read-heavy system." },
      ],
    },
  ],
  qa: [
    {
      q: "Walk me through what happens from upload to a video being watchable.",
      a: "The client uploads the raw file (chunked/resumable, often via a pre-signed URL) into blob storage; the API acknowledges quickly and enqueues a transcode job. A worker fleet then transcodes the video asynchronously — segmenting it and producing multiple resolutions/bitrates, packaged for adaptive streaming (HLS/DASH), written back to blob storage. When processing completes, metadata is marked ready and the renditions are distributed via CDN for viewers.",
      bullets: [
        "Upload → blob storage (original).",
        "Async transcoding → many renditions (240p–4K) + streaming manifest.",
        "Serve via CDN; player adapts bitrate to the viewer's bandwidth.",
      ],
      tip: "The key framing: upload is fast-acknowledged, transcoding is async and heavy, viewing is CDN-served. Don't make the user wait on transcoding in the request path.",
    },
    {
      q: "Why transcode into multiple resolutions, and why asynchronously?",
      a: "Viewers are on wildly different devices and networks, so adaptive bitrate streaming needs several renditions (e.g. 240p–4K); the player picks and switches between them based on measured bandwidth to avoid buffering. Transcoding is CPU-intensive and can take minutes, so doing it synchronously would block uploads and tie up request threads — instead a job queue feeds a scalable worker fleet that processes videos in the background and marks them ready when done.",
      tip: "Adaptive bitrate = multiple renditions; async = don't block on heavy CPU work. Mention fan-out/fan-in over video segments for parallel speed.",
    },
    {
      q: "How do you store video given its size, and how is it served fast globally?",
      a: "Keep metadata and bytes separate: structured metadata in a (sharded) database with a cache; the video bytes in object/blob storage, which is built for huge files and cheap durable capacity. For delivery, push transcoded segments to a CDN so viewers stream from a nearby edge with low latency; popular content stays hot at the edge while the long tail is pulled from origin on demand.",
      tip: "'Metadata in DB, bytes in blob storage, delivery via CDN' is the three-part storage answer interviewers want.",
    },
    {
      q: "How would you handle view counts at YouTube scale?",
      a: "Incrementing a counter synchronously on every view is a massive write hotspot and isn't worth exact precision. Instead, log view events to a stream and aggregate counts in batches (or use approximate/hourly counters), accepting slightly delayed, eventually-consistent counts. Dedup obvious double-counts (same user/session) in the pipeline. Exactness isn't required for a view count, so trade it for scalability.",
      tip: "Recognizing view counts as an eventually-consistent, aggregated metric (not a synchronous ACID write) is the senior move.",
    },
  ],
  related: [
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-design-a-fan-out-fan-in-pipeline-for-heavy-computat",
    "when-should-i-use-a-queue-vs-direct-rpc",
    "how-do-i-track-the-status-of-long-running-jobs-for-users",
    "how-do-i-design-a-service-that-can-handle-10x-more-traffic-w",
  ],
};
