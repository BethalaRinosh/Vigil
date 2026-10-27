/* Vigil - runnable Node.js tests for the pure Banker's Algorithm module.
 * Run: node tests.js
 */
"use strict";

const assert = require("node:assert/strict");
const banker = require("./banker.js");
const risk = require("./risk.js");
const policy = require("./policy.js");
const scenarioIO = require("./scenario-io.js");

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


test("safety trace begins with Available Work and all Finish flags false", () => {
  const result = banker.safetyCheck(textbook);
  assert.equal(result.trace[0].completedProcess, null);
  assert.deepEqual(result.trace[0].work, textbook.available);
  assert.deepEqual(result.trace[0].finish, [false, false, false, false, false]);
  assert.equal(result.trace.length, textbook.allocation.length + 1);
  assert.deepEqual(result.trace.at(-1).finish, [true, true, true, true, true]);
});

test("unsafe safety trace preserves its partial completion proof", () => {
  const result = banker.safetyCheck(unsafe);
  assert.equal(result.trace[0].completedProcess, null);
  assert.equal(result.trace.at(-1).finish.every(Boolean), false);
  assert.deepEqual(result.trace.at(-1).work, result.finalWork);
  assert.deepEqual(result.stuckProcesses, [0, 1, 2]);
});


test("unsafe tentative grant is denied without mutating the live state", () => {
  const afterFirst = banker.requestResources(textbook, 1, [1, 0, 2]).state;
  const before = banker.cloneState(afterFirst);
  const result = banker.requestResources(afterFirst, 0, [0, 2, 0]);
  assert.equal(result.status, "DENIED");
  assert.equal(result.granted, false);
  assert.deepEqual(result.state, before);
  assert.deepEqual(afterFirst, before);
});

test("request that must wait leaves allocation and Available unchanged", () => {
  const before = banker.cloneState(textbook);
  const result = banker.requestResources(textbook, 0, [0, 4, 0]);
  assert.equal(result.status, "MUST WAIT");
  assert.deepEqual(result.state, before);
  assert.deepEqual(textbook, before);
});

test("release beyond current Allocation is rejected", () => {
  assert.throws(() => banker.releaseResources(textbook, 0, [1, 0, 0]), /Cannot release more/i);
});


test("heuristic risk assessment is bounded and reports distinct safe sequences", () => {
  const result = risk.assess(textbook, banker);
  assert.equal(result.safe, true);
  assert.ok(result.systemScore >= 0 && result.systemScore <= 100);
  assert.ok(result.utilizationPercent >= 0 && result.utilizationPercent <= 100);
  assert.ok(result.distinctSafeSequenceCount >= 1);
  assert.equal(result.processScores.length, textbook.allocation.length);
  assert.ok(result.processScores.every((item) => item.score >= 0 && item.score <= 100));
  assert.equal(result.systemLevel, "High");
});

test("unsafe state is always Critical and has no complete safe sequence", () => {
  const result = risk.assess(unsafe, banker);
  assert.equal(result.safe, false);
  assert.equal(result.systemLevel, "Critical");
  assert.equal(result.distinctSafeSequenceCount, 0);
  assert.ok(result.minimumSlack < 0);
  assert.ok(result.processScores.some((item) => item.level === "Critical"));
});

test("safe-sequence enumeration obeys its cap", () => {
  const result = risk.enumerateSafeSequences(textbook, banker, 1);
  assert.equal(result.count, 1);
  assert.equal(result.capped, true);
});

test("what-if comparison grants a safe request without mutating input", () => {
  const before = banker.cloneState(textbook);
  const result = risk.compareWhatIf(textbook, 1, [1, 0, 2], banker);
  assert.equal(result.status, "GRANTED");
  assert.equal(result.stateChanged, true);
  assert.equal(result.before.safe, true);
  assert.equal(result.after.safe, true);
  assert.deepEqual(textbook, before);
});

test("what-if comparison keeps the same state for denied requests", () => {
  const afterFirst = banker.requestResources(textbook, 1, [1, 0, 2]).state;
  const before = banker.cloneState(afterFirst);
  const result = risk.compareWhatIf(afterFirst, 0, [0, 2, 0], banker);
  assert.equal(result.status, "DENIED");
  assert.equal(result.stateChanged, false);
  assert.equal(result.before.systemScore, result.after.systemScore);
  assert.deepEqual(afterFirst, before);
});


test("policy workload is deterministic for the same seed", () => {
  const first = policy.generateWorkload(textbook, banker, 25, 5);
  const second = policy.generateWorkload(textbook, banker, 25, 5);
  assert.deepEqual(first, second);
  assert.equal(first.length, 25);
  assert.ok(first.every((item) => item.request.length === textbook.available.length));
});

test("Banker's policy rejects unsafe grants while naive policy can enter an unsafe state", () => {
  const before = banker.cloneState(textbook);
  const result = policy.comparePolicies(textbook, banker, { trials: 100, seed: 5 });
  assert.equal(result.initialSafe, true);
  assert.ok(result.naive.unsafeGrants > 0);
  assert.ok(result.naive.unsafeTransitions > 0);
  assert.equal(result.banker.unsafeGrants, 0);
  assert.equal(result.banker.unsafeTransitions, 0);
  assert.equal(result.naive.outcomes.length, 100);
  assert.equal(result.banker.outcomes.length, 100);
  assert.deepEqual(textbook, before);
});

test("both policies receive the exact same ordered requests", () => {
  const result = policy.comparePolicies(textbook, banker, { trials: 40, seed: 123 });
  assert.deepEqual(result.banker.outcomes.map(({ processIndex, request }) => ({ processIndex, request })), result.naive.outcomes.map(({ processIndex, request }) => ({ processIndex, request })));
});

test("policy comparison rejects invalid trial counts and seeds", () => {
  assert.throws(() => policy.comparePolicies(textbook, banker, { trials: 0, seed: 1 }), /Trial count/i);
  assert.throws(() => policy.comparePolicies(textbook, banker, { trials: 10, seed: -1 }), /Seed/i);
});

test("scenario JSON round-trips the textbook scenario", () => {
  const source = { ...textbook, processNames: ["P0", "P1", "P2", "P3", "P4"], resourceNames: ["A", "B", "C"] };
  const json = scenarioIO.stringifyScenario(source);
  const parsed = scenarioIO.parseScenario(json);
  assert.deepEqual(parsed, source);
  assert.equal(JSON.parse(json).format, "vigil-scenario");
  assert.equal(JSON.parse(json).version, 1);
});
test("scenario JSON rejects invalid format and unsupported versions", () => {
  assert.throws(() => scenarioIO.parseScenario({ format: "other", version: 1, scenario: {} }), /format/i);
  assert.throws(() => scenarioIO.parseScenario({ format: "vigil-scenario", version: 99, scenario: {} }), /version/i);
});
console.log("\nVigil algorithm, risk, and policy tests passed.");
