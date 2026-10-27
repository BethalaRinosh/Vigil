# Vigil

**VIGIL: Deadlock Avoidance with Heuristic Risk Intelligence**  
Full project title: **Resource Allocation and Deadlock Prevention using Banker's Algorithm with Intelligent Risk Analysis**

Vigil is a second-year B.Tech AI & ML Operating Systems micro project: a browser-based learning lab for resource allocation, textbook deadlock avoidance, and transparent heuristic risk analysis.

> **Current status:** Steps 1 and 2 of 11 are complete. The pure algorithm layer and Node test suite are available; the interactive matrix editor is planned for Step 3.

## Progress checklist

- [x] **Step 1:** Repo setup and scaffold
- [x] **Step 2:** Core Banker's algorithms and Node tests
- [ ] **Step 3:** Setup/input panel and validation
- [ ] **Step 4:** Step-by-step safety check
- [ ] **Step 5:** Resource request and release workflow
- [ ] **Step 6:** Heuristic risk engine and formulas
- [ ] **Step 7:** Risk visualizations
- [ ] **Step 8:** Banker's vs. naive policy comparison
- [ ] **Step 9:** Learning guide and JSON scenario import/export
- [ ] **Step 10:** UI polish, animation, accessibility, and responsiveness review
- [ ] **Step 11:** Final documentation, viva cheatsheet, and demo script

## What exists now

- Responsive dark/light theme shell with Vigil branding.
- Seven navigation tabs: Overview, System setup, Safety check, Requests, Risk intelligence, Policy comparison, and Learn & export.
- Keyboard navigation for tabs and theme shortcuts (D for dark, L for light).
- Placeholder panels identifying which later step will implement each workspace.
- Reduced-motion CSS support and responsive layouts.
- No framework, build step, localStorage, or runtime dependency for the scaffold.

Risk analysis will be labelled honestly as **heuristic risk analysis**, not machine learning. Heuristic scores are explanatory signals and do not replace the formal safety algorithm.

## How to run

No install or build process is required.

1. Clone or download this repository.
2. Open `index.html` directly in a modern browser.
3. Use the left navigation to move between workspace sections.
4. Use **Toggle appearance** to switch between dark and light themes.

Inter is loaded from Google Fonts when a network connection is available; system fonts are used as fallback. Chart.js is planned for Step 7 and is not required by this scaffold.

## Project files

- `index.html` — page structure, Vigil branding, navigation, and section panels.
- `style.css` — theme variables, responsive layout, component styles, and reduced-motion handling.
- `script.js` — navigation and theme interactions; state remains in memory.
- `banker.js` — pure Need, safety, request, release, and state-validation functions.
- `tests.js` — Node.js tests for the textbook scenario, request outcomes, unsafe state, release, and invalid inputs.

## Step 2 algorithm API and tests

`banker.js` exports `calculateNeed(allocation, maximum)`, `safetyCheck(state)`, `requestResources(state, processIndex, request)`, `releaseResources(state, processIndex, release)`, `validateState(state)`, and `cloneState(state)`. The module runs in Node.js and does not access the DOM. Requests return `GRANTED`, `DENIED`, or `MUST WAIT`; tentative grants are applied to a cloned state and accepted only if the resulting state is safe. The caller's state is not mutated.

Run the automated tests from the repository root with Node.js:

\`\`\`sh
node tests.js
\`\`\`

The tests cover the textbook safe sequence `P1, P3, P4, P0, P2`, granting P1's `(1,0,2)` request, denying P0's subsequent `(0,2,0)` request as unsafe, an unsafe initial state, Need calculations, release behavior, and invalid state inputs.

## Design and correctness commitments

- Implement textbook safety and resource-request algorithms independently of the DOM, with Node tests.
- Green means safe/granted, amber means caution, and red means unsafe/denied. Meaning will never rely on color alone.
- Show risk rules and weights transparently; heuristic scores are not formal safety proofs.
- Vigil is an educational client-side simulation, not an operating-system resource manager.
- Do not persist scenario state in localStorage.

## Change log

### Step 1 — Repo setup and scaffold

- Created the HTML, CSS, and JavaScript foundation with Vigil branding.
- Added all seven navigation tabs and responsive placeholder panels.
- Added in-memory navigation, dark/light theme toggle, keyboard navigation, and reduced-motion support.
- Added the README and progress checklist.

### Step 2 — Core algorithms and tests

- Implemented Need calculation, the textbook safety algorithm, resource request handling, resource release, and input validation in `banker.js`.
- Added Node.js tests for the required textbook sequence and request outcomes, an unsafe example, releases, and invalid inputs.
- Algorithm logic remains pure and separate from the UI.
