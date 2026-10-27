/* Vigil UI shell. Algorithm and risk logic will live in dedicated modules in later steps. */
(() => {
  "use strict";
  const root = document.documentElement;
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-panel]"));
  const breadcrumb = document.getElementById("breadcrumb-current");
  const themeButton = document.getElementById("theme-toggle");
  const themeIcon = themeButton?.querySelector(".theme-icon");
  const labels = { overview: "Overview", setup: "System setup", safety: "Safety check", requests: "Requests", risk: "Risk intelligence", compare: "Policy comparison", learn: "Learn & export" };

  // Vigil keeps navigation in memory only. It intentionally does not use localStorage.
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

  document.querySelectorAll("[data-go-tab]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.goTab, true));
  });

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

  // Vigil starts at Overview. The scaffold needs no remote state or browser storage.
  activateTab("overview");
  setTheme(root.dataset.theme === "light" ? "light" : "dark");
})();