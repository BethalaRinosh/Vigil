# Vigil

**VIGIL: Deadlock Avoidance with Heuristic Risk Intelligence**  
Full project title: **Resource Allocation and Deadlock Prevention using Banker's Algorithm with Intelligent Risk Analysis**

Vigil is a second-year B.Tech AI & ML Operating Systems micro project: a browser-based learning lab for resource allocation, textbook deadlock avoidance, and transparent heuristic risk analysis.

> **Current status:** Steps 1–7 of 11 are implemented. Vigil includes transparent heuristic risk analysis with interactive resource, process-score, and completion-path visualizations.

## Progress checklist

- [x] **Step 1:** Repo setup and scaffold
- [x] **Step 2:** Core Banker's algorithms and Node tests
- [x] **Step 3:** Setup/input panel and validation
- [x] **Step 4:** Step-by-step safety check
- [x] **Step 5:** Resource request and release workflow
- [x] **Step 6:** Heuristic risk engine and formulas
- [x] **Step 7:** Risk visualizations
- [ ] **Step 8:** Banker's vs. naive policy comparison
- [ ] **Step 9:** Learning guide and JSON scenario import/export
- [ ] **Step 10:** UI polish, animation, accessibility, and responsiveness review
- [ ] **Step 11:** Final documentation, viva cheatsheet, and demo script

## What exists now

- Responsive dark/light theme shell with Vigil branding.
- Seven navigation tabs: Overview, System setup, Safety check, Requests, Risk intelligence, Policy comparison, and Learn & export.
- Keyboard navigation for tabs and theme shortcuts (D for dark, L for light).
- Remaining placeholder panels identify which later step will implement each unfinished workspace.
- Reduced-motion CSS support and responsive layouts.
- No framework, build step, localStorage, or runtime dependency for the scaffold.

Risk analysis will be labelled honestly as **heuristic risk analysis**, not machine learning. Heuristic scores are explanatory signals and do not replace the formal safety algorithm.

## How to run

No install or build process is required.

1. Clone or download this repository.
2. Open `index.html` directly in a modern browser.
3. Use the left navigation to move between workspace sections.
4. Use **Toggle appearance** to switch between dark and light themes.

Inter is loaded from Google Fonts when a network connection is available; system fonts are used as fallback. Chart.js may be introduced for Step 7 risk visualizations; it is not required by the current implementation.

## Project files

- `index.html` — page structure, navigation, scenario editor, safety trace, request/release workspace, and risk intelligence visualizations.
- `style.css` — responsive theme, editable matrices, safety trace, request/release forms, risk cards, SVG chart styles, and history timeline.
- `script.js` — in-memory scenario editor, safety walkthrough, request/release workflow, risk UI, interactive SVG charts, what-if comparisons, and validation.
- `banker.js` — pure Need, safety, request, release, and state-validation functions.
- `risk.js` — pure heuristic risk scoring, bounded safe-sequence enumeration, and what-if analysis.
- `tests.js` — Node.js tests for safety traces, request outcomes, transaction immutability, releases, and invalid inputs.

## Step 7 risk visualizations

The Risk Intelligence workspace includes three visual summaries rendered as native SVG and HTML, with no chart-library dependency:

- **Allocated vs. available:** resource-by-resource stacked bars show allocated instances compared with instances still Available. Each resource uses the same scale within the chart, with numeric counts alongside the bars.
- **Process risk profile:** a 0–100 bar chart compares each process's heuristic score. Bars are keyboard-focusable and selectable; choosing a bar updates the process-factor detail and corresponding process-list selection.
- **Completion pathway:** process nodes visualize the deterministic safety proof. A safe state shows the complete sequence; an unsafe state shows the partial completion sequence followed by blocked processes. The badge explicitly marks SAFE or UNSAFE.

The charts redraw from the current scenario and heuristic assessment. They use the existing `VigilBanker` safety result and `VigilRisk` assessment rather than calculating their own safety verdicts. The charts are responsive, use the current light/dark theme variables, and expose accessible labels and keyboard interaction for process selection. No external chart package, build step, or browser storage was added.

## Step 6 heuristic risk analysis

The **Risk intelligence** workspace evaluates the current configured scenario with a deterministic, explainable heuristic. This is **not machine learning**, does not predict a probability of deadlock, and does not replace the formal Banker's safety algorithm. It reports a per-process score from 0–100, a system-level score and risk band, resource utilization, a bounded count of distinct safe sequences, minimum slack, and plain-language recommendations.

### Per-process score

`Process score = 0.40 × Need pressure + 0.35 × Competition + 0.25 × Sequence fragility`

- **Need pressure:** for each resource, `Need / (Need + Available) × 100`; average the resource values. A zero Need contributes zero.
- **Competition:** for resources with positive Need, count the fraction of other processes that hold or still claim that resource; average across resource types.
- **Sequence fragility:** a normalized safe-sequence position, where later positions score higher. A process blocked in an unsafe partial proof receives 100 for this component.
- Bands: Low (0–24), Medium (25–49), High (50–74), Critical (75–100).

### System-level score

`System score = 0.35 × Utilization + 0.35 × Sequence scarcity + 0.30 × Slack pressure`

- **Utilization:** `total allocated / (total allocated + total Available) × 100`. If no instances exist, utilization is zero.
- **Sequence scarcity:** 100 if there is no safe sequence; otherwise `min(100, 100 / √(distinct safe sequence count))`.
- **Slack pressure:** 100 when minimum slack is negative; otherwise `100 / (1 + minimum slack)`.
- A state that fails the formal safety check is always classified as **Critical**, regardless of its weighted score.
- The distinct-sequence enumerator stops at 1,000 sequences to bound computation. The UI displays `≥1,000` when that cap is reached; the score uses the capped count.

The minimum slack is the smallest `Work[r] - Need[p][r]` margin along the deterministic safe proof. For an unsafe state, it is the most negative per-process minimum margin among blocked processes at the point the safety scan stops, so a negative value signals that the safety scan cannot find a process whose Need fits Work.

### What-if analysis

The what-if lab evaluates a hypothetical request using the same Banker's request algorithm, then compares the heuristic score before and after a tentative grant. A granted hypothetical request can change the after-state assessment; a denied or waiting request leaves the state unchanged. This analysis does not commit changes to the request simulator or the configured setup. Recommendations describe the outcome and heuristic trend, while the formal safety decision remains authoritative.

**Interpretation caution:** These hand-designed weights are transparent heuristic choices, not empirically calibrated probabilities. A low score does not guarantee future safety, and a high score alone does not prove deadlock.

## Step 5 resource requests and releases

Open **Resource requests** to experiment with the current System setup. The request vector is checked by the pure `VigilBanker.requestResources()` API. Vigil reports **GRANTED**, **DENIED**, or **MUST WAIT** with the algorithm's reason. A request is only committed when the tentative state passes the safety check; denied and waiting requests leave the runtime state unchanged. The release workflow validates that a process cannot return more instances than its current Allocation, then updates Available and Allocation.

The workspace shows the current runtime Available vector, Allocation matrix, and Need matrix, plus a newest-first action history with timestamps, vectors, outcomes, and reasons. **Reset to setup** restores the current System setup values and clears the history. Editing or loading a different setup scenario also starts a fresh transaction session. Transaction state and history are memory-only and are not persisted. The request simulator has its own runtime copy so experimenting does not silently overwrite the configured setup scenario.

## Step 4 safety walkthrough

Open the **Safety check** tab after loading or editing a scenario in **System setup**. **Next step** advances the trace, **Auto play** advances at a readable pace and can be paused, and **Reset** returns to the initial state. The view shows the current Work vector, Finish flags, Need matrix, process completion order, and plain-English reasoning for each step. A safe state ends with the proven completion sequence and final Work vector. An unsafe state ends when no unfinished process has Need less than or equal to Work and names the processes that remain unfinished. Changing scenario inputs resets the walkthrough so the trace cannot silently refer to an old state.

The safety trace is computed by the pure `VigilBanker.safetyCheck()` function from `banker.js`; the UI does not reimplement the algorithm. A safe state is not a guarantee that every future request will be safe, and an unsafe state does not necessarily mean the system is already deadlocked.

## Step 3 scenario editor

The **System setup** tab supports 1–10 processes and 1–6 resource types. Process and resource names are editable, as are the Maximum and Allocation matrices and Available vector. Need is computed live as Maximum minus Allocation and is not directly editable. Inline validation checks integer/non-negative values, matrix bounds, and Allocation ≤ Maximum. The editor includes Textbook example, Unsafe example, Random generate, Reset, and Validate scenario actions. Changing dimensions preserves values in the overlapping part of the matrices and initializes new cells to zero. Scenario data stays in memory and is not persisted.

The Textbook example loads the classic five-process, three-resource example. The Unsafe example loads a compact three-process, two-resource state that has no safe sequence.

## Step 2 algorithm API and tests

`banker.js` exports `calculateNeed(allocation, maximum)`, `safetyCheck(state)`, `requestResources(state, processIndex, request)`, `releaseResources(state, processIndex, release)`, `validateState(state)`, and `cloneState(state)`. The module runs in Node.js and does not access the DOM. Requests return `GRANTED`, `DENIED`, or `MUST WAIT`; tentative grants are applied to a cloned state and accepted only if the resulting state is safe. The caller's state is not mutated. The safety check scans eligible processes circularly from the process after the last completion. This is a deterministic tie-breaking choice: any eligible process may be selected by the textbook safety algorithm, and this scan yields the requested demonstration sequence.

Run the automated tests from the repository root with Node.js:

\`\`\`sh
node tests.js
\`\`\`

The 14 tests cover the textbook safe sequence `P1, P3, P4, P0, P2`, granting P1's `(1,0,2)` request, denying P0's subsequent `(0,2,0)` request as unsafe, an unsafe initial state, Need calculations, release behavior and limits, invalid state inputs, safety-trace invariants, and the immutability of denied or waiting transactions.

## Design and correctness commitments

- Implement textbook safety and resource-request algorithms independently of the DOM, with Node tests.
- Green means safe/granted, amber means caution, and red means unsafe/denied. Meaning will never rely on color alone.
- Show risk rules and weights transparently; heuristic scores are not formal safety proofs.
- Vigil is an educational client-side simulation, not an operating-system resource manager.
- Do not persist scenario state in localStorage.

## Context review — Step 7

**Context review done.** Re-checked the seven repository files after adding the visualizations. The risk charts are based on the same scenario and risk assessment used by Step 6: allocated/available counts come from the scenario vectors, process bars use existing process scores, and the pathway uses the formal safety result's complete or partial sequence. Process chart selection updates the existing process detail view, including keyboard activation. SVG nodes are created with DOM APIs and text is inserted as text, not raw HTML. Static checks confirm chart containers and fixed DOM references exist, scripts load in dependency order, tabs match panels, and no duplicate IDs were introduced. The 19 algorithm/risk tests passed previously in an isolated JavaScript harness; this turn's latest full suite and live browser rendering still require verification.

## Context review — Step 6

**Context review done.** Re-checked the six existing files and the new `risk.js` module against the project constraints. Step 6 is explicitly labeled heuristic risk analysis, not machine learning. The scoring inputs and weights are exposed in the UI; the formal Banker API remains the source of truth for safety and request decisions. The system score combines utilization, safe-sequence scarcity, and minimum slack; distinct sequence enumeration is capped at 1,000. What-if comparisons use a tentative request and never mutate the configured scenario. The risk module is pure JavaScript and requires no build step or browser storage. The 19-case test suite passed in an isolated JavaScript harness using a small Node-assert-compatible shim; native Node execution and live browser interaction have not been independently verified in this environment.

## Context review — Step 5

**Context review done.** Re-checked all six project files after Step 5. The existing pure Banker API remains the single source of truth for request/release decisions. The new transaction workspace keeps a cloned runtime state separate from the configured setup, commits only granted requests, blocks invalid releases, displays Available/Allocation/Need after actions, and records an in-memory audit trail. Changing setup values resets the transaction session, and no browser storage is used. Static checks found no duplicate HTML IDs, missing fixed DOM references, tab/panel mismatches, or invalid in-panel navigation targets. Fresh-clone Node tests and browser/console checks remain unverified because GitHub network access is unavailable in the current execution environment.

### Step 4 — Step-by-step safety check

- Replaced the Safety check placeholder with a step-by-step algorithm trace.
- Added Next step, Auto play / Pause, and Reset controls.
- Added live Work and Finish vectors, Need matrix, current-process highlight, and plain-English explanations.
- Added final SAFE / UNSAFE verdicts, safe sequence, final Work vector, and stuck-process list.
- Reset the trace when the scenario changes to avoid stale results.
- Fixed final unsafe-state rendering to clamp vector reads to the last valid trace record.
- Added two Node tests for safety trace invariants. Run `node tests.js` from the repository root.

### Step 7 — Risk visualizations

- Added responsive SVG visualizations for resource allocation versus availability, per-process risk scores, and the safety completion pathway.
- Process risk bars are selectable by mouse or keyboard and stay synchronized with the process-factor detail and process list.
- Safe states show the full completion sequence; unsafe states show the partial sequence and blocked processes.
- The charts use existing scenario and risk-analysis data, follow the light/dark theme, and require no chart dependency.
- Verification: syntax and static repository checks are being repeated; browser rendering has not been manually verified.

### Step 6 — Heuristic risk engine and formulas

- Added `risk.js`, a pure heuristic analysis module that enumerates distinct safe sequences up to a 1,000-sequence cap and calculates process/system risk indicators.
- Added per-process 0–100 scores from Need pressure, competition, and safe-sequence position.
- Added system risk levels from utilization, sequence scarcity, and minimum slack; formally unsafe states are always Critical.
- Replaced the Risk intelligence placeholder with system metrics, selectable process details, contributing-factor bars, recommendations, and an expandable formula/weights explanation.
- Added a what-if request lab that compares before/after risk and safety outcomes without committing changes.
- Added five automated cases covering risk bounds, unsafe-state classification, sequence cap, granted what-if, and denied what-if immutability.
- Verification: all 19 tests passed in an isolated JavaScript harness. Static file/ID/tab checks are being re-run; native Node and live-browser verification remain pending.

### Step 5 — Resource request and release workflow

- Replaced the request placeholder with request and release forms that adapt to the current process/resource setup.
- Routed requests through `VigilBanker.requestResources()` and releases through `VigilBanker.releaseResources()`.
- Added GRANTED, DENIED, MUST WAIT, and RELEASED outcomes with plain-language explanations.
- Added current runtime Available, Allocation, and Need views, plus a newest-first, in-memory history with timestamps.
- Kept transaction state separate from the setup scenario; granted requests and valid releases update only the runtime copy. Reset or setup changes clear the transaction history.
- Added tests for unsafe tentative-grant immutability, waiting-request immutability, and release limits.
- Health audit: static file/ID/tab checks passed. Fresh `node tests.js` and live-browser validation remain pending because outbound GitHub access is unavailable in this environment.

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
- Health/bug audit: checked required HTML-to-JavaScript IDs, matching tab/panel keys, script/style paths, algorithm exports, and test coverage. Fixed stale cross-matrix process/resource labels after name edits and removed obsolete helpers.
- Browser rendering and a fresh repository-clone test run could not be executed in this environment because outbound GitHub network access is unavailable; these remain manual verification items.
