export default {
  id: "proximity-service",
  title: "Design a proximity service",
  icon: "📍",
  chapter: 16,
  group: "Scale & media",
  summary: "Find things near a location — 'restaurants within 5 km of me' (Yelp/Uber style). The core challenge is indexing 2D geography so range queries are fast; the answer is geohash or a quadtree rather than scanning every row.",
  sections: [
    {
      title: "Requirements",
      body: "Given a user's coordinates and a radius, return nearby businesses quickly; support adding/updating business locations.",
      bullets: [
        "`search(lat, lng, radius)` → nearby places, fast (low latency).",
        "Read-heavy: searches ≫ updates to business locations.",
        "Businesses are mostly static; the user's location is the variable.",
        "Scale to millions of places and high query volume.",
      ],
    },
    {
      title: "Why a plain database index fails",
      body: "A naive `WHERE lat BETWEEN … AND lng BETWEEN …` can use B-tree indexes on lat and lng, but they index each dimension independently — the database still scans a wide band and can't efficiently combine two ranges into a 2D box. You need an index that understands **2D locality**: points close on the map should be close in the index.",
      rules: ["Two 1-D indexes ≠ a 2-D index. You need geospatial indexing for locality."],
    },
    {
      title: "Approach A — Geohash",
      body: "**Geohash** encodes a (lat, lng) into a short string by recursively dividing the world into a grid; longer strings = smaller, more precise cells. Crucially, nearby locations usually share a geohash **prefix**, so 'find nearby' becomes a prefix match — a plain string index (or key range) handles it. Pick the geohash length to match the search radius.",
      bullets: [
        "Encode each business's location to a geohash; index the string.",
        "Query = the user's geohash prefix + the 8 neighboring cells (to handle edges).",
        "Longer prefix = finer grid; choose length from the radius.",
      ],
      flow: ["lat,lng → geohash", "index by geohash string", "query: prefix match + neighbor cells"],
    },
    {
      title: "Approach B — Quadtree",
      body: "A **quadtree** recursively subdivides space into four quadrants until each leaf holds at most K points. Dense areas (downtown) subdivide deeply; sparse areas stay coarse — it adapts to density, unlike a fixed geohash grid. A range query descends the tree to the relevant leaves. It's an in-memory structure, rebuilt/updated as data changes.",
      rules: ["Quadtree adapts to density (deep where dense); geohash is a fixed grid but simpler to store in a DB."],
    },
    {
      title: "The edge-cell problem",
      body: "Grid cells create a subtlety: the nearest place might be just across a cell boundary, in a neighboring cell. So a correct query checks the user's cell **plus its neighbors** (e.g. the 8 surrounding geohash cells), gathers candidates, then computes exact distance and filters/sorts by the real radius.",
      flow: ["Find user's cell", "Gather candidates from cell + neighbors", "Compute exact distance", "Filter by radius, sort"],
    },
    {
      title: "Serving & scale",
      body: "Because businesses are mostly static and reads dominate, cache popular cells heavily and replicate the index for read scale. Geohash-based indexes shard naturally by prefix. Databases with native geospatial support (PostGIS, Elasticsearch geo, Redis GEO) implement these ideas for you in practice.",
    },
  ],
  qa: [
    {
      q: "Why can't you just index latitude and longitude and query a bounding box?",
      a: "Because two independent 1-D B-tree indexes don't capture 2-D locality. The database can use one index to narrow one dimension, but then scans a wide strip to filter the other — it can't jump straight to a small 2-D region. You need a geospatial index (geohash or quadtree) where points near each other on the map are near each other in the index, turning a 2-D range query into an efficient prefix/tree lookup.",
      tip: "The crisp version: 'two 1-D indexes can't do an efficient 2-D range query — you need locality-preserving geospatial indexing.'",
    },
    {
      q: "How does geohash make 'find nearby' fast?",
      a: "Geohash encodes a coordinate into a string by recursively dividing the globe into a grid; nearby points share a common prefix. So 'nearby' becomes a prefix match on an ordinary string/key index — cheap and shardable. You choose the geohash length to match the desired radius (longer = smaller cells). To avoid missing points just across a boundary, you also query the 8 neighboring cells and then compute exact distances.",
      tip: "Prefix-sharing + 'also check the 8 neighbor cells' is the complete geohash answer.",
    },
    {
      q: "Geohash vs quadtree — when would you choose each?",
      a: "Geohash is a fixed grid encoded as a string — simple to store and index in a normal database, shards by prefix, and is easy to cache; but a fixed grid wastes resolution in sparse areas and can be coarse in dense ones. A quadtree adapts to density by subdividing only where there are many points, giving balanced leaves — great for very uneven distributions (dense cities, empty countryside), but it's typically an in-memory structure you must build and maintain. Choose geohash for DB-backed simplicity, quadtree for adaptive density in memory.",
      tip: "Fixed-grid-in-a-DB (geohash) vs adaptive-tree-in-memory (quadtree) is the trade-off axis.",
    },
    {
      q: "How do you handle the boundary case where the nearest place is in an adjacent cell?",
      a: "Never trust a single cell. Compute the user's cell, then also gather candidates from its neighboring cells (the 8 around it for a grid). Union the candidates, compute the true geodesic distance to each, and filter by the actual radius and sort. The cell index is a coarse filter to shrink the candidate set; exact distance math does the final, correct ranking.",
      tip: "'Cell index = coarse candidate filter; exact distance = final ranking' prevents the classic boundary bug.",
    },
  ],
  related: [
    "how-do-i-decide-between-sql-nosql-and-search-engines",
    "how-should-i-index-for-read-heavy-vs-write-heavy-workloads",
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-shard-data-by-user-tenant-region-or-something-else",
  ],
};
