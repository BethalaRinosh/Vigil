/* Vigil - pure Banker's Algorithm logic.
 * No DOM access: every operation validates inputs and returns a fresh result.
 * Matrices are process-major arrays; vectors are resource-major arrays.
 */
"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.VigilBanker = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const isInteger = (value) => Number.isInteger(value);
  const cloneMatrix = (matrix) => matrix.map((row) => row.slice());
  const cloneVector = (vector) => vector.slice();

  function assertVector(vector, name, length) {
    if (!Array.isArray(vector) || vector.length !== length ||
        vector.some((value) => !isInteger(value) || value < 0)) {
      throw new TypeError(name + " must be an array of " + length + " non-negative integers.");
    }
  }

  function assertMatrix(matrix, name, rows, cols) {
    if (!Array.isArray(matrix) || matrix.length !== rows) {
      throw new TypeError(name + " must contain exactly " + rows + " process rows.");
    }
    matrix.forEach((row, index) => assertVector(row, name + "[" + index + "]", cols));
  }

  function validateState(state) {
    if (!state || typeof state !== "object") throw new TypeError("State must be an object.");
    const { allocation, maximum, available } = state;
    if (!Array.isArray(allocation) || allocation.length < 1) {
      throw new TypeError("At least one process is required.");
    }
    const processCount = allocation.length;
    if (!Array.isArray(available) || available.length < 1) {
      throw new TypeError("At least one resource type is required.");
    }
    const resourceCount = available.length;
    assertMatrix(allocation, "allocation", processCount, resourceCount);
    assertMatrix(maximum, "maximum", processCount, resourceCount);
    assertVector(available, "available", resourceCount);
    for (let p = 0; p < processCount; p += 1) {
      for (let r = 0; r < resourceCount; r += 1) {
        if (allocation[p][r] > maximum[p][r]) {
          throw new RangeError("Allocation for P" + p + ", R" + r + " exceeds its declared maximum.");
        }
      }
    }
    return { processCount, resourceCount };
  }

  // Need[i][j] = Maximum[i][j] - Allocation[i][j].
  function calculateNeed(allocation, maximum) {
    if (!Array.isArray(allocation) || !Array.isArray(maximum) || allocation.length !== maximum.length) {
      throw new TypeError("Allocation and maximum matrices must have the same number of rows.");
    }
    if (allocation.length === 0) return [];
    const cols = Array.isArray(allocation[0]) ? allocation[0].length : -1;
    assertMatrix(allocation, "allocation", allocation.length, cols);
    assertMatrix(maximum, "maximum", allocation.length, cols);
    return maximum.map((row, p) => row.map((maxValue, r) => {
      if (maxValue < allocation[p][r]) {
        throw new RangeError("Maximum claim cannot be less than allocation for P" + p + ", R" + r + ".");
      }
      return maxValue - allocation[p][r];
    }));
  }

  // Textbook safety algorithm: find an unfinished process whose Need <= Work,
  // assume it finishes, release its allocation into Work, and repeat.
  function safetyCheck(state) {
    const { processCount, resourceCount } = validateState(state);
    const need = calculateNeed(state.allocation, state.maximum);
    const work = cloneVector(state.available);
    const finish = Array(processCount).fill(false);
    const sequence = [];
    const trace = [{ completedProcess: null, work: cloneVector(work), finish: cloneVector(finish), message: "Initial Work is Available." }];

    let scanStart = 0;
    while (sequence.length < processCount) {
      let selected = -1;
      // Scan circularly from the process after the last completion. The safety
      // proof permits any eligible process; this deterministic scan produces
      // the sequence specified for Vigil's textbook demonstration.
      for (let offset = 0; offset < processCount; offset += 1) {
        const p = (scanStart + offset) % processCount;
        if (!finish[p] && need[p].every((needed, r) => needed <= work[r])) {
          selected = p;
          break;
        }
      }
      if (selected === -1) break;
      for (let r = 0; r < resourceCount; r += 1) work[r] += state.allocation[selected][r];
      finish[selected] = true;
      sequence.push(selected);
      scanStart = (selected + 1) % processCount;
      trace.push({
        completedProcess: selected,
        work: cloneVector(work),
        finish: cloneVector(finish),
        message: "P" + selected + " can finish; release its allocation into Work."
      });
    }

    const stuckProcesses = finish.map((done, p) => done ? -1 : p).filter((p) => p >= 0);
    return {
      safe: stuckProcesses.length === 0,
      safeSequence: stuckProcesses.length === 0 ? sequence : null,
      partialSequence: sequence,
      stuckProcesses,
      need,
      finalWork: work,
      finish,
      trace
    };
  }

  function normalizeRequest(state, processIndex, request) {
    const { processCount, resourceCount } = validateState(state);
    if (!isInteger(processIndex) || processIndex < 0 || processIndex >= processCount) {
      throw new RangeError("Select a valid process.");
    }
    assertVector(request, "request", resourceCount);
    return { processCount, resourceCount };
  }

  // Resource-Request algorithm: check Need first, Available second, then tentatively
  // allocate and run the safety algorithm. Caller state is never mutated.
  function requestResources(state, processIndex, request) {
    const { resourceCount } = normalizeRequest(state, processIndex, request);
    const need = calculateNeed(state.allocation, state.maximum);
    for (let r = 0; r < resourceCount; r += 1) {
      if (request[r] > need[processIndex][r]) {
        return {
          status: "DENIED",
          reason: "Request exceeds the remaining declared Need for P" + processIndex + ".",
          granted: false,
          state: cloneState(state),
          safety: safetyCheck(state)
        };
      }
    }
    for (let r = 0; r < resourceCount; r += 1) {
      if (request[r] > state.available[r]) {
        return {
          status: "MUST WAIT",
          reason: "Request exceeds currently Available resources; P" + processIndex + " must wait.",
          granted: false,
          state: cloneState(state),
          safety: safetyCheck(state)
        };
      }
    }

    const candidate = cloneState(state);
    for (let r = 0; r < resourceCount; r += 1) {
      candidate.available[r] -= request[r];
      candidate.allocation[processIndex][r] += request[r];
    }
    const safety = safetyCheck(candidate);
    if (!safety.safe) {
      return {
        status: "DENIED",
        reason: "Granting this request would leave the system in an unsafe state.",
        granted: false,
        state: cloneState(state),
        safety
      };
    }
    return {
      status: "GRANTED",
      reason: "Request is within Need and Available, and the tentative state is safe.",
      granted: true,
      state: candidate,
      safety
    };
  }

  function cloneState(state) {
    return {
      allocation: cloneMatrix(state.allocation),
      maximum: cloneMatrix(state.maximum),
      available: cloneVector(state.available)
    };
  }

  // Release allocated instances back to Available. A release cannot exceed
  // the process's current Allocation. This operation preserves caller state.
  function releaseResources(state, processIndex, release) {
    const { processCount, resourceCount } = validateState(state);
    if (!isInteger(processIndex) || processIndex < 0 || processIndex >= processCount) {
      throw new RangeError("Select a valid process.");
    }
    assertVector(release, "release", resourceCount);
    for (let r = 0; r < resourceCount; r += 1) {
      if (release[r] > state.allocation[processIndex][r]) {
        throw new RangeError("Cannot release more of R" + r + " than P" + processIndex + " currently holds.");
      }
    }
    const next = cloneState(state);
    for (let r = 0; r < resourceCount; r += 1) {
      next.allocation[processIndex][r] -= release[r];
      next.available[r] += release[r];
    }
    return { state: next, need: calculateNeed(next.allocation, next.maximum), safety: safetyCheck(next) };
  }

  return { calculateNeed, safetyCheck, requestResources, releaseResources, validateState, cloneState };
});