/* Vigil UI, scenario editor, safety trace, and transaction simulator. State is in memory only. */
(() => {
  "use strict";
  const root = document.documentElement;
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-panel]"));
  const breadcrumb = document.getElementById("breadcrumb-current");
  const themeButton = document.getElementById("theme-toggle");
  const themeIcon = themeButton?.querySelector(".theme-icon");
  const labels = { overview: "Overview", setup: "System setup", safety: "Safety check", requests: "Requests", risk: "Risk intelligence", compare: "Policy comparison", learn: "Learn & export" };

  function activateTab(name, moveFocus = false) {
    const targetTab = tabs.find((tab) => tab.dataset.tab === name);
    const targetPanel = panels.find((panel) => panel.dataset.panel === name);
    if (!targetTab || !targetPanel) return;
    tabs.forEach((tab) => {
      const selected = tab === targetTab;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const selected = panel === targetPanel;
      panel.hidden = !selected;
      panel.classList.toggle("is-visible", selected);
    });
    if (breadcrumb) breadcrumb.textContent = labels[name] || "Overview";
    if (moveFocus) targetPanel.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex].dataset.tab);
    });
  });
  document.querySelectorAll("[data-go-tab]").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.goTab, true)));

  function setTheme(theme) {
    const light = theme === "light";
    root.dataset.theme = light ? "light" : "dark";
    if (themeIcon) themeIcon.textContent = light ? "☾" : "☼";
    if (themeButton) themeButton.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", light ? "#f5f7fb" : "#10141d");
  }
  themeButton?.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key.toLowerCase() === "d") setTheme("dark");
    if (event.key.toLowerCase() === "l") setTheme("light");
  });

  const $ = (id) => document.getElementById(id);
  const DEFAULT_TEXTBOOK = {
    allocation: [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
    maximum: [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],
    available: [3,3,2],
    processNames: ["P0","P1","P2","P3","P4"],
    resourceNames: ["A","B","C"]
  };
  const DEFAULT_UNSAFE = {
    allocation: [[1,0],[0,1],[1,1]],
    maximum: [[2,1],[1,2],[2,2]],
    available: [0,0],
    processNames: ["P0","P1","P2"],
    resourceNames: ["A","B"]
  };
  let scenario = cloneScenario(DEFAULT_TEXTBOOK);
  let currentErrors = [];
  let requestState = null;
  let requestHistory = [];
  let requestScenarioSnapshot = "";
  let selectedRiskProcess = 0;

  function cloneScenario(source) {
    return {
      allocation: source.allocation.map((row) => row.slice()),
      maximum: source.maximum.map((row) => row.slice()),
      available: source.available.slice(),
      processNames: source.processNames.slice(),
      resourceNames: source.resourceNames.slice()
    };
  }
  function processCount() { return scenario.allocation.length; }
  function resourceCount() { return scenario.available.length; }
  function safeText(value) { return String(value); }
  function makeCell(tag, className, text) {
    const cell = document.createElement(tag);
    if (className) cell.className = className;
    if (text !== undefined) cell.textContent = text;
    return cell;
  }
  function makeNumberInput(value, label, onChange) {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = Number.isInteger(value) && value >= 0 ? String(value) : "";
    input.className = "matrix-input";
    input.setAttribute("aria-label", label);
    input.addEventListener("input", () => onChange(input.value, input));
    return input;
  }
  function makeNameInput(value, label, onChange) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 12;
    input.value = value;
    input.className = "name-input";
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => {
      onChange(input.value.trim());
      input.value = input.value.trim();
    });
    return input;
  }

  function renderMatrix(targetId, matrixKey) {
    const host = $(targetId);
    if (!host) return;
    host.replaceChildren();
    const table = document.createElement("table");
    table.className = "data-matrix";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const processHeader = makeCell("th", "process-heading", "PROCESS");
    processHeader.scope = "col";
    headRow.appendChild(processHeader);
    for (let r = 0; r < resourceCount(); r += 1) {
      const th = makeCell("th", "", "");
      th.scope = "col";
      th.appendChild(makeNameInput(scenario.resourceNames[r], "Name for resource " + (r + 1), (value) => {
        scenario.resourceNames[r] = value || "R" + r;
        renderAll();
      }));
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (let p = 0; p < processCount(); p += 1) {
      const tr = document.createElement("tr");
      const rowHeader = makeCell("th", "row-heading", "");
      rowHeader.scope = "row";
      rowHeader.appendChild(makeNameInput(scenario.processNames[p], "Name for process " + (p + 1), (value) => {
        scenario.processNames[p] = value || "P" + p;
        renderAll();
      }));
      tr.appendChild(rowHeader);
      for (let r = 0; r < resourceCount(); r += 1) {
        const td = makeCell("td", "");
        const val = scenario[matrixKey][p][r];
        if (matrixKey === "need") {
          td.textContent = String(val);
          td.classList.add("derived-value");
        } else {
          td.appendChild(makeNumberInput(val, scenario.processNames[p] + ", " + scenario.resourceNames[r] + " " + matrixKey, (raw, input) => {
            const parsed = raw === "" ? NaN : Number(raw);
            scenario[matrixKey][p][r] = parsed;
            input.classList.toggle("input-invalid", !Number.isInteger(parsed) || parsed < 0);
            refreshDerived();
          }));
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    host.appendChild(table);
  }

  function renderAvailable() {
    const host = $("available-vector");
    host.replaceChildren();
    const wrap = makeCell("div", "available-vector-grid");
    for (let r = 0; r < resourceCount(); r += 1) {
      const item = makeCell("label", "available-item");
      const name = makeCell("span", "available-name", scenario.resourceNames[r]);
      const input = makeNumberInput(scenario.available[r], "Available " + scenario.resourceNames[r], (raw, field) => {
        const parsed = raw === "" ? NaN : Number(raw);
        scenario.available[r] = parsed;
        field.classList.toggle("input-invalid", !Number.isInteger(parsed) || parsed < 0);
        validateAndPaint();
        syncRequestSession();
        resetSafety();
      });
      item.append(name, input);
      wrap.appendChild(item);
    }
    host.appendChild(wrap);
  }

  function refreshDerived() {
    const host = $("need-matrix");
    host.replaceChildren();
    const table = document.createElement("table");
    table.className = "data-matrix";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.appendChild(makeCell("th", "process-heading", "PROCESS"));
    scenario.resourceNames.forEach((name) => hr.appendChild(makeCell("th", "", name || "RESOURCE")));
    thead.appendChild(hr); table.appendChild(thead);
    const tbody = document.createElement("tbody");
    const maxShapeOkay = scenario.maximum.length === processCount() && scenario.maximum.every((row) => Array.isArray(row) && row.length === resourceCount());
    const allocShapeOkay = scenario.allocation.length === processCount() && scenario.allocation.every((row) => Array.isArray(row) && row.length === resourceCount());
    for (let p = 0; p < processCount(); p += 1) {
      const tr = document.createElement("tr");
      tr.appendChild(makeCell("th", "row-heading", scenario.processNames[p]));
      for (let r = 0; r < resourceCount(); r += 1) {
        const max = maxShapeOkay ? scenario.maximum[p][r] : NaN;
        const alloc = allocShapeOkay ? scenario.allocation[p][r] : NaN;
        const valid = Number.isInteger(max) && max >= 0 && Number.isInteger(alloc) && alloc >= 0 && max >= alloc;
        const td = makeCell("td", "derived-value" + (valid ? "" : " invalid-cell"), valid ? String(max - alloc) : "!");
        if (!valid) td.title = "Maximum must be a non-negative integer greater than or equal to Allocation.";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); host.appendChild(table);
    validateAndPaint();
    syncRequestSession();
    if (typeof resetSafety === "function") resetSafety();
  }

  function collectErrors() {
    const errors = [];
    const n = processCount(); const m = resourceCount();
    if (!Number.isInteger(n) || n < 1 || n > 10) errors.push("Process count must be between 1 and 10.");
    if (!Number.isInteger(m) || m < 1 || m > 6) errors.push("Resource count must be between 1 and 6.");
    if (scenario.processNames.some((name) => !String(name).trim())) errors.push("Every process needs a name.");
    if (scenario.resourceNames.some((name) => !String(name).trim())) errors.push("Every resource type needs a name.");
    for (let p = 0; p < n; p += 1) {
      for (let r = 0; r < m; r += 1) {
        const max = scenario.maximum[p]?.[r];
        const alloc = scenario.allocation[p]?.[r];
        if (!Number.isInteger(max) || max < 0) errors.push(safeText(scenario.processNames[p]) + " / " + safeText(scenario.resourceNames[r]) + ": Maximum must be a non-negative integer.");
        if (!Number.isInteger(alloc) || alloc < 0) errors.push(safeText(scenario.processNames[p]) + " / " + safeText(scenario.resourceNames[r]) + ": Allocation must be a non-negative integer.");
        if (Number.isInteger(max) && Number.isInteger(alloc) && alloc > max) errors.push(safeText(scenario.processNames[p]) + " / " + safeText(scenario.resourceNames[r]) + ": Allocation cannot exceed Maximum.");
      }
    }
    for (let r = 0; r < m; r += 1) {
      if (!Number.isInteger(scenario.available[r]) || scenario.available[r] < 0) errors.push(safeText(scenario.resourceNames[r]) + ": Available must be a non-negative integer.");
    }
    return [...new Set(errors)];
  }

  function validateAndPaint() {
    currentErrors = collectErrors();
    const panel = $("setup-validation");
    if (!panel) return currentErrors;
    panel.classList.toggle("is-invalid", currentErrors.length > 0);
    panel.classList.toggle("is-valid", currentErrors.length === 0);
    panel.querySelector(".validation-icon").textContent = currentErrors.length ? "!" : "✓";
    panel.querySelector("strong").textContent = currentErrors.length ? currentErrors.length + " input issue" + (currentErrors.length === 1 ? "" : "s") + " found" : "Scenario is valid";
    const p = panel.querySelector("p");
    p.textContent = currentErrors.length ? currentErrors[0] + (currentErrors.length > 1 ? " (and " + (currentErrors.length - 1) + " more). " : " ") : "All matrix values satisfy the input rules.";
    p.classList.toggle("error-text", currentErrors.length > 0);
    const button = $("validate-scenario");
    if (button) button.disabled = currentErrors.length > 0;
    return currentErrors;
  }

  function resizeScenario(kind, nextCount) {
    const oldN = processCount(); const oldM = resourceCount();
    const n = kind === "process" ? Math.max(1, Math.min(10, nextCount)) : oldN;
    const m = kind === "resource" ? Math.max(1, Math.min(6, nextCount)) : oldM;
    const next = { allocation: [], maximum: [], available: [], processNames: [], resourceNames: [] };
    for (let p = 0; p < n; p += 1) {
      next.processNames.push(scenario.processNames[p] || "P" + p);
      next.allocation.push([]); next.maximum.push([]);
      for (let r = 0; r < m; r += 1) {
        next.allocation[p][r] = p < oldN && r < oldM ? scenario.allocation[p][r] : 0;
        next.maximum[p][r] = p < oldN && r < oldM ? scenario.maximum[p][r] : 0;
      }
    }
    for (let r = 0; r < m; r += 1) {
      next.resourceNames.push(scenario.resourceNames[r] || "R" + r);
      next.available.push(r < oldM ? scenario.available[r] : 0);
    }
    scenario = next;
    $("process-count").value = String(n);
    $("resource-count").value = String(m);
    renderAll();
    resetSafety();
  }

  function loadScenario(next) {
    scenario = cloneScenario(next);
    $("process-count").value = String(processCount());
    $("resource-count").value = String(resourceCount());
    renderAll();
    resetSafety();
  }
  function randomScenario() {
    const n = Number($("process-count").value);
    const m = Number($("resource-count").value);
    const allocation = []; const maximum = [];
    for (let p = 0; p < n; p += 1) {
      const a = []; const max = [];
      for (let r = 0; r < m; r += 1) {
        const held = Math.floor(Math.random() * 3);
        a.push(held); max.push(held + Math.floor(Math.random() * 5));
      }
      allocation.push(a); maximum.push(max);
    }
    const available = Array.from({ length: m }, () => Math.floor(Math.random() * 5));
    loadScenario({
      allocation, maximum, available,
      processNames: Array.from({ length: n }, (_, p) => "P" + p),
      resourceNames: Array.from({ length: m }, (_, r) => "R" + r)
    });
  }


  // Step 8: compare the formal safety-aware policy with a naive availability-only policy.
  function policyStatusClass(status) {
    if (status === "GRANTED") return "policy-status-granted";
    if (status === "MUST WAIT") return "policy-status-wait";
    if (status === "DENIED UNSAFE") return "policy-status-unsafe";
    return "policy-status-denied";
  }
  function policyMetric(label, value, detail, className = "") {
    const card = makeCell("div", "policy-metric card-surface" + (className ? " " + className : ""));
    card.append(makeCell("span", "policy-metric-label", label), makeCell("strong", "policy-metric-value", String(value)), makeCell("small", "policy-metric-detail", detail));
    return card;
  }
  function policyOutcomeLabel(outcome) {
    if (outcome.status === "DENIED" && /unsafe state/i.test(outcome.reason)) return "DENIED UNSAFE";
    return outcome.status;
  }
  function renderPolicyComparison() {
    const host = $("policy-results");
    if (!host || !window.VigilPolicy || !window.VigilBanker) return;
    host.replaceChildren();
    const errors = collectErrors();
    if (errors.length) {
      host.appendChild(makeCell("p", "policy-error card-surface", "Cannot compare policies: " + errors[0] + " Correct the System setup first."));
      return;
    }
    const trials = Number($("policy-trials").value);
    const seed = Number($("policy-seed").value);
    let result;
    try {
      result = window.VigilPolicy.comparePolicies(scenario, window.VigilBanker, { trials, seed });
    } catch (error) {
      host.appendChild(makeCell("p", "policy-error card-surface", "Comparison could not run: " + (error.message || "invalid inputs")));
      return;
    }
    const intro = makeCell("div", "policy-result-intro");
    intro.append(
      makeCell("p", "", result.trialCount + " requests · seed " + result.seed + " · identical ordered workload for both policies"),
      makeCell("p", result.initialSafe ? "policy-initial-safe" : "policy-initial-unsafe", result.initialSafe ? "Initial state is formally safe." : "Warning: the configured starting state is already unsafe. Interpret unsafe-round counts in that context.")
    );
    host.appendChild(intro);

    const comparison = makeCell("div", "policy-summary-grid");
    [result.banker, result.naive].forEach((policy, index) => {
      const card = makeCell("section", "policy-summary-card card-surface" + (index ? " policy-naive-card" : " policy-banker-card"));
      const header = makeCell("div", "policy-summary-header");
      header.append(makeCell("div", "eyebrow", index ? "AVAILABILITY-ONLY BASELINE" : "SAFETY-AWARE POLICY"), makeCell("h2", "", policy.name));
      card.appendChild(header);
      const metrics = makeCell("div", "policy-metric-grid");
      metrics.append(
        policyMetric("Requests granted", policy.grants, "of " + result.trialCount + " requests"),
        policyMetric("Must wait", policy.waits, "Not enough Available resources"),
        policyMetric("Need violations", policy.deniedNeed, "Rejected by both policies"),
        policyMetric("Unsafe grants", policy.unsafeGrants, "Granted request left state unsafe", policy.unsafeGrants ? "policy-metric-danger" : ""),
        policyMetric("Unsafe rounds", policy.unsafeRounds, "Post-request states found unsafe", policy.unsafeRounds ? "policy-metric-danger" : ""),
        policyMetric("Unsafe denials", policy.deniedUnsafe, "Rejected by safety check")
      );
      card.appendChild(metrics);
      const final = makeCell("div", "policy-final-state " + (policy.finalSafe ? "policy-final-safe" : "policy-final-unsafe"));
      final.append(makeCell("strong", "", policy.finalSafe ? "FINAL STATE: SAFE" : "FINAL STATE: UNSAFE"), makeCell("span", "", policy.finalSafe ? "A complete safe sequence exists." : "No complete safe sequence exists."));
      card.appendChild(final);
      comparison.appendChild(card);
    });
    host.appendChild(comparison);

    const difference = makeCell("section", "policy-difference card-surface");
    difference.appendChild(makeCell("h2", "", "What the experiment shows"));
    const delta = result.unsafeGrantDifference;
    const roundDelta = result.unsafeStateDifference;
    if (result.naive.unsafeGrants > 0 || result.naive.unsafeTransitions > 0) {
      difference.appendChild(makeCell("p", "policy-difference-main", "The naive policy granted " + result.naive.unsafeGrants + " request(s) that left the system unsafe and crossed from safe to unsafe " + result.naive.unsafeTransitions + " time(s)."));
    } else if (result.initialSafe && result.naive.finalSafe) {
      difference.appendChild(makeCell("p", "policy-difference-main", "This workload did not expose an unsafe grant. That does not mean the naive policy guarantees safety; try a different seed or a longer workload."));
    } else {
      difference.appendChild(makeCell("p", "policy-difference-main", "No safe-to-unsafe transition was observed in this workload. Compare the trial ledger and try another seed."));
    }
    difference.appendChild(makeCell("p", "policy-difference-detail", "Unsafe post-request states across rounds: naive " + result.naive.unsafeRounds + " vs. Banker's " + result.banker.unsafeRounds + " (difference " + (roundDelta > 0 ? "+" : "") + roundDelta + "). Unsafe grants: naive " + result.naive.unsafeGrants + " vs. Banker's " + result.banker.unsafeGrants + " (difference " + (delta > 0 ? "+" : "") + delta + "). Counts are workload outcomes, not probabilities."));
    difference.appendChild(makeCell("p", "policy-difference-detail", "The naive policy does not deliberately grant beyond remaining Need or beyond Available. Its only omitted safeguard is the post-grant safety test."));
    host.appendChild(difference);

    const ledger = makeCell("section", "policy-ledger card-surface");
    const ledgerHeading = makeCell("div", "card-heading");
    ledgerHeading.append(makeCell("div", "", ""), makeCell("span", "matrix-caption", "FIRST " + Math.min(20, result.trialCount) + " OF " + result.trialCount));
    const ledgerTitle = makeCell("h2", "", "Request-by-request ledger");
    ledger.append(ledgerTitle, makeCell("p", "card-help", "Each row is the same request sent to both policies. Statuses reveal whether Banker's safety check rejected a request that the naive policy granted."));
    const tableWrap = makeCell("div", "policy-ledger-scroll");
    const table = makeCell("table", "policy-ledger-table");
    const thead = makeCell("thead", "");
    const headRow = makeCell("tr", "");
    ["Trial","Request","Banker's result","Naive result","Naive state after request"].forEach((label) => headRow.appendChild(makeCell("th", "", label)));
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = makeCell("tbody", "");
    result.workload.slice(0, 20).forEach((item, index) => {
      const bankOutcome = result.banker.outcomes[index];
      const naiveOutcome = result.naive.outcomes[index];
      const row = makeCell("tr", naiveOutcome.unsafeTransition ? "policy-row-unsafe" : "");
      const requestLabel = scenario.processNames[item.processIndex] + " (" + item.request.map((value, r) => scenario.resourceNames[r] + ":" + value).join(", ") + ")";
      const cells = [
        String(item.trial),
        requestLabel,
        policyOutcomeLabel(bankOutcome),
        policyOutcomeLabel(naiveOutcome),
        naiveOutcome.safeAfter ? "SAFE" : "UNSAFE"
      ];
      cells.forEach((value, cellIndex) => {
        const cell = makeCell(cellIndex === 0 ? "th" : "td", cellIndex === 2 ? policyStatusClass(policyOutcomeLabel(bankOutcome)) : cellIndex === 3 ? policyStatusClass(policyOutcomeLabel(naiveOutcome)) : cellIndex === 4 ? (naiveOutcome.safeAfter ? "policy-state-safe" : "policy-state-unsafe") : "", value);
        if (cellIndex === 0) cell.scope = "row";
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    ledger.appendChild(tableWrap);
    if (result.trialCount > 20) ledger.appendChild(makeCell("p", "policy-ledger-note", "For readability, the ledger shows the first 20 trials. All " + result.trialCount + " trials are included in the summary metrics."));
    host.appendChild(ledger);
  }

  function resetPolicyComparison() {
    const host = $("policy-results");
    if (host) host.replaceChildren(makeCell("div", "whatif-empty", "The system setup changed. Run the comparison again to evaluate this scenario."));
  }

  function renderAll() {
    renderMatrix("maximum-matrix", "maximum");
    renderMatrix("allocation-matrix", "allocation");
    renderAvailable();
    refreshDerived();
    $("setup-state-label").textContent = processCount() + " process" + (processCount() === 1 ? "" : "es") + " · " + resourceCount() + " resource type" + (resourceCount() === 1 ? "" : "s");
    renderRiskWorkspace();
    resetPolicyComparison();
  }

  $("policy-run")?.addEventListener("click", renderPolicyComparison);

  document.querySelectorAll("[data-count]").forEach((button) => button.addEventListener("click", () => {
    const input = $(button.dataset.count === "process" ? "process-count" : "resource-count");
    resizeScenario(button.dataset.count, Number(input.value) + Number(button.dataset.delta));
  }));
  $("process-count").addEventListener("change", () => resizeScenario("process", Number($("process-count").value) || 1));
  $("resource-count").addEventListener("change", () => resizeScenario("resource", Number($("resource-count").value) || 1));
  $("load-textbook").addEventListener("click", () => loadScenario(DEFAULT_TEXTBOOK));
  $("load-unsafe").addEventListener("click", () => loadScenario(DEFAULT_UNSAFE));
  $("random-generate").addEventListener("click", randomScenario);
  $("reset-scenario").addEventListener("click", () => loadScenario(DEFAULT_TEXTBOOK));
  $("validate-scenario").addEventListener("click", () => {
    const errors = validateAndPaint();
    if (errors.length) {
      $("setup-validation").querySelector("p").textContent = errors.slice(0, 3).join(" ");
    } else {
      $("setup-validation").querySelector("p").textContent = "Scenario passed input validation and is ready for the safety check in Step 4.";
    }
  });




  // Step 6: transparent heuristic risk scoring. Not ML and never a safety proof.
  function riskLevelClass(level) { return String(level || "pending").toLowerCase(); }
  function renderRiskProcessDetail(item) {
    const host = $("risk-process-detail");
    if (!host) return;
    host.replaceChildren();
    if (!item) {
      host.appendChild(makeCell("p", "", "No process risk data is available for the current setup."));
      return;
    }
    const heading = makeCell("div", "risk-detail-heading");
    heading.append(makeCell("strong", "", scenario.processNames[item.processIndex]), makeCell("span", "risk-level-badge risk-" + riskLevelClass(item.level), item.level + " · " + item.score + "/100"));
    host.appendChild(heading);
    [
      ["Need pressure", item.needPressure, "Need relative to current Available."],
      ["Competition", item.competition, "Other processes that hold or claim resources this process needs."],
      ["Sequence fragility", item.sequenceFragility, item.sequencePosition === null ? "Process is blocked in the current partial proof." : "Position " + item.sequencePosition + " in the deterministic safe sequence."]
    ].forEach(([label, value, description]) => {
      const row = makeCell("div", "risk-detail-factor");
      const top = makeCell("div", "risk-factor-top");
      top.append(makeCell("strong", "", label), makeCell("span", "", value + "/100"));
      const track = makeCell("div", "risk-factor-track");
      const fill = makeCell("span", "risk-factor-fill risk-fill-" + (value >= 75 ? "high" : value >= 50 ? "medium" : "low"));
      fill.style.width = value + "%";
      track.appendChild(fill);
      row.append(top, track, makeCell("p", "", description));
      host.appendChild(row);
    });
  }

  // Step 7: accessible, dependency-free SVG risk visualizations.
  const riskSvgNS = "http://www.w3.org/2000/svg";
  function riskSvgNode(tag, attrs = {}, text = "") {
    const node = document.createElementNS(riskSvgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== "") node.textContent = text;
    return node;
  }
  function renderRiskVisualizations(assessment) {
    const resourceHost = $("risk-resource-chart");
    const processHost = $("risk-process-chart");
    const sequenceHost = $("risk-sequence-visual");
    if (!resourceHost || !processHost || !sequenceHost) return;
    [resourceHost, processHost, sequenceHost].forEach((host) => host.replaceChildren());
    const resourceCountValue = scenario.resourceNames.length;
    const allocatedTotals = scenario.resourceNames.map((_, r) => scenario.allocation.reduce((sum, row) => sum + row[r], 0));
    const availableTotals = scenario.available.slice();
    const maxResourceTotal = Math.max(1, ...allocatedTotals.map((value, r) => value + availableTotals[r]));
    const chartWidth = 520;
    const left = 78;
    const right = 20;
    const plotWidth = chartWidth - left - right;
    const rowHeight = 34;
    const resourceHeight = Math.max(66, resourceCountValue * rowHeight + 16);
    const resourceSvg = riskSvgNode("svg", { viewBox: "0 0 " + chartWidth + " " + resourceHeight, role: "presentation", class: "risk-chart-svg", preserveAspectRatio: "xMinYMin meet" });
    resourceSvg.appendChild(riskSvgNode("title", {}, "Resource instances: allocated compared with available"));
    resourceSvg.appendChild(riskSvgNode("desc", {}, "Each resource bar is scaled against the largest total in the current scenario."));
    scenario.resourceNames.forEach((name, r) => {
      const y = 12 + r * rowHeight;
      const allocated = allocatedTotals[r];
      const available = availableTotals[r];
      const allocWidth = allocated / maxResourceTotal * plotWidth;
      const availableWidth = available / maxResourceTotal * plotWidth;
      resourceSvg.appendChild(riskSvgNode("text", { x: left - 12, y: y + 13, "text-anchor": "end", class: "risk-svg-label" }, name));
      resourceSvg.appendChild(riskSvgNode("rect", { x: left, y, width: plotWidth, height: 14, rx: 4, class: "risk-svg-track" }));
      if (allocWidth > 0) resourceSvg.appendChild(riskSvgNode("rect", { x: left, y, width: allocWidth, height: 14, rx: 4, class: "risk-svg-allocated" }));
      if (availableWidth > 0) resourceSvg.appendChild(riskSvgNode("rect", { x: left + allocWidth, y, width: availableWidth, height: 14, rx: 4, class: "risk-svg-available" }));
      resourceSvg.appendChild(riskSvgNode("text", { x: Math.min(chartWidth - 2, left + allocWidth + availableWidth + 7), y: y + 12, class: "risk-svg-value" }, String(allocated + available)));
      resourceSvg.appendChild(riskSvgNode("text", { x: left, y: y + 27, class: "risk-svg-sub-label" }, allocated + " allocated · " + available + " available"));
    });
    resourceHost.appendChild(resourceSvg);

    const processScores = assessment.processScores;
    const processHeight = Math.max(90, processScores.length * 35 + 18);
    const processSvg = riskSvgNode("svg", { viewBox: "0 0 " + chartWidth + " " + processHeight, role: "presentation", class: "risk-chart-svg", preserveAspectRatio: "xMinYMin meet" });
    processSvg.appendChild(riskSvgNode("title", {}, "Heuristic risk score by process"));
    processSvg.appendChild(riskSvgNode("desc", {}, "Select a bar to open the selected process factor details."));
    [0,25,50,75,100].forEach((tick) => {
      const x = left + plotWidth * tick / 100;
      processSvg.appendChild(riskSvgNode("line", { x1:x, y1:5, x2:x, y2:processHeight - 8, class:"risk-svg-grid-line" }));
      processSvg.appendChild(riskSvgNode("text", { x, y:processHeight - 1, "text-anchor":"middle", class:"risk-svg-axis" }, String(tick)));
    });
    processScores.forEach((item, i) => {
      const y = 11 + i * 35;
      const group = riskSvgNode("g", { class:"risk-svg-process" + (item.processIndex === selectedRiskProcess ? " is-selected" : ""), tabindex:"0", role:"button", "aria-label":scenario.processNames[item.processIndex] + " risk score " + item.score + " out of 100", "aria-pressed":String(item.processIndex === selectedRiskProcess) });
      group.appendChild(riskSvgNode("text", { x:left - 12, y:y + 12, "text-anchor":"end", class:"risk-svg-label" }, scenario.processNames[item.processIndex]));
      group.appendChild(riskSvgNode("rect", { x:left, y, width:plotWidth, height:15, rx:4, class:"risk-svg-track" }));
      const colorClass = item.score >= 75 ? "risk-svg-high" : item.score >= 50 ? "risk-svg-medium" : "risk-svg-low";
      group.appendChild(riskSvgNode("rect", { x:left, y, width:Math.max(item.score > 0 ? 2 : 0, plotWidth * item.score / 100), height:15, rx:4, class:colorClass }));
      group.appendChild(riskSvgNode("text", { x:Math.min(chartWidth - 4, left + plotWidth * item.score / 100 + 7), y:y + 12, class:"risk-svg-value" }, String(item.score)));
      const choose = () => {
        selectedRiskProcess = item.processIndex;
        renderRiskProcessDetail(item);
        processHost.querySelectorAll(".risk-svg-process").forEach((row) => {
          const active = row === group;
          row.classList.toggle("is-selected", active);
          row.setAttribute("aria-pressed", String(active));
        });
        const list = $("risk-process-list");
        list.querySelectorAll(".risk-process-row").forEach((row) => {
          const active = Number(row.dataset.processIndex) === item.processIndex;
          row.classList.toggle("is-selected", active);
          row.setAttribute("aria-pressed", String(active));
        });
      };
      group.addEventListener("click", choose);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); }
      });
      processSvg.appendChild(group);
    });
    processHost.appendChild(processSvg);

    const pathway = document.createElement("div");
    pathway.className = "risk-pathway";
    const pathIndices = assessment.safe ? assessment.safeSequence : assessment.partialSequence;
    pathIndices.forEach((p, i) => {
      if (i > 0) pathway.appendChild(makeCell("span", "risk-path-arrow", "→"));
      pathway.appendChild(makeCell("span", "risk-path-node is-complete", scenario.processNames[p]));
    });
    if (!assessment.safe) {
      if (pathIndices.length) pathway.appendChild(makeCell("span", "risk-path-arrow", "→"));
      assessment.stuckProcesses.forEach((p, i) => {
        if (i > 0) pathway.appendChild(makeCell("span", "risk-path-arrow", "·"));
        pathway.appendChild(makeCell("span", "risk-path-node is-blocked", scenario.processNames[p] + " blocked"));
      });
    }
    if (!pathIndices.length && assessment.safe) pathway.appendChild(makeCell("span", "risk-path-empty", "No process sequence available."));
    sequenceHost.appendChild(pathway);
    $("risk-path-status").textContent = assessment.safe ? "SAFE · " + pathIndices.length + "/" + scenario.processNames.length + " complete" : "UNSAFE · " + assessment.stuckProcesses.length + " blocked";
    $("risk-path-status").className = "risk-level-badge " + (assessment.safe ? "risk-low" : "risk-critical");
  }

  function renderRiskWorkspace() {
    if (!$("risk-system-score") || !window.VigilRisk || !window.VigilBanker) return;
    $("risk-scenario-name").textContent = "Current setup scenario";
    $("risk-scenario-meta").textContent = processCount() + " processes · " + resourceCount() + " resource types";
    const errors = collectErrors();
    let assessment;
    try {
      if (errors.length) throw new TypeError(errors[0]);
      assessment = window.VigilRisk.assess(scenario, window.VigilBanker, 1000);
    } catch (error) {
      ["risk-system-score","risk-utilization","risk-sequence-count","risk-min-slack"].forEach((id) => { $(id).textContent = "—"; });
      $("risk-system-level").textContent = "Invalid setup";
      $("risk-safety-status").textContent = "Analysis paused: " + (error.message || "invalid setup");
      $("risk-recommendation").textContent = "Correct the System setup inputs before calculating risk.";
      $("risk-process-list").replaceChildren(makeCell("p", "request-state-empty", "No scores until the setup is valid."));
      $("risk-factor-bars").replaceChildren();
      ["risk-resource-chart","risk-process-chart","risk-sequence-visual"].forEach((id) => $(id)?.replaceChildren());
      $("risk-path-status").textContent = "Invalid setup";
      $("risk-path-status").className = "risk-level-badge risk-critical";
      renderRiskProcessDetail(null);
      renderRiskWhatIfInputs();
      return;
    }
    $("risk-system-score").textContent = String(assessment.systemScore);
    $("risk-system-level").textContent = assessment.systemLevel;
    $("risk-system-level").className = "risk-level-badge risk-" + riskLevelClass(assessment.systemLevel);
    $("risk-utilization").textContent = assessment.utilizationPercent + "%";
    $("risk-sequence-count").textContent = assessment.sequenceCountCapped ? "≥" + assessment.sequenceCap : String(assessment.distinctSafeSequenceCount);
    $("risk-sequence-note").textContent = assessment.sequenceCountCapped ? "Enumeration cap reached; count is at least " + assessment.sequenceCap : "Distinct valid completion orders";
    $("risk-min-slack").textContent = (assessment.minimumSlack > 0 ? "+" : "") + assessment.minimumSlack;
    $("risk-safety-status").className = "risk-safety-status " + (assessment.safe ? "risk-safe" : "risk-unsafe");
    $("risk-safety-status").textContent = assessment.safe ? "FORMALLY SAFE · " + assessment.safeSequence.map((p) => scenario.processNames[p]).join(" → ") : "UNSAFE · blocked: " + assessment.stuckProcesses.map((p) => scenario.processNames[p]).join(", ");
    $("risk-recommendation").textContent = assessment.recommendation;
    const sequenceScarcity = assessment.distinctSafeSequenceCount === 0 ? 100 : Math.min(100, 100 / Math.sqrt(assessment.distinctSafeSequenceCount));
    const slackPressure = assessment.minimumSlack < 0 ? 100 : 100 / (1 + assessment.minimumSlack);
    const factors = [
      ["Utilization", 35 * assessment.utilizationPercent / 100, "35% weight"],
      ["Sequence scarcity", 35 * sequenceScarcity / 100, "35% weight"],
      ["Slack pressure", 30 * slackPressure / 100, "30% weight"]
    ];
    const factorHost = $("risk-factor-bars");
    factorHost.replaceChildren();
    factors.forEach(([name, contribution, weight]) => {
      const row = makeCell("div", "risk-factor-row");
      const top = makeCell("div", "risk-factor-top");
      top.append(makeCell("strong", "", name), makeCell("span", "", contribution.toFixed(1) + " pts · " + weight));
      const track = makeCell("div", "risk-factor-track");
      const fill = makeCell("span", "risk-factor-fill risk-fill-" + (contribution >= 25 ? "high" : contribution >= 12 ? "medium" : "low"));
      fill.style.width = (contribution / 35 * 100) + "%";
      track.appendChild(fill);
      row.append(top, track);
      factorHost.appendChild(row);
    });
    const list = $("risk-process-list");
    list.replaceChildren();
    assessment.processScores.forEach((item) => {
      const button = makeCell("button", "risk-process-row" + (item.processIndex === selectedRiskProcess ? " is-selected" : ""));
      button.type = "button";
      button.dataset.processIndex = String(item.processIndex);
      button.setAttribute("aria-pressed", String(item.processIndex === selectedRiskProcess));
      const title = makeCell("span", "risk-process-name", scenario.processNames[item.processIndex]);
      const track = makeCell("span", "risk-process-mini-track");
      const fill = makeCell("span", "risk-process-mini-fill risk-fill-" + (item.score >= 75 ? "high" : item.score >= 50 ? "medium" : "low"));
      fill.style.width = item.score + "%";
      track.appendChild(fill);
      const score = makeCell("strong", "risk-process-score", String(item.score));
      const badge = makeCell("span", "risk-level-badge risk-" + riskLevelClass(item.level), item.level);
      button.append(title, track, score, badge);
      button.addEventListener("click", () => {
        selectedRiskProcess = item.processIndex;
        list.querySelectorAll(".risk-process-row").forEach((row) => {
          const active = row === button;
          row.classList.toggle("is-selected", active);
          row.setAttribute("aria-pressed", String(active));
        });
        renderRiskProcessDetail(item);
      });
      list.appendChild(button);
    });
    if (selectedRiskProcess >= assessment.processScores.length) selectedRiskProcess = 0;
    renderRiskProcessDetail(assessment.processScores[selectedRiskProcess]);
    renderRiskVisualizations(assessment);
    renderRiskWhatIfInputs();
  }
  function renderRiskWhatIfInputs() {
    if (!$("risk-process") || !$("risk-request-inputs")) return;
    const select = $("risk-process");
    const previous = select.value;
    select.replaceChildren();
    scenario.processNames.forEach((name, p) => {
      const option = document.createElement("option");
      option.value = String(p);
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = scenario.processNames[Number(previous)] !== undefined ? previous : "0";
    const host = $("risk-request-inputs");
    const existing = Array.from(host.querySelectorAll("input")).map((input) => input.value);
    host.replaceChildren();
    scenario.resourceNames.forEach((name, r) => {
      const label = makeCell("label", "request-resource-field");
      const title = makeCell("span", "request-resource-name", name);
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.inputMode = "numeric";
      input.value = existing[r] ?? "0";
      input.id = "risk-request-value-" + r;
      input.className = "request-number-input";
      input.setAttribute("aria-label", "Hypothetical request for " + name);
      label.append(title, input);
      host.appendChild(label);
    });
  }
  function evaluateRiskWhatIf() {
    try {
      const errors = collectErrors();
      if (errors.length) throw new TypeError(errors[0]);
      const p = Number($("risk-process").value);
      const request = scenario.resourceNames.map((name, r) => {
        const raw = $("risk-request-value-" + r)?.value ?? "";
        const value = raw.trim() === "" ? NaN : Number(raw);
        if (!Number.isInteger(value) || value < 0) throw new TypeError("Enter a non-negative whole number for " + name + ".");
        return value;
      });
      const result = window.VigilRisk.compareWhatIf(scenario, p, request, window.VigilBanker, 1000);
      const host = $("risk-whatif-result");
      host.replaceChildren();
      const statusClass = result.status === "GRANTED" ? "granted" : result.status === "MUST WAIT" ? "wait" : "denied";
      const header = makeCell("div", "whatif-outcome-head");
      header.append(makeCell("span", "history-status status-" + statusClass, result.status), makeCell("strong", "", scenario.processNames[p] + " · (" + request.join(", ") + ")"));
      host.appendChild(header);
      const comparison = makeCell("div", "whatif-comparison");
      [
        ["BEFORE", result.before],
        ["AFTER", result.after]
      ].forEach(([label, data]) => {
        const card = makeCell("div", "whatif-score-card");
        card.append(makeCell("span", "risk-metric-label", label), makeCell("strong", "", data.systemScore + "/100"), makeCell("span", "risk-level-badge risk-" + riskLevelClass(data.systemLevel), data.systemLevel));
        card.appendChild(makeCell("small", "", data.utilizationPercent + "% utilization · " + (data.sequenceCountCapped ? "≥" + data.sequenceCap : data.distinctSafeSequenceCount) + " safe sequences"));
        comparison.appendChild(card);
      });
      host.append(header, comparison);
      const delta = result.after.systemScore - result.before.systemScore;
      const deltaText = delta > 0 ? "+" + delta : String(delta);
      host.appendChild(makeCell("p", "whatif-delta", result.stateChanged ? "Heuristic risk score change: " + deltaText + " points. This is a hypothetical comparison only." : "Risk score change: 0 points. No resources were committed because the request was not granted."));
      host.appendChild(makeCell("p", "whatif-reason", result.reason));
      host.appendChild(makeCell("p", "whatif-recommendation", result.recommendation));
      host.appendChild(makeCell("p", "whatif-note", "After-state: " + (result.after.safe ? "safe" : "unsafe") + ". The formal safety check takes precedence over heuristic scores."));
    } catch (error) {
      const host = $("risk-whatif-result");
      host.replaceChildren(makeCell("p", "whatif-error", error.message || "Unable to evaluate this hypothetical request."));
    }
  }
  $("risk-refresh").addEventListener("click", renderRiskWorkspace);
  $("risk-evaluate-whatif").addEventListener("click", evaluateRiskWhatIf);

  // Step 5: isolated runtime state for request/release experiments.
  function requestSnapshot() {
    return JSON.stringify({
      allocation: scenario.allocation,
      maximum: scenario.maximum,
      available: scenario.available,
      processNames: scenario.processNames,
      resourceNames: scenario.resourceNames
    });
  }
  function syncRequestSession(force = false) {
    const snapshot = requestSnapshot();
    if (!force && snapshot === requestScenarioSnapshot) return;
    requestScenarioSnapshot = snapshot;
    currentErrors = collectErrors();
    requestState = currentErrors.length ? null : window.VigilBanker.cloneState(scenario);
    requestHistory = [];
    renderRequestWorkspace();
  }
  function appendRequestVectorInputs(hostId, prefix) {
    const host = $(hostId);
    if (!host) return;
    host.replaceChildren();
    scenario.resourceNames.forEach((name, r) => {
      const label = document.createElement("label");
      label.className = "request-resource-field";
      const title = makeCell("span", "request-resource-name", name);
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.inputMode = "numeric";
      input.value = "0";
      input.id = prefix + "-value-" + r;
      input.className = "request-number-input";
      input.setAttribute("aria-label", prefix + " quantity for " + name);
      label.append(title, input);
      host.appendChild(label);
    });
  }
  function renderProcessSelect(id, selected) {
    const select = $(id);
    if (!select) return;
    const previous = selected ?? select.value;
    select.replaceChildren();
    scenario.processNames.forEach((name, p) => {
      const option = document.createElement("option");
      option.value = String(p);
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = scenario.processNames[Number(previous)] !== undefined ? previous : "0";
  }
  function renderRequestInputs() {
    renderProcessSelect("request-process");
    renderProcessSelect("release-process");
    appendRequestVectorInputs("request-vector-inputs", "request");
    appendRequestVectorInputs("release-vector-inputs", "release");
  }
  function renderRuntimeMatrix(hostId, matrix) {
    const host = $(hostId);
    if (!host) return;
    host.replaceChildren();
    if (!requestState) {
      host.appendChild(makeCell("p", "request-state-empty", "Correct the setup inputs to initialize the runtime state."));
      return;
    }
    const table = document.createElement("table");
    table.className = "data-matrix";
    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.appendChild(makeCell("th", "process-heading", "PROCESS"));
    scenario.resourceNames.forEach((name) => headerRow.appendChild(makeCell("th", "", name)));
    head.appendChild(headerRow);
    table.appendChild(head);
    const body = document.createElement("tbody");
    matrix.forEach((row, p) => {
      const tr = document.createElement("tr");
      tr.appendChild(makeCell("th", "row-heading", scenario.processNames[p]));
      row.forEach((value) => tr.appendChild(makeCell("td", "derived-value", String(value))));
      body.appendChild(tr);
    });
    table.appendChild(body);
    host.appendChild(table);
  }
  function renderRequestHistory() {
    const host = $("request-history-list");
    if (!host) return;
    host.replaceChildren();
    $("request-history-count").textContent = requestHistory.length + (requestHistory.length === 1 ? " EVENT" : " EVENTS");
    if (!requestHistory.length) {
      host.appendChild(makeCell("div", "history-empty", "No actions yet. Submit a request or release to begin the timeline."));
      return;
    }
    requestHistory.slice().reverse().forEach((entry) => {
      const row = document.createElement("article");
      row.className = "history-entry";
      const icon = makeCell("span", "history-entry-icon", entry.type === "REQUEST" ? "↗" : "↙");
      const body = document.createElement("div");
      body.className = "history-entry-body";
      const titleLine = document.createElement("div");
      titleLine.className = "history-title-line";
      titleLine.append(makeCell("strong", "", entry.type + " · " + entry.process), makeCell("span", "history-time", entry.time));
      const detail = makeCell("p", "history-detail", entry.vectorLabel + " (" + entry.vector.join(", ") + ") · " + entry.reason);
      body.append(titleLine, detail);
      const status = makeCell("span", "history-status status-" + entry.statusClass, entry.status);
      row.append(icon, body, status);
      host.appendChild(row);
    });
  }
  function renderRequestOutcome(kind, title, message, kicker) {
    const host = $("request-outcome");
    if (!host) return;
    host.className = "request-outcome " + kind;
    host.querySelector(".outcome-icon").textContent = kind === "is-granted" ? "✓" : kind === "is-denied" ? "!" : kind === "is-wait" ? "Ⅱ" : kind === "is-released" ? "↙" : "◷";
    host.querySelector(".outcome-kicker").textContent = kicker;
    host.querySelector("h2").textContent = title;
    host.querySelector("p").textContent = message;
  }
  function renderRequestWorkspace() {
    if (!$("request-process")) return;
    renderRequestInputs();
    $("request-session-title").textContent = "Current setup scenario";
    $("request-session-meta").textContent = processCount() + " processes · " + resourceCount() + " resource types";
    const disabled = !requestState;
    ["submit-request", "submit-release"].forEach((id) => { $(id).disabled = disabled; });
    const availableHost = $("request-available-state");
    availableHost.replaceChildren();
    if (!requestState) {
      availableHost.appendChild(makeCell("p", "request-state-empty", "Unavailable until setup values are valid."));
      renderRuntimeMatrix("request-allocation-state", []);
      renderRuntimeMatrix("request-need-state", []);
    } else {
      scenario.resourceNames.forEach((name, r) => availableHost.appendChild(makeVectorChip(name, requestState.available[r], "work-chip")));
      renderRuntimeMatrix("request-allocation-state", requestState.allocation);
      let need = [];
      try { need = window.VigilBanker.calculateNeed(requestState.allocation, requestState.maximum); } catch (_) {}
      renderRuntimeMatrix("request-need-state", need);
    }
    renderRequestHistory();
  }
  function readActionVector(prefix) {
    const values = [];
    for (let r = 0; r < resourceCount(); r += 1) {
      const input = $(prefix + "-value-" + r);
      const raw = input?.value ?? "";
      const value = raw.trim() === "" ? NaN : Number(raw);
      if (!Number.isInteger(value) || value < 0) {
        throw new TypeError("Enter a non-negative whole number for " + scenario.resourceNames[r] + ".");
      }
      values.push(value);
    }
    return values;
  }
  function recordRequestAction(type, processIndex, vector, status, reason, statusClass) {
    requestHistory.push({
      type,
      process: scenario.processNames[processIndex],
      vector: vector.slice(),
      vectorLabel: type === "REQUEST" ? "Requested" : "Released",
      status,
      reason,
      statusClass,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    });
  }
  function submitResourceRequest() {
    if (!requestState) {
      renderRequestOutcome("is-error", "Setup is invalid", "Correct the scenario inputs before submitting a request.", "INPUT VALIDATION");
      return;
    }
    try {
      const p = Number($("request-process").value);
      const request = readActionVector("request");
      const result = window.VigilBanker.requestResources(requestState, p, request);
      const statusClass = result.status === "GRANTED" ? "granted" : result.status === "MUST WAIT" ? "wait" : "denied";
      recordRequestAction("REQUEST", p, request, result.status, result.reason, statusClass);
      if (result.granted) {
        requestState = window.VigilBanker.cloneState(result.state);
        const sequence = result.safety.safeSequence.map((index) => scenario.processNames[index]).join(" → ");
        renderRequestOutcome("is-granted", "Request granted", result.reason + " Resulting state is safe. Safe sequence: " + sequence + ". Available is now (" + requestState.available.join(", ") + ").", "SAFE GRANT");
      } else if (result.status === "MUST WAIT") {
        renderRequestOutcome("is-wait", "Request must wait", result.reason + " No resources were changed.", "WAIT · STATE UNCHANGED");
      } else {
        const safetyDetail = result.safety && !result.safety.safe ? " The tentative state cannot prove completion for: " + result.safety.stuckProcesses.map((index) => scenario.processNames[index]).join(", ") + "." : "";
        renderRequestOutcome("is-denied", "Request denied", result.reason + safetyDetail + " No resources were changed.", "DENIED · STATE UNCHANGED");
      }
      renderRequestWorkspace();
      for (let r = 0; r < resourceCount(); r += 1) $("request-value-" + r).value = "0";
    } catch (error) {
      renderRequestOutcome("is-error", "Request not submitted", error.message || "Check the request values and try again.", "INPUT ERROR");
    }
  }
  function submitResourceRelease() {
    if (!requestState) {
      renderRequestOutcome("is-error", "Setup is invalid", "Correct the scenario inputs before releasing resources.", "INPUT VALIDATION");
      return;
    }
    try {
      const p = Number($("release-process").value);
      const release = readActionVector("release");
      const result = window.VigilBanker.releaseResources(requestState, p, release);
      requestState = window.VigilBanker.cloneState(result.state);
      const safetyNote = result.safety.safe ? " The resulting state is safe." : " Note: the resulting state remains unsafe; remaining processes " + result.safety.stuckProcesses.map((index) => scenario.processNames[index]).join(", ") + " cannot currently be proven to finish.";
      recordRequestAction("RELEASE", p, release, "RELEASED", "Resources returned to Available." + safetyNote, "released");
      renderRequestOutcome("is-released", "Resources released", "Released (" + release.join(", ") + ") from " + scenario.processNames[p] + ". Available is now (" + requestState.available.join(", ") + ")." + safetyNote, "STATE UPDATED");
      renderRequestWorkspace();
      for (let r = 0; r < resourceCount(); r += 1) $("release-value-" + r).value = "0";
    } catch (error) {
      renderRequestOutcome("is-error", "Release not applied", error.message || "Check the release values and try again.", "INPUT ERROR");
    }
  }
  $("submit-request").addEventListener("click", submitResourceRequest);
  $("submit-release").addEventListener("click", submitResourceRelease);
  $("request-reset").addEventListener("click", () => {
    syncRequestSession(true);
    renderRequestOutcome("is-idle", "Runtime state reset", "The request simulator has been restored to the current System setup values. Its history has been cleared.", "SESSION RESET");
  });

  // Step 4: interactive, deterministic walkthrough of the Banker's safety proof.
  let safetyResult = null;
  let safetyCursor = -1;
  let safetySnapshot = "";
  let safetyTimer = null;

  function stateSnapshot() {
    return JSON.stringify({ allocation: scenario.allocation, maximum: scenario.maximum, available: scenario.available, processNames: scenario.processNames, resourceNames: scenario.resourceNames });
  }
  function stopSafetyAuto() {
    if (safetyTimer !== null) {
      clearInterval(safetyTimer);
      safetyTimer = null;
    }
    const auto = $("safety-auto");
    if (auto) auto.textContent = "▶ Auto play";
  }
  function makeVectorChip(label, value, className = "") {
    const chip = document.createElement("span");
    chip.className = "vector-chip" + (className ? " " + className : "");
    const name = document.createElement("span");
    name.textContent = label;
    const number = document.createElement("strong");
    number.textContent = String(value);
    chip.append(name, number);
    return chip;
  }
  function paintSafetyNeed() {
    const host = $("safety-need-matrix");
    if (!host) return;
    host.replaceChildren();
    const table = document.createElement("table");
    table.className = "data-matrix";
    const head = document.createElement("thead");
    const hr = document.createElement("tr");
    hr.appendChild(makeCell("th", "process-heading", "PROCESS"));
    scenario.resourceNames.forEach((name) => hr.appendChild(makeCell("th", "", name || "Resource")));
    head.appendChild(hr);
    table.appendChild(head);
    const body = document.createElement("tbody");
    const need = safetyResult ? safetyResult.need : scenario.maximum.map((row,p) => row.map((max,r) => Number.isInteger(max) && Number.isInteger(scenario.allocation[p]?.[r]) && max >= scenario.allocation[p][r] ? max-scenario.allocation[p][r] : "!"));
    for (let p = 0; p < processCount(); p += 1) {
      const tr = document.createElement("tr");
      const traceIndex = safetyResult ? Math.min(safetyCursor, safetyResult.trace.length - 1) : -1;
      const done = traceIndex >= 0 && safetyResult.trace[traceIndex].finish[p];
      const activeProcess = safetyCursor < safetyResult.trace.length && traceIndex > 0 && safetyResult.trace[traceIndex].completedProcess === p;
      tr.classList.toggle("process-finished", Boolean(done));
      tr.classList.toggle("process-current", Boolean(activeProcess));
      tr.appendChild(makeCell("th", "row-heading", scenario.processNames[p]));
      for (let r = 0; r < resourceCount(); r += 1) {
        const val = need[p]?.[r] ?? "!";
        tr.appendChild(makeCell("td", "derived-value", String(val)));
      }
      body.appendChild(tr);
    }
    table.appendChild(body);
    host.appendChild(table);
  }
  function paintSafetyState() {
    const workHost = $("safety-work-vector");
    const finishHost = $("safety-finish-vector");
    if (!workHost || !finishHost) return;
    workHost.replaceChildren();
    finishHost.replaceChildren();
    const traceIndex = safetyResult ? Math.min(safetyCursor, safetyResult.trace.length - 1) : -1;
    const work = traceIndex >= 0 ? safetyResult.trace[traceIndex].work : scenario.available;
    const finish = traceIndex >= 0 ? safetyResult.trace[traceIndex].finish : Array(processCount()).fill(false);
    scenario.resourceNames.forEach((name, r) => workHost.appendChild(makeVectorChip(name, work[r] ?? "!", "work-chip")));
    scenario.processNames.forEach((name, p) => {
      const item = document.createElement("div");
      item.className = "finish-chip" + (finish[p] ? " is-finished" : "");
      item.appendChild(makeCell("span", "finish-process", name));
      item.appendChild(makeCell("strong", "", finish[p] ? "TRUE" : "FALSE"));
      finishHost.appendChild(item);
    });
    paintSafetyNeed();
  }
  function paintSafetyVerdict(kind, title, message, kicker) {
    const host = $("safety-verdict");
    host.className = "safety-verdict " + kind;
    host.querySelector(".verdict-icon").textContent = kind === "is-safe" ? "✓" : kind === "is-unsafe" ? "!" : "◷";
    host.querySelector(".verdict-kicker").textContent = kicker;
    host.querySelector("h2").textContent = title;
    host.querySelector("p").textContent = message;
  }
  function paintSafetyTrace() {
    const list = $("safety-trace-list");
    if (!list) return;
    list.replaceChildren();
    const progress = $("safety-trace-progress");
    const fill = $("safety-progress-fill");
    const stepCount = $("safety-step-count");
    const nextButton = $("safety-next");
    const autoButton = $("safety-auto");
    const explanation = $("safety-explanation");
    const scenarioName = $("safety-scenario-name");
    const meta = $("safety-scenario-meta");
    if (scenarioName) scenarioName.textContent = "Current scenario";
    if (meta) meta.textContent = processCount() + " processes · " + resourceCount() + " resource types";
    if (!safetyResult) {
      list.appendChild(makeEmptyTrace("Fix the input issues in System setup before running a safety check."));
      paintSafetyVerdict("is-pending", "Scenario needs valid inputs", "Return to System setup and correct the highlighted values before running the algorithm.", "INPUT VALIDATION");
      progress.textContent = "INPUT ERROR";
      fill.style.width = "0%";
      stepCount.textContent = "Step 0";
      nextButton.disabled = true;
      if (autoButton) autoButton.disabled = true;
      explanation.querySelector("strong").textContent = "Cannot start yet";
      explanation.querySelector("p").textContent = currentErrors[0] || "Correct the invalid values in the setup panel.";
      paintSafetyState();
      return;
    }
    nextButton.disabled = false;
    if (autoButton) autoButton.disabled = false;
    const trace = safetyResult.trace;
    const displayedIndex = Math.min(safetyCursor, trace.length - 1);
    stepCount.textContent = safetyCursor < 0 ? "Step 0" : "Step " + (safetyCursor + 1);
    progress.textContent = safetyCursor < 0 ? "READY" : "TRACE " + Math.min(safetyCursor + 1, trace.length) + " / " + trace.length;
    fill.style.width = Math.round((Math.max(0, safetyCursor + 1) / (trace.length + (safetyResult.safe ? 0 : 1))) * 100) + "%";
    if (safetyCursor < 0) {
      list.appendChild(makeEmptyTrace("Press Next step to reveal the initial Work and Finish values."));
      paintSafetyVerdict("is-pending", "Check the current system state", "The safety algorithm will search for an unfinished process whose Need is less than or equal to Work.", "READY TO SIMULATE");
      explanation.querySelector("strong").textContent = "Step 0 · Initialize";
      explanation.querySelector("p").textContent = "Work starts as the Available vector. Finish starts false for every process because no process has completed in the simulation yet.";
    } else {
      for (let i = 0; i <= displayedIndex; i += 1) {
        const item = document.createElement("div");
        item.className = "trace-item" + (i === displayedIndex ? " is-current" : "");
        const marker = makeCell("span", "trace-number", String(i).padStart(2,"0"));
        const copy = document.createElement("div");
        copy.className = "trace-copy";
        const title = document.createElement("strong");
        if (i === 0) title.textContent = "Initialize Work and Finish";
        else title.textContent = scenario.processNames[trace[i].completedProcess] + " can finish";
        const desc = document.createElement("p");
        if (i === 0) desc.textContent = "Work = Available. Every Finish flag begins false.";
        else {
          const p = trace[i].completedProcess;
          desc.textContent = "Need (" + safetyResult.need[p].join(", ") + ") ≤ Work before completion. Release Allocation (" + scenario.allocation[p].join(", ") + ") into Work.";
        }
        copy.append(title, desc);
        item.append(marker, copy);
        list.appendChild(item);
      }
      const current = trace[displayedIndex];
      if (current.completedProcess === null) {
        paintSafetyVerdict("is-pending", "Initial state loaded", "Work equals Available (" + current.work.join(", ") + "). Now find a process whose entire Need vector fits within Work.", "INITIAL STATE");
        explanation.querySelector("strong").textContent = "Why this matters";
        explanation.querySelector("p").textContent = "A process is eligible only when every resource requirement can be satisfied by the current Work vector. If it finishes, its allocated resources are returned to Work.";
      } else {
        const p = current.completedProcess;
        paintSafetyVerdict("is-progress", scenario.processNames[p] + " can complete", "Its Need fits within Work. Its current allocation is now returned to Work, allowing the algorithm to check the next process.", "PROCESS COMPLETED");
        explanation.querySelector("strong").textContent = "Why " + scenario.processNames[p] + " was eligible";
        explanation.querySelector("p").textContent = "Need (" + safetyResult.need[p].join(", ") + ") is no greater than Work before completion. Work increases by Allocation (" + scenario.allocation[p].join(", ") + "), and Finish for this process becomes true.";
      }
    }
    if (safetyCursor >= trace.length - 1 && safetyResult.safe) {
      paintSafetyVerdict("is-safe", "SAFE STATE", "All processes can finish in this order: " + safetyResult.safeSequence.map((p) => scenario.processNames[p]).join(" → ") + ". The final Work vector is (" + safetyResult.finalWork.join(", ") + ").", "SAFETY PROVEN");
      progress.textContent = "SAFE · COMPLETE";
      fill.style.width = "100%";
      nextButton.disabled = true;
      explanation.querySelector("strong").textContent = "Proof complete";
      explanation.querySelector("p").textContent = "Every Finish flag is true. This sequence proves the state is safe under the declared maximum claims.";
    } else if (safetyCursor >= trace.length) {
      const stuckNames = safetyResult.stuckProcesses.map((p) => scenario.processNames[p]);
      paintSafetyVerdict("is-unsafe", "UNSAFE STATE", "No unfinished process has Need ≤ Work. The algorithm cannot prove completion for: " + stuckNames.join(", ") + ". Partial sequence: " + safetyResult.partialSequence.map((p) => scenario.processNames[p]).join(" → ") + ".", "SAFETY NOT PROVEN");
      progress.textContent = "UNSAFE · COMPLETE";
      fill.style.width = "100%";
      nextButton.disabled = true;
      explanation.querySelector("strong").textContent = "Why the trace stopped";
      explanation.querySelector("p").textContent = "None of the unfinished processes can meet its remaining Need with the final Work vector (" + safetyResult.finalWork.join(", ") + "). This is an unsafe state, though it does not necessarily mean the system is already deadlocked.";
    }
    paintSafetyState();
  }
  function makeEmptyTrace(message) {
    const empty = document.createElement("div");
    empty.className = "trace-empty";
    empty.appendChild(makeCell("span", "", "01"));
    empty.appendChild(makeCell("p", "", message));
    return empty;
  }
  function resetSafety() {
    stopSafetyAuto();
    safetyCursor = -1;
    safetySnapshot = stateSnapshot();
    currentErrors = collectErrors();
    try {
      safetyResult = currentErrors.length ? null : window.VigilBanker.safetyCheck({
        allocation: scenario.allocation,
        maximum: scenario.maximum,
        available: scenario.available
      });
    } catch (error) {
      safetyResult = null;
      currentErrors = [error.message || "Could not validate the current state."];
    }
    paintSafetyTrace();
  }
  function safetyNextStep() {
    if (safetySnapshot !== stateSnapshot()) resetSafety();
    if (!safetyResult || safetyCursor >= safetyResult.trace.length - 1 && safetyResult.safe || safetyCursor >= safetyResult.trace.length) {
      stopSafetyAuto();
      return;
    }
    safetyCursor += 1;
    paintSafetyTrace();
    if (safetyResult.safe && safetyCursor >= safetyResult.trace.length - 1) stopSafetyAuto();
    if (!safetyResult.safe && safetyCursor >= safetyResult.trace.length) stopSafetyAuto();
  }
  $("safety-next").addEventListener("click", safetyNextStep);
  $("safety-reset").addEventListener("click", resetSafety);
  $("safety-auto").addEventListener("click", () => {
    if (safetyTimer !== null) {
      stopSafetyAuto();
      return;
    }
    if (!safetyResult || safetyCursor >= safetyResult.trace.length - 1 && safetyResult.safe || safetyCursor >= safetyResult.trace.length) resetSafety();
    $("safety-auto").textContent = "Ⅱ Pause";
    safetyTimer = setInterval(safetyNextStep, 1100);
  });

  activateTab("overview");
  setTheme(root.dataset.theme === "light" ? "light" : "dark");
  renderAll();
  resetSafety();
})();