/* Vigil - versioned scenario JSON import/export helpers. */
"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.VigilScenarioIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FORMAT = "vigil-scenario";
  const VERSION = 1;

  function validateScenario(scenario) {
    if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
      throw new TypeError("Scenario must be a JSON object.");
    }
    const { allocation, maximum, available, processNames, resourceNames } = scenario;
    if (!Array.isArray(allocation) || allocation.length < 1 || allocation.length > 10) {
      throw new RangeError("Scenario must contain 1 to 10 processes.");
    }
    if (!Array.isArray(available) || available.length < 1 || available.length > 6) {
      throw new RangeError("Scenario must contain 1 to 6 resource types.");
    }
    const n = allocation.length, m = available.length;
    if (!Array.isArray(maximum) || maximum.length !== n) {
      throw new TypeError("Maximum must have one row per process.");
    }
    if (!Array.isArray(processNames) || processNames.length !== n ||
        processNames.some((name) => typeof name !== "string" || !name.trim() || name.length > 40)) {
      throw new TypeError("processNames must contain one non-empty name (maximum 40 characters) per process.");
    }
    if (!Array.isArray(resourceNames) || resourceNames.length !== m ||
        resourceNames.some((name) => typeof name !== "string" || !name.trim() || name.length > 40)) {
      throw new TypeError("resourceNames must contain one non-empty name (maximum 40 characters) per resource type.");
    }
    function validateVector(vector, label) {
      if (!Array.isArray(vector) || vector.length !== m ||
          vector.some((value) => !Number.isInteger(value) || value < 0 || value > 1000000)) {
        throw new TypeError(label + " must contain " + m + " non-negative integer values no greater than 1,000,000.");
      }
    }
    validateVector(available, "Available");
    allocation.forEach((row, p) => {
      validateVector(row, "Allocation row " + p);
      validateVector(maximum[p], "Maximum row " + p);
      row.forEach((value, r) => {
        if (value > maximum[p][r]) {
          throw new RangeError("Allocation for " + processNames[p] + " / " + resourceNames[r] + " cannot exceed Maximum.");
        }
      });
    });
    return {
      allocation: allocation.map((row) => row.slice()),
      maximum: maximum.map((row) => row.slice()),
      available: available.slice(),
      processNames: processNames.slice(),
      resourceNames: resourceNames.slice()
    };
  }

  function serializeScenario(scenario) {
    const clean = validateScenario(scenario);
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      scenario: clean
    };
  }

  function stringifyScenario(scenario) {
    return JSON.stringify(serializeScenario(scenario), null, 2);
  }

  function parseScenario(source) {
    let document;
    try {
      document = typeof source === "string" ? JSON.parse(source) : source;
    } catch (error) {
      throw new SyntaxError("Invalid JSON: check commas, quotes, brackets, and braces.");
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new TypeError("Import must be a JSON object.");
    }
    if (document.format !== FORMAT) {
      throw new TypeError('Unrecognized file format. Expected format "vigil-scenario".');
    }
    if (document.version !== VERSION) {
      throw new TypeError("Unsupported scenario version. This version of Vigil supports version " + VERSION + ".");
    }
    return validateScenario(document.scenario);
  }

  return { FORMAT, VERSION, validateScenario, serializeScenario, stringifyScenario, parseScenario };
});
