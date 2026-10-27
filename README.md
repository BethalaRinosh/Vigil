# Vigil

**VIGIL: Deadlock Avoidance with Heuristic Risk Intelligence**  
Full project title: **Resource Allocation and Deadlock Prevention using Banker's Algorithm with Intelligent Risk Analysis**

Vigil is a second-year B.Tech AI & ML Operating Systems micro project: a browser-based learning lab for resource allocation, textbook deadlock avoidance, and transparent heuristic risk analysis.

> **Current status:** Steps 1–3 of 11 are complete. The pure algorithm layer, Node tests, and interactive scenario editor are available.

## Progress checklist

- [x] **Step 1:** Repo setup and scaffold
- [x] **Step 2:** Core Banker's algorithms and Node tests
- [x] **Step 3:** Setup/input panel and validation
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

- `index.html` — page structure, Vigil branding, navigation, and scenario editor markup.
- `style.css` — theme variables, responsive layout, component styles, editable matrix styles, and reduced-motion handling.
- `script.js` — navigation, theme interactions, in-memory scenario editor, matrix rendering, validation, and scenario presets.
- `banker.js` — pure Need, safety, request, release, and state-validation functions.
- `tests.js` — Node.js tests for the textbook scenario, request outcomes, unsafe state, release, and invalid inputs.

## Step 3 scenario editor

The **System setup** tab supports 1–10 processes and 1–6 resource types. Process and resource names are editable, as are the Maximum and Allocation matrices and Available vector. Need is computed live as Maximum minus Allocation and is not directly editable. Inline validation checks integer/non-negative values, matrix bounds, and Allocation ≤ Maximum. The editor includes Textbook example, Unsafe example, Random generate, Reset, and Validate scenario actions. Changing dimensions preserves values in the overlapping part of the matrices and initializes new cells to zero. Scenario data stays in memory and is not persisted.

The Textbook example loads the classic five-process, three-resource example. The Unsafe example loads a compact three-process, two-resource state that has no safe sequence.

## Step 2 algorithm API and tests

`banker.js` exports `calculateNeed(allocation, maximum)`, `safetyCheck(state)`, `requestResources(state, processIndex, request)`, `releaseResources(state, processIndex, release)`, `validateState(state)`, and `cloneState(state)`. The module runs in Node.js and does not access the DOM. Requests return `GRANTED`, `DENIED`, or `MUST WAIT`; tentative grants are applied to a cloned state and accepted only if the resulting state is safe. The caller's state is not mutated. The safety check scans eligible processes circularly from the process after the last completion. This is a deterministic tie-breaking choice: any eligible process may be selected by the textbook safety algorithm, and this scan yields the requested demonstration sequence.

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

## Context review — Step 3

**Context review done.** Re-checked the full project requirements, this README, and all six existing project files. Vigil naming, vanilla HTML/CSS/JS structure, tab/panel wiring, Step 2 algorithm/test contracts, no-persistence requirement, and step ordering remain consistent. The Step 3 review found stale process/resource labels across sibling matrices after a name edit and two obsolete helper functions; the label synchronization was fixed by re-rendering after a committed name change, and the unused helpers were removed. Static integrity checks found no duplicate HTML IDs, no JavaScript references to missing fixed DOM IDs, and no tab/panel mismatch. A real browser check and fresh `node tests.js` run from a repository clone remain unverified because outbound GitHub network access is unavailable in the current execution environment.

## Change log

### Step 1 — Repo setup and scaffold

- Created the HTML, CSS, and JavaScript foundation with Vigil branding.
- Added all seven navigation tabs and responsive placeholder panels.
- Added in-memory navigation, dark/light theme toggle, keyboard navigation, and reduced-motion support.
- Added the README and progress checklist.

### Step 2 — Core algorithms and tests

- Implemented Need calculation, the textbook safety algorithm, resource request handling, resource release, and input validation in `banker.js`.
- Added Node.js tests for the required textbook sequence and request outcomes, an unsafe example, releases, and invalid inputs.
- Executed the 9 test cases under Node.js in a local test harness; all passed after adjusting the deterministic safe-sequence scan to match the required textbook demonstration.
- Algorithm logic remains pure and separate from the UI.

### Step 3 — Setup/input panel

- Added editable process/resource dimensions, process names, resource names, Maximum and Allocation matrices, and Available vector.
- Added live Need calculation and inline input validation.
- Added Textbook example, Unsafe example, Random generate, Reset, and Validate scenario actions.
- Added responsive matrix scrolling and input-specific accessibility labels.
- Kept all scenario state in memory without localStorage.
- Health/bug audit: checked all six planned files, required HTML-to-JavaScript IDs, matching tab/panel keys, script/style paths, algorithm exports, and existing required algorithm-test cases. Fixed stale cross-matrix process/resource labels after name edits and removed obsolete helpers.
- Browser rendering and a fresh repository-clone test run could not be executed in this environment because outbound GitHub network access is unavailable; these remain manual verification items.
