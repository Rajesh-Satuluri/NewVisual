/* ============================================================
   bplustree.mjs — B+Tree index kernel.

   A pure, deterministic B+Tree supporting search, range scan, insert
   (with leaf/internal splits) and delete (with borrow + merge
   rebalancing). The tree is stored as nested plain objects so state
   stays JSON-serialisable (no parent pointers / cycles); leaf order and
   the leaf "chain" are derived by in-order traversal.

   Order parameter: `order` = max keys per node (MAX). A node overflows at
   MAX+1 keys and splits; a non-root node underflows below
   MIN = floor(order/2) and borrows or merges. B+Tree convention: keys
   live in the leaves; internal separators route searches, and the
   separator equals the smallest key of the right subtree.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

export function bplustreeSpec(config) {
  const cfg = Object.assign({ order: 3 }, config || {});
  if (!(cfg.order >= 2)) throw new Error("bplustree: order must be ≥ 2");

  return {
    config: cfg,
    init(c) {
      return {
        order: c.order,
        root: null,          // null | node; node = { leaf, keys:[], children?:[node] }
        inserted: [],        // multiset guard: the keys we believe are present (sorted unique)
        lastOp: null,        // { kind, ... } for the renderer
      };
    },
    apply(s, op) { applyOp(s, op); },
    legal(s) { return legalOps(s); },
    invariants(s) { return treeInvariants(s); },
    metrics(s) { return treeMetrics(s); },
  };
}

export function createBPlusTree(config) {
  return createKernel(bplustreeSpec(config));
}

/* ── ops ────────────────────────────────────────────────────────────────── */
function applyOp(s, op) {
  switch (op.type) {
    case "insert": return opInsert(s, op);
    case "delete": return opDelete(s, op);
    case "search": return opSearch(s, op);
    case "range":  return opRange(s, op);
    default: throw new Error("bplustree: unknown op `" + op.type + "`");
  }
}

const MAX = (s) => s.order;
const MIN = (s) => Math.floor(s.order / 2);

function childIndex(node, key) {
  let i = 0;
  while (i < node.keys.length && key >= node.keys[i]) i++;
  return i;
}

function opInsert(s, op) {
  const key = op.key;
  if (typeof key !== "number") throw new Error("insert: key must be a number");
  if (s.inserted.indexOf(key) !== -1) { s.lastOp = { kind: "insert", key: key, dup: true }; return; }

  if (!s.root) { s.root = { leaf: true, keys: [key] }; }
  else {
    const split = insertInto(s, s.root, key);
    if (split) s.root = { leaf: false, keys: [split.sep], children: [s.root, split.right] };
  }
  s.inserted.push(key); s.inserted.sort((a, b) => a - b);
  s.lastOp = { kind: "insert", key: key };
}

function insertInto(s, node, key) {
  if (node.leaf) {
    let i = 0; while (i < node.keys.length && node.keys[i] < key) i++;
    node.keys.splice(i, 0, key);
    if (node.keys.length <= MAX(s)) return null;
    const mid = Math.floor(node.keys.length / 2);
    const right = { leaf: true, keys: node.keys.slice(mid) };
    node.keys = node.keys.slice(0, mid);
    return { sep: right.keys[0], right: right };     // copy-up
  }
  const i = childIndex(node, key);
  const split = insertInto(s, node.children[i], key);
  if (!split) return null;
  node.keys.splice(i, 0, split.sep);
  node.children.splice(i + 1, 0, split.right);
  if (node.keys.length <= MAX(s)) return null;
  const mid = Math.floor(node.keys.length / 2);
  const promote = node.keys[mid];
  const right = { leaf: false, keys: node.keys.slice(mid + 1), children: node.children.slice(mid + 1) };
  node.keys = node.keys.slice(0, mid);
  node.children = node.children.slice(0, mid + 1);
  return { sep: promote, right: right };             // push-up
}

function opDelete(s, op) {
  const key = op.key;
  if (s.inserted.indexOf(key) === -1) { s.lastOp = { kind: "delete", key: key, absent: true }; return; }
  deleteFrom(s, s.root, key);
  if (s.root && !s.root.leaf && s.root.children.length === 1) s.root = s.root.children[0]; // shrink
  if (s.root && s.root.leaf && s.root.keys.length === 0) s.root = null;
  s.inserted.splice(s.inserted.indexOf(key), 1);
  s.lastOp = { kind: "delete", key: key };
}

function deleteFrom(s, node, key) {
  if (node.leaf) {
    const i = node.keys.indexOf(key);
    if (i !== -1) node.keys.splice(i, 1);
    return;
  }
  const i = childIndex(node, key);
  deleteFrom(s, node.children[i], key);
  if (node.children[i].keys.length < MIN(s)) rebalance(s, node, i);
}

function rebalance(s, node, i) {
  const child = node.children[i];
  const left = i > 0 ? node.children[i - 1] : null;
  const right = i < node.children.length - 1 ? node.children[i + 1] : null;

  if (child.leaf) {
    if (left && left.keys.length > MIN(s)) {              // borrow from left leaf
      child.keys.unshift(left.keys.pop());
      node.keys[i - 1] = child.keys[0];
    } else if (right && right.keys.length > MIN(s)) {      // borrow from right leaf
      child.keys.push(right.keys.shift());
      node.keys[i] = right.keys[0];
    } else if (left) {                                     // merge into left
      left.keys = left.keys.concat(child.keys);
      node.keys.splice(i - 1, 1); node.children.splice(i, 1);
    } else {                                               // merge right into child
      child.keys = child.keys.concat(right.keys);
      node.keys.splice(i, 1); node.children.splice(i + 1, 1);
    }
    return;
  }
  // internal child
  if (left && left.keys.length > MIN(s)) {                 // rotate right through separator
    child.keys.unshift(node.keys[i - 1]);
    node.keys[i - 1] = left.keys.pop();
    child.children.unshift(left.children.pop());
  } else if (right && right.keys.length > MIN(s)) {         // rotate left through separator
    child.keys.push(node.keys[i]);
    node.keys[i] = right.keys.shift();
    child.children.push(right.children.shift());
  } else if (left) {                                        // merge into left with separator
    left.keys = left.keys.concat([node.keys[i - 1]], child.keys);
    left.children = left.children.concat(child.children);
    node.keys.splice(i - 1, 1); node.children.splice(i, 1);
  } else {                                                  // merge right into child with separator
    child.keys = child.keys.concat([node.keys[i]], right.keys);
    child.children = child.children.concat(right.children);
    node.keys.splice(i, 1); node.children.splice(i + 1, 1);
  }
}

function opSearch(s, op) {
  const key = op.key; const path = [];
  let node = s.root, found = false;
  while (node) {
    if (node.leaf) { found = node.keys.indexOf(key) !== -1; path.push({ keys: node.keys.slice(), leaf: true }); break; }
    const i = childIndex(node, key);
    path.push({ keys: node.keys.slice(), leaf: false, took: i });
    node = node.children[i];
  }
  s.lastOp = { kind: "search", key: key, found: found, path: path, comparisons: path.length };
}

function opRange(s, op) {
  const lo = op.lo, hi = op.hi;
  if (typeof lo !== "number" || typeof hi !== "number") throw new Error("range: lo and hi must be numbers");
  const leaves = collectLeaves(s.root);
  const keys = [];
  let leavesVisited = 0, started = false;
  for (const lf of leaves) {
    const any = lf.keys.some((k) => k >= lo && k <= hi);
    if (any || (started && lf.keys.some((k) => k <= hi))) leavesVisited++;
    else if (!started) { if (lf.keys.some((k) => k >= lo)) leavesVisited++; }
    lf.keys.forEach((k) => { if (k >= lo && k <= hi) { keys.push(k); started = true; } });
  }
  s.lastOp = { kind: "range", lo: lo, hi: hi, keys: keys, leavesVisited: Math.max(leavesVisited, keys.length ? 1 : 0) };
}

/* ── introspection ──────────────────────────────────────────────────────── */
function collectLeaves(node, acc) {
  acc = acc || [];
  if (!node) return acc;
  if (node.leaf) acc.push(node);
  else node.children.forEach((c) => collectLeaves(c, acc));
  return acc;
}
function leafKeys(s) {
  const out = [];
  collectLeaves(s.root).forEach((lf) => lf.keys.forEach((k) => out.push(k)));
  return out;
}
function height(node) { return !node ? 0 : node.leaf ? 1 : 1 + height(node.children[0]); }
function countNodes(node) { return !node ? 0 : node.leaf ? 1 : 1 + node.children.reduce((a, c) => a + countNodes(c), 0); }

function legalOps(s) {
  const present = s.inserted.slice();
  const next = (present.length ? Math.max.apply(null, present) : 0) + 1;
  const ops = [{ type: "insert", key: next }];
  present.slice(0, 4).forEach((k) => ops.push({ type: "search", key: k }, { type: "delete", key: k }));
  return ops;
}

function treeInvariants(s) {
  const checks = [];
  const leaves = leafKeys(s);
  // balance: every leaf at the same depth
  let depths = [];
  (function depth(node, d) {
    if (!node) return;
    if (node.leaf) depths.push(d);
    else node.children.forEach((c) => depth(c, d + 1));
  })(s.root, 1);
  const balanced = depths.length === 0 || depths.every((d) => d === depths[0]);
  checks.push({ name: "balanced", ok: balanced, detail: balanced ? "all leaves at equal depth" : "leaf depths differ: " + depths.join(",") });

  // sorted leaves == inserted set
  let sorted = true;
  for (let i = 1; i < leaves.length; i++) if (leaves[i] <= leaves[i - 1]) sorted = false;
  const matchesSet = JSON.stringify(leaves) === JSON.stringify(s.inserted);
  checks.push({ name: "sorted-unique", ok: sorted, detail: sorted ? "leaf scan is strictly ascending" : "leaf order broken" });
  checks.push({ name: "key-set", ok: matchesSet, detail: matchesSet ? leaves.length + " keys match the insert set" : "leaf keys ≠ tracked set" });

  // structure: children count, occupancy, separator bounds.
  // Bounds are [lo inclusive, hi exclusive); null = unbounded. B+Tree routes
  // key >= separator to the right child, so child i spans [keys[i-1], keys[i]).
  let structOk = true, occOk = true, sepOk = true;
  (function walk(node, isRoot, lo, hi) {
    if (!node) return;
    node.keys.forEach((k) => {
      if (lo !== null && k < lo) sepOk = false;
      if (hi !== null && k >= hi) sepOk = false;
    });
    if (node.keys.length < 1 && !(isRoot)) occOk = false;
    if (!isRoot && (node.keys.length < MIN(s) || node.keys.length > MAX(s))) occOk = false;
    if (isRoot && node.keys.length > MAX(s)) occOk = false;
    if (!node.leaf) {
      if (node.children.length !== node.keys.length + 1) structOk = false;
      for (let i = 0; i < node.children.length; i++) {
        const clo = i === 0 ? lo : node.keys[i - 1];
        const chi = i === node.keys.length ? hi : node.keys[i];
        walk(node.children[i], false, clo, chi);
      }
    }
  })(s.root, true, null, null);
  checks.push({ name: "node-shape", ok: structOk, detail: structOk ? "internal nodes have keys+1 children" : "child-count mismatch" });
  checks.push({ name: "occupancy", ok: occOk, detail: "non-root keys in [" + MIN(s) + "," + MAX(s) + "]" });
  checks.push({ name: "separators", ok: sepOk, detail: sepOk ? "separators bound every subtree" : "separator ordering broken" });
  return checks;
}

function treeMetrics(s) {
  const nodes = countNodes(s.root);
  const leaves = collectLeaves(s.root).length;
  const keys = s.inserted.length;
  return {
    height: height(s.root), nodes: nodes, leaves: leaves, keys: keys,
    fill: nodes ? keys / (nodes * MAX(s)) : 0,
  };
}

/** Oracle for tests: the sorted set of keys that should be reachable. */
export function sortedKeys(kernelOrState) {
  const s = kernelOrState.state || kernelOrState;
  return leafKeys(s);
}
