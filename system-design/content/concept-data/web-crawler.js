export default {
  id: "web-crawler",
  title: "Design a web crawler",
  icon: "🕷️",
  chapter: 9,
  group: "Classic designs",
  summary: "Systematically download the web starting from seed URLs: fetch pages, extract links, and repeat — at billions-of-pages scale, while being polite to servers, avoiding traps, and deduplicating relentlessly.",
  sections: [
    {
      title: "Requirements",
      body: "A crawler for search indexing, archiving, or data mining must be scalable, polite, robust against the messy web, and extensible for new content types.",
      bullets: [
        "**Scalable:** billions of pages via parallelism across many machines.",
        "**Polite:** respect robots.txt and don't hammer any one server.",
        "**Robust:** survive malformed HTML, slow/dead servers, and spider traps.",
        "**Freshness:** re-crawl pages based on how often they change.",
      ],
    },
    {
      title: "The core loop (BFS)",
      body: "Crawling is a graph traversal, usually breadth-first. A **URL frontier** (queue of URLs to visit) drives everything: take a URL, download it, extract links, add new ones back to the frontier, and record the content.",
      flow: ["Seed URLs", "URL frontier", "Fetch page", "Parse + extract links", "Dedup → frontier", "Store content"],
    },
    {
      title: "The URL frontier — politeness & priority",
      body: "The frontier is the heart of the design. It isn't a single FIFO queue; it enforces two things at once:",
      bullets: [
        "**Politeness:** map each host to its own queue, and have a single worker thread per host with a delay between requests — so you never flood one server.",
        "**Priority:** rank URLs (by PageRank, update frequency, traffic) so important pages are crawled first; higher-priority URLs go to higher-priority queues.",
      ],
      body2: "A common design: a front set of priority queues feeding a back set of per-host queues, with a mapping table from host → back queue.",
    },
    {
      title: "Deduplication",
      body: "The web is full of duplicates, so you dedup at two levels. **URL dedup:** before adding a URL to the frontier, check whether it's already seen (a Bloom filter or hash set of visited URLs). **Content dedup:** after download, hash the page content so near-identical pages (same page on many URLs) aren't re-processed.",
      rules: ["URL seen-set (often a Bloom filter) + content hashing = don't crawl or store the same thing twice."],
    },
    {
      title: "Spider traps & robustness",
      body: "The crawler must defend itself against the web's hostility: infinite calendar/URL-parameter loops (**spider traps**), extremely deep link chains, huge pages, and slow servers.",
      bullets: [
        "Cap URL length and crawl depth; detect and blacklist trap patterns.",
        "Timeouts on every fetch; retry transient failures with backoff.",
        "Respect robots.txt (cache it per host) and crawl-delay directives.",
      ],
    },
    {
      title: "Scaling out",
      body: "Partition work across many crawler machines, usually by hashing the hostname so one host is always handled by one worker (which also helps politeness and robots.txt caching). A distributed frontier (e.g. in Kafka or a sharded queue) and distributed storage (for content and the seen-set) let the system scale horizontally.",
    },
  ],
  qa: [
    {
      q: "How does the URL frontier enforce politeness and priority at the same time?",
      a: "It's not one queue. Priority is handled by a set of front queues (a URL's computed importance decides which it enters). Politeness is handled by a set of back queues, one per host, each drained by a single worker thread with a delay between requests — so a given server is never hit concurrently or too fast. A mapping table routes each host's URLs to its dedicated back queue.",
      bullets: [
        "Front queues → priority (crawl important pages first).",
        "Back queues → one per host → politeness (rate-limit per server).",
        "Host→queue mapping keeps all of a host's URLs in one place.",
      ],
      tip: "The 'two sets of queues' answer is what separates a real design from 'just use a FIFO'. Politeness per host is the detail interviewers probe.",
    },
    {
      q: "How do you avoid crawling the same page twice?",
      a: "Two layers of dedup. Before enqueuing a URL, check it against a 'seen URLs' structure — at web scale this is usually a Bloom filter (tiny memory, fast, small false-positive rate) backed by a persistent set. After downloading, compute a hash (or fingerprint/SimHash for near-duplicates) of the content so the same page served under many URLs isn't stored or reprocessed.",
      tip: "Mentioning a Bloom filter for the URL set, and SimHash/fingerprinting for near-duplicate content, shows you know the scale constraints.",
    },
    {
      q: "What's a spider trap and how do you handle it?",
      a: "A spider trap is a structure that generates effectively infinite URLs — dynamic calendars, faceted-search parameter explosions, or deliberately adversarial link mazes — that can trap the crawler forever. Defenses: cap crawl depth and URL length, detect abnormally large numbers of URLs from one host/pattern and blacklist them, and prioritize by usefulness so low-value generated pages rarely get crawled. There's no perfect filter, so monitoring and manual blacklists matter too.",
      tip: "Acknowledging there's no perfect automated solution (hence depth caps + monitoring + blacklists) is the honest, senior answer.",
    },
    {
      q: "How do you keep crawled content fresh without re-crawling everything?",
      a: "Re-crawl adaptively based on observed change frequency: pages that change often (news homepages) get short re-crawl intervals, static pages get long ones. Track last-modified/ETag headers to do conditional GETs (304 Not Modified) and skip unchanged downloads. Prioritize re-crawls in the same frontier using a freshness/importance score so limited crawl budget goes where it matters.",
      tip: "Conditional GETs (ETag/Last-Modified → 304) is the concrete bandwidth-saver to name.",
    },
  ],
  related: [
    "how-do-i-design-for-backpressure-in-a-high-traffic-system",
    "how-do-i-implement-retries-without-causing-storms-and-loops",
    "when-should-i-use-a-queue-vs-direct-rpc",
    "how-do-i-design-a-fan-out-fan-in-pipeline-for-heavy-computat",
  ],
};
