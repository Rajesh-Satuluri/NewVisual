export default {
  id: "google-maps",
  title: "Design Google Maps",
  icon: "🛰️",
  chapter: 18,
  group: "Scale & media",
  summary: "Render the map, locate the user, and compute routes with ETAs at planet scale. Three distinct subsystems: map tiles served from a CDN, a routing engine over a road graph, and live traffic feeding ETA — each with very different storage and compute profiles.",
  widget: "route-finder",
  widgetIntro: "The routing engine treats the road network as a **graph** and finds a shortest path over it. This sim runs a **breadth-first search** from the start that expands a frontier outward ring by ring; the first time the frontier reaches the destination, it has found a route with the fewest hops, which it then traces back.\n\nPress **Find route** and watch the search sweep the map, then **randomize obstacles** and rerun. Real maps weight edges by travel time and traffic (Dijkstra / A\\* with heuristics), but the expanding-frontier intuition you see here is exactly what's underneath.",
  sections: [
    {
      title: "Requirements",
      body: "Display maps, find places, and navigate from A to B with accurate, traffic-aware ETAs.",
      bullets: [
        "Render maps smoothly at many zoom levels, globally.",
        "Routing: shortest/fastest path between two points.",
        "ETA that accounts for live traffic conditions.",
        "Massive read volume; mostly static map data with live traffic overlay.",
      ],
    },
    {
      title: "Map rendering: tiles",
      body: "The world isn't sent as one giant image. It's pre-rendered into **map tiles** — small square images (or vector tiles) per zoom level, addressed by (zoom, x, y). The client requests only the tiles in view at the current zoom. Tiles are static and identical for all users, so they're served from a **CDN** — cheap, cacheable, and fast.",
      rules: ["Tiles by (zoom, x, y), static and user-independent → perfect for CDN caching."],
      flow: ["Viewport + zoom", "Compute visible tile coords", "Fetch tiles from CDN", "Composite on client"],
    },
    {
      title: "The road network as a graph",
      body: "Routing treats roads as a **graph**: intersections are nodes, road segments are weighted edges (weight = travel time, which varies with traffic). Finding a route is a shortest-path problem. Plain Dijkstra is far too slow on a continent-scale graph, so production systems precompute structures (contraction hierarchies, or hierarchical graphs separating highways from local roads) to answer queries in milliseconds.",
      bullets: [
        "Nodes = intersections; edges = road segments weighted by travel time.",
        "Precompute hierarchy/shortcuts so queries skip most of the graph.",
        "Partition the graph geographically for scale.",
      ],
    },
    {
      title: "ETA and live traffic",
      body: "Edge weights aren't fixed — they reflect current speed. The system ingests **live traffic** from aggregated, anonymized GPS traces of drivers (and historical patterns by time of day). These continuously update edge weights so routes and ETAs reflect reality. ETA = sum of (segment length / current speed) along the route, adjusted for turns and historical trends.",
      flow: ["Anonymized GPS traces", "Aggregate speeds per segment", "Update edge weights", "Route + ETA reflect live traffic"],
    },
    {
      title: "Scale & serving",
      body: "Tiles dominate read volume and live on the CDN. Routing is compute-heavy, so route servers hold the precomputed graph in memory, sharded by region, with a layer to stitch cross-region routes. Geocoding (address ↔ coordinates) and place search are separate services. Caching popular routes and tiles keeps latency low.",
    },
  ],
  qa: [
    {
      q: "How do you render the map efficiently instead of sending one huge image?",
      a: "Pre-render the world into tiles — small square images or vector tiles — at each zoom level, addressed by (zoom, x, y). The client computes which tiles cover the current viewport and fetches only those. Because tiles are static and identical for everyone, they're served from a CDN and cached aggressively, so the vast majority of map traffic never touches origin servers. Zooming/panning just requests different tile coordinates.",
      tip: "Tiles + (zoom,x,y) addressing + CDN is the whole rendering answer; emphasize that tiles are user-independent static assets.",
    },
    {
      q: "How does routing work, and why not just run Dijkstra?",
      a: "Model the road network as a weighted graph (intersections = nodes, segments = edges weighted by travel time) and find a shortest path. Plain Dijkstra explores far too much of a continent-scale graph to be fast enough. Production systems precompute acceleration structures — contraction hierarchies or hierarchical graphs that separate highways from local roads and add 'shortcut' edges — so a query skips the bulk of the graph and returns in milliseconds. The graph is also partitioned by region for scale.",
      tip: "Naming contraction hierarchies / hierarchical routing (precompute to skip the graph) is what elevates this above 'use Dijkstra'.",
    },
    {
      q: "How is ETA computed and kept accurate?",
      a: "ETA sums travel time over the route's segments, where each segment's time comes from its current speed. Those speeds are kept live by ingesting aggregated, anonymized GPS traces from drivers on the road, blended with historical patterns for that road and time of day. Updated speeds flow back as edge weights, so both the chosen route and the ETA reflect current traffic — and can reroute mid-trip if conditions change.",
      tip: "The insight is that edge weights are dynamic, fed by crowd-sourced GPS + historical patterns — ETA isn't a static distance calc.",
    },
    {
      q: "What are the main subsystems and how do they scale differently?",
      a: "Three: (1) tile serving — static, read-dominant, CDN-cached; (2) routing — compute-heavy, graph held in memory on region-sharded route servers with precomputed hierarchies; (3) traffic/ETA — a streaming ingestion + aggregation pipeline updating edge weights. Plus geocoding/place-search as a separate service. Each scales on its own axis (CDN for tiles, CPU/memory for routing, stream throughput for traffic), which is why you design them independently.",
      tip: "Separating the three subsystems and their distinct scaling profiles shows you see Maps as a system of systems, not one thing.",
    },
  ],
  related: [
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-decide-between-sql-nosql-and-search-engines",
    "how-do-i-design-a-fan-out-fan-in-pipeline-for-heavy-computat",
    "how-do-i-run-in-multiple-regions-and-fail-over-cleanly",
  ],
};
