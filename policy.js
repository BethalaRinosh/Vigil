/* Vigil - deterministic policy comparison workload.
 * Compares Banker's safety-aware request policy with a naive policy that grants
 * a valid request whenever its resources are currently Available, without a
 * post-grant safety check. A seeded workload makes comparisons reproducible.
 */
"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.VigilPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function seededRandom(seed) {
    let state = (Number.isFinite(seed) ? Math.trunc(seed) : 42) >>> 0;
    return function next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateWorkload(state, banker, trials = 100, seed = 42) {
    banker.validateState(state);
    if (!Number.isInteger(trials) || trials < 1 || trials > 1000) {
      throw new RangeError("Trial count must be an integer between 1 and 1,000.");
    }
    if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
      throw new RangeError("Seed must be an integer from 0 to 2,147,483,647.");
    }
    const random = seededRandom(seed);
    const initialNeed = banker.calculateNeed(state.allocation, state.maximum);
    return Array.from({ length: trials }, (_, index) => {
      const processIndex = Math.floor(random() * state.allocation.length);
      const request = initialNeed[processIndex].map((need) => Math.floor(random() * (need + 1)));
      // Avoid uninformative all-zero vectors whenever the process has any Need.
      if (request.every((value) => value === 0)) {
        const eligible = initialNeed[processIndex].map((value, r) => value > 0 ? r : -1).filter((r) => r >= 0);
        if (eligible.length) request[eligible[Math.floor(random() * eligible.length)]] = 1;
      }
      return { trial: index + 1, processIndex, request };
    });
  }

  function summarizePolicy(name, initialState, workload, banker, mode) {
    let state = banker.cloneState(initialState);
    const initialSafety = banker.safetyCheck(state);
    let previousSafe = initialSafety.safe;
    const summary = {
      name,
      initialSafe: initialSafety.safe,
      grants: 0,
      waits: 0,
      deniedNeed: 0,
      deniedUnsafe: 0,
      unsafeGrants: 0,
      unsafeTransitions: 0,
      unsafeRounds: 0,
      finalSafe: initialSafety.safe,
      finalState: banker.cloneState(state),
      outcomes: []
    };

    workload.forEach((item) => {
      const beforeSafe = banker.safetyCheck(state).safe;
      const need = banker.calculateNeed(state.allocation, state.maximum);
      let status;
      let reason;
      let granted = false;
      if (item.request.some((value, r) => value > need[item.processIndex][r])) {
        status = "DENIED NEED";
        reason = "Request exceeds remaining Need.";
        summary.deniedNeed += 1;
      } else if (item.request.some((value, r) => value > state.available[r])) {
        status = "MUST WAIT";
        reason = "Request exceeds currently Available resources.";
        summary.waits += 1;
      } else if (mode === "banker") {
        const result = banker.requestResources(state, item.processIndex, item.request);
        status = result.status;
        reason = result.reason;
        if (result.granted) {
          state = result.state;
          granted = true;
          summary.grants += 1;
        } else if (result.status === "MUST WAIT") {
          summary.waits += 1;
        } else if (/unsafe state/i.test(result.reason)) {
          summary.deniedUnsafe += 1;
        } else {
          summary.deniedNeed += 1;
        }
      } else {
        const next = banker.cloneState(state);
        item.request.forEach((value, r) => {
          next.available[r] -= value;
          next.allocation[item.processIndex][r] += value;
        });
        state = next;
        granted = true;
        status = "GRANTED";
        reason = "Available resources were sufficient; no post-grant safety check was applied.";
        summary.grants += 1;
      }

      const safety = banker.safetyCheck(state);
      const isUnsafe = !safety.safe;
      if (granted && isUnsafe) summary.unsafeGrants += 1;
      if (beforeSafe && isUnsafe) summary.unsafeTransitions += 1;
      if (isUnsafe) summary.unsafeRounds += 1;
      previousSafe = safety.safe;
      summary.outcomes.push({
        trial: item.trial,
        processIndex: item.processIndex,
        request: item.request.slice(),
        status,
        reason,
        granted,
        safeAfter: safety.safe,
        unsafeTransition: beforeSafe && isUnsafe
      });
    });
    summary.finalState = banker.cloneState(state);
    summary.finalSafe = banker.safetyCheck(state).safe;
    return summary;
  }

  function comparePolicies(state, banker, options = {}) {
    const trials = options.trials === undefined ? 100 : options.trials;
    const seed = options.seed === undefined ? 42 : options.seed;
    const workload = generateWorkload(state, banker, trials, seed);
    const bank = summarizePolicy("Banker's Algorithm", state, workload, banker, "banker");
    const naive = summarizePolicy("Naive: grant if available", state, workload, banker, "naive");
    return {
      seed,
      trialCount: trials,
      workload,
      initialSafe: banker.safetyCheck(state).safe,
      banker: bank,
      naive,
      unsafeStateDifference: naive.unsafeRounds - bank.unsafeRounds,
      unsafeGrantDifference: naive.unsafeGrants - bank.unsafeGrants
    };
  }

  return { generateWorkload, comparePolicies };
});
