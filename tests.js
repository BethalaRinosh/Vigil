/* Vigil - runnable Node.js tests for the pure Banker's Algorithm module.
 * Run: node tests.js
 */
"use strict";

const assert = require("node:assert/strict");
const banker = require("./banker.js");

const textbook = {
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
  ],
  maximum: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
  ],
  available: [3, 3, 2]
};

const unsafe = {
  allocation: [[1, 0], [0, 1], [1, 1]],
  maximum: [[2, 1], [1, 2], [2, 2]],
  available: [0, 0]
};

function test(name, fn) {
  try {
    fn();
    console.log("✓ " + name);
  } catch (error) {
    console.error("✗ " + name);
    throw error;
  }
}

test("textbook Need matrix is computed correctly", () => {
  assert.deepEqual(banker.calculateNeed(textbook.allocation, textbook.maximum), [
    [7, 4, 3], [1, 2, 2], [6, 0, 0], [0, 1, 1], [4, 3, 1]
  ]);
});

test("textbook state is safe with expected sequence P1, P3, P4, P0, P2", () => {
  const result = banker.safetyCheck(textbook);
  assert.equal(result.safe, true);
  assert.deepEqual(result.safeSequence, [1, 3, 4, 0, 2]);
});

test("textbook request P1 requests (1,0,2) and is granted", () => {
  const result = banker.requestResources(textbook, 1, [1, 0, 2]);
  assert.equal(result.status, "GRANTED");
  assert.equal(result.granted, true);
  assert.deepEqual(result.state.available, [2, 3, 0]);
  assert.deepEqual(result.safety.safeSequence, [1, 3, 4, 0, 2]);
});

test("textbook follow-up P0 requests (0,2,0) and is denied as unsafe", () => {
  const afterFirst = banker.requestResources(textbook, 1, [1, 0, 2]);
  assert.equal(afterFirst.status, "GRANTED");
  const result = banker.requestResources(afterFirst.state, 0, [0, 2, 0]);
  assert.equal(result.status, "DENIED");
  assert.match(result.reason, /unsafe state/i);
  assert.equal(result.safety.safe, false);
});

test("unsafe example is rejected and names the stuck processes", () => {
  const result = banker.safetyCheck(unsafe);
  assert.equal(result.safe, false);
  assert.equal(result.safeSequence, null);
  assert.deepEqual(result.stuckProcesses, [0, 1, 2]);
});

test("requests beyond remaining Need are denied without mutating input", () => {
  const before = banker.cloneState(textbook);
  const result = banker.requestResources(textbook, 0, [8, 0, 0]);
  assert.equal(result.status, "DENIED");
  assert.match(result.reason, /Need/i);
  assert.deepEqual(textbook, before);
});

test("requests beyond Available must wait", () => {
  const result = banker.requestResources(textbook, 0, [0, 4, 0]);
  assert.equal(result.status, "MUST WAIT");
});

test("resource release updates Allocation and Available without mutating input", () => {
  const result = banker.releaseResources(textbook, 0, [0, 1, 0]);
  assert.deepEqual(result.state.allocation[0], [0, 0, 0]);
  assert.deepEqual(result.state.available, [3, 4, 2]);
  assert.deepEqual(textbook.available, [3, 3, 2]);
});

test("invalid dimensions, negative values, and allocation above maximum are rejected", () => {
  assert.throws(() => banker.safetyCheck({ allocation: [[0]], maximum: [[0, 1]], available: [1] }), /maximum|rows|length/i);
  assert.throws(() => banker.safetyCheck({ allocation: [[-1]], maximum: [[1]], available: [1] }), /non-negative/i);
  assert.throws(() => banker.safetyCheck({ allocation: [[2]], maximum: [[1]], available: [0] }), /exceeds/i);
});

console.log("\nVigil algorithm tests passed.");
