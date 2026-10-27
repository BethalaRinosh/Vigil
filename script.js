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
  }

  function loadScenario(next) {
    scenario = cloneScenario(next);
    $("process-count").value = String(processCount());
    $("resource-count").value = String(resourceCount());
    renderAll();
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

  activateTab("overview");
  setTheme(root.dataset.theme === "light" ? "light" : "dark");
  renderAll();
})();