/* Vigil heuristic risk analysis. Transparent heuristics, not machine learning. */
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.VigilRisk = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_CAP = 1000;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const round = (value, places = 1) => Number(value.toFixed(places));

  function enumerateSafeSequences(state, banker, cap = DEFAULT_CAP) {
    if (!Number.isInteger(cap) || cap < 1) throw new RangeError("Sequence cap must be a positive integer.");
    banker.validateState(state);
    const need = banker.calculateNeed(state.allocation, state.maximum);
    const n = state.allocation.length;
    const m = state.available.length;
    const sequences = [];
    let capped = false;
    function visit(work, finished, sequence) {
      if (sequence.length === n) {
        if (sequences.length >= cap) {
          capped = true;
          return;
        }
        sequences.push(sequence.slice());
        return;
      }
      if (capped) return;
      for (let p = 0; p < n; p += 1) {
        if (finished[p] || !need[p].every((value, r) => value <= work[r])) continue;
        const nextWork = work.slice();
        for (let r = 0; r < m; r += 1) nextWork[r] += state.allocation[p][r];
        finished[p] = true;
        sequence.push(p);
        visit(nextWork, finished, sequence);
        sequence.pop();
        finished[p] = false;
        if (capped) return;
      }
    }
    visit(state.available.slice(), Array(n).fill(false), []);
    return { sequences, count: sequences.length, capped, cap };
  }

  function assess(state, banker, cap = DEFAULT_CAP) {
    banker.validateState(state);
    const safety = banker.safetyCheck(state);
    const need = safety.need;
    const n = state.allocation.length;
    const m = state.available.length;
    const sequenceInfo = enumerateSafeSequences(state, banker, cap);
    const totalAllocated = state.allocation.reduce((sum, row) => sum + row.reduce((a, x) => a + x, 0), 0);
    const totalAvailable = state.available.reduce((sum, x) => sum + x, 0);
    const totalInstances = totalAllocated + totalAvailable;
    const utilization = totalInstances === 0 ? 0 : 100 * totalAllocated / totalInstances;

    let minimumSlack = Infinity;
    if (safety.safe) {
      let work = state.available.slice();
      const sequence = safety.safeSequence;
      for (const p of sequence) {
        for (let r = 0; r < m; r += 1) minimumSlack = Math.min(minimumSlack, work[r] - need[p][r]);
        for (let r = 0; r < m; r += 1) work[r] += state.allocation[p][r];
      }
    } else {
      const work = safety.finalWork;
      for (const p of safety.stuckProcesses) {
        const processSlack = Math.min(...need[p].map((value, r) => work[r] - value));
        minimumSlack = Math.min(minimumSlack, processSlack);
      }
      if (minimumSlack === Infinity) minimumSlack = -1;
    }
    if (minimumSlack === Infinity) minimumSlack = 0;

    const sequenceScarcity = sequenceInfo.count === 0 ? 100 : clamp(100 / Math.sqrt(sequenceInfo.count));
    const slackPressure = minimumSlack < 0 ? 100 : 100 / (1 + minimumSlack);
    const systemScore = round(clamp(0.35 * utilization + 0.35 * sequenceScarcity + 0.30 * slackPressure));
    const systemLevel = !safety.safe ? "Critical" : systemScore < 25 ? "Low" : systemScore < 50 ? "Medium" : systemScore < 75 ? "High" : "Critical";
    const processScores = state.allocation.map((allocation, p) => {
      const pressureByResource = need[p].map((value, r) => {
        if (value === 0) return 0;
        return value / (value + state.available[r]);
      });
      const needPressure = pressureByResource.reduce((sum, x) => sum + x, 0) / m * 100;
      const competed = need[p].reduce((count, value, r) => {
        if (value <= 0) return count;
        let others = 0;
        for (let other = 0; other < n; other += 1) {
          if (other !== p && (state.allocation[other][r] > 0 || need[other][r] > 0)) others += 1;
        }
        return count + others / Math.max(1, n - 1);
      }, 0) / m * 100;
      let position = safety.safe ? safety.safeSequence.indexOf(p) : safety.partialSequence.indexOf(p);
      const sequenceFragility = position < 0 ? 100 : n <= 1 ? 0 : position / (n - 1) * 100;
      const score = round(clamp(0.40 * needPressure + 0.35 * competed + 0.25 * sequenceFragility));
      const level = score < 25 ? "Low" : score < 50 ? "Medium" : score < 75 ? "High" : "Critical";
      return {
        processIndex: p, score, level,
        needPressure: round(needPressure),
        competition: round(clamp(competed)),
        sequenceFragility: round(sequenceFragility),
        sequencePosition: position < 0 ? null : position + 1
      };
    });

    let recommendation;
    if (!safety.safe) recommendation = "Do not grant additional requests without changing the resource state. The system is unsafe; inspect the blocked processes and consider releasing resources.";
    else if (systemLevel === "Critical" || systemLevel === "High") recommendation = "Prefer small, validated requests and release idle allocations promptly. Review the low-slack resources before granting more work.";
    else if (systemLevel === "Medium") recommendation = "Continue using the safety check for every tentative grant. Monitor heavily contested resources and avoid unnecessary long-lived allocations.";
    else recommendation = "Current heuristic pressure is relatively low. Keep validating each request with Banker's Algorithm; a low score is not a guarantee of future safety.";
    return {
      safe: safety.safe,
      systemScore,
      systemLevel,
      utilizationPercent: round(utilization),
      totalAllocated,
      totalAvailable,
      totalInstances,
      distinctSafeSequenceCount: sequenceInfo.count,
      sequenceCountCapped: sequenceInfo.capped,
      sequenceCap: cap,
      minimumSlack: round(minimumSlack),
      safeSequence: safety.safeSequence,
      partialSequence: safety.partialSequence,
      stuckProcesses: safety.stuckProcesses,
      processScores,
      recommendation
    };
  }

  function compareWhatIf(state, processIndex, request, banker, cap = DEFAULT_CAP) {
    const before = assess(state, banker, cap);
    const transaction = banker.requestResources(state, processIndex, request);
    const afterState = transaction.granted ? transaction.state : state;
    const after = assess(afterState, banker, cap);
    let recommendation;
    if (transaction.status === "GRANTED" && after.systemScore > before.systemScore + 5) {
      recommendation = "The request is safe, but it increases heuristic risk noticeably. Consider granting only what is needed now and reassessing competing requests.";
    } else if (transaction.status === "GRANTED") {
      recommendation = "The request passes Banker's safety test. Keep monitoring the updated risk indicators; heuristic scores are advisory.";
    } else if (transaction.status === "MUST WAIT") {
      recommendation = "Wait until enough instances become Available, then re-evaluate. The runtime state has not changed.";
    } else {
      recommendation = "Do not grant this request. " + transaction.reason + " The runtime state has not changed.";
    }
    return {
      status: transaction.status,
      reason: transaction.reason,
      granted: transaction.granted,
      before,
      after,
      recommendation,
      stateChanged: Boolean(transaction.granted)
    };
  }

  return { enumerateSafeSequences, assess, compareWhatIf, DEFAULT_CAP };
});
