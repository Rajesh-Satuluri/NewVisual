// Integrity tests for the canonical networks. Run: node --test sim/networks.test.mjs
// SCAFFOLD: asserts the shape contract every preset must honour, so the engine
// and Playground can depend on it. Quantity/lead-time assertions are added in
// Iteration 1 once the presets carry real CATMPN-derived rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import NETWORKS, { DISTRIBUTION, MANUFACTURING, PROCUREMENT } from "./networks.js";

const ALL = [DISTRIBUTION, MANUFACTURING, PROCUREMENT];

test("registry exposes the three canonical presets by id", () => {
  assert.deepEqual(Object.keys(NETWORKS).sort(), ["distribution", "manufacturing", "procurement"]);
});

test("every preset honours the network shape contract", () => {
  for (const net of ALL) {
    assert.equal(typeof net.id, "string");
    assert.equal(typeof net.title, "string");
    for (const k of ["nodes", "lanes", "demands", "calendar"]) {
      assert.ok(Array.isArray(net[k]), net.id + "." + k + " is an array");
    }
    assert.equal(typeof net.config, "object");
  }
});

test("preset ids match their registry keys", () => {
  for (const [key, net] of Object.entries(NETWORKS)) assert.equal(net.id, key);
});
