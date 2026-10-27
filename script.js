/* Vigil UI and Step 3 scenario editor. Scenario state is in memory only. */
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

  function renderAll() {
    renderMatrix("maximum-matrix", "maximum");
    renderMatrix("allocation-matrix", "allocation");
    renderAvailable();
    refreshDerived();
    $("setup-state-label").textContent = processCount() + " process" + (processCount() === 1 ? "" : "es") + " · " + resourceCount() + " resource type" + (resourceCount() === 1 ? "" : "s");
  }

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
      tr.classList.toggle("process-finished", Boolean(done));
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