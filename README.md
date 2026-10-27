# VIGIL
### Deadlock Avoidance with Heuristic Risk Intelligence

[![CI](https://github.com/BethalaRinosh/Vigil/actions/workflows/ci.yml/badge.svg)](https://github.com/BethalaRinosh/Vigil/actions/workflows/ci.yml)

**VIGIL is an interactive Operating Systems learning lab for exploring resource allocation, verifying safe states with Banker's Algorithm, and understanding how resource pressure affects system risk.** It combines a step-by-step safety proof with an explainable heuristic risk layer and a controlled comparison against a naive allocation policy.

Built as a second-year B.Tech CSE (AI & ML) Operating Systems micro-project, VIGIL runs entirely in the browser. It has no backend, database, framework, build step, or npm runtime dependencies.

> **Important:** VIGIL is an educational simulator, not an operating-system kernel, scheduler, live system monitor, machine-learning model, or production deadlock-prevention service. The formal safety result comes from Banker's Algorithm. Risk scores are transparent heuristics and must not be interpreted as probabilities.

## Contents

- [Why VIGIL?](#why-vigil)
- [Features](#features)
- [Run the application](#run-the-application)
- [Run tests](#run-tests)
- [Explore the seven workspaces](#explore-the-seven-workspaces)
- [How the algorithms work](#how-the-algorithms-work)
- [Risk intelligence: formulas and interpretation](#risk-intelligence-formulas-and-interpretation)
- [Policy comparison experiment](#policy-comparison-experiment)
- [Scenario JSON import and export](#scenario-json-import-and-export)
- [Project structure](#project-structure)
- [Technology and design](#technology-and-design)
- [Limitations and assumptions](#limitations-and-assumptions)
- [Documentation](#documentation)
- [Contributing and support](#contributing-and-support)

## Why VIGIL?

Deadlock avoidance is easier to understand when the state changes are visible. VIGIL lets you configure a small resource-allocation system, follow the safety algorithm one decision at a time, submit hypothetical resource requests, and compare the outcomes of two allocation policies under the same workload.

The project keeps **formal correctness** and **heuristic interpretation** separate:

- **Banker's Algorithm** determines whether a state is safe and whether a tentative request can be granted.
- **Risk intelligence** explains resource pressure and sequence fragility using explicit, inspectable rules.
- **Policy comparison** demonstrates what can happen when a policy checks resource availability but skips the post-grant safety test.

## Features

- **Editable system scenarios:** configure 1–10 processes and 1–6 resource types, edit process/resource names, and change Maximum, Allocation, and Available values.
- **Live Need matrix:** calculate `Need = Maximum − Allocation` automatically.
- **Step-by-step safety proof:** inspect Work, Finish flags, each process completion, the resulting safe sequence, or the blocked processes in an unsafe state.
- **Resource request simulator:** see whether a request is granted, denied, or must wait, with a reason. Tentative grants are committed only when the resulting state is safe.
- **Resource release workflow:** release allocated instances with validation and a transaction history.
- **Explainable risk intelligence:** view system and per-process heuristic scores, risk bands, resource utilization, safe-sequence scarcity, minimum slack, and recommendations.
- **Interactive visualizations:** explore allocated versus available resources, process risk profiles, and the completion pathway.
- **What-if analysis:** evaluate a hypothetical request and compare before/after heuristic assessments without committing it to the active scenario.
- **Policy comparison:** replay the same seeded request workload against Banker's Algorithm and an availability-only naive policy.
- **Scenario portability:** validate, import, inspect, and download versioned scenario JSON.
- **Built-in learning guide:** review OS concepts, assumptions, and the distinction between safe and unsafe states.
- **Responsive themes and keyboard focus:** switch between dark and light appearance, use keyboard-visible focus styles, and respect reduced-motion preferences.
- **Regression tests and CI:** run the algorithm suite locally or through GitHub Actions.

## Run the application

### Requirements

- A modern browser.
- Optional, for development checks: [Node.js](https://nodejs.org/) 18 or newer.
- An internet connection is only needed to fetch the optional Inter font from Google Fonts. The app falls back to system fonts.

### Option A: open locally

1. Clone the repository or download the source:
   ```sh
   git clone https://github.com/BethalaRinosh/Vigil.git
   cd Vigil
   ```
2. Open `index.html` in your browser.

No `npm install`, bundler, server, API key, or environment configuration is required for normal use.

### Option B: run a local static server

If you prefer serving the files locally, use any static-file server. For example, with Python installed:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Stop the server with `Ctrl+C`.

## Run tests

From the repository root, with Node.js 18 or newer:

```sh
npm test
```

Runs the regression suite.

```sh
npm run check:syntax
```

Checks syntax for all six JavaScript files.

```sh
npm run check
```

Runs syntax checks followed by the full regression suite. No npm packages need to be installed.

The suite covers the textbook scenario and safe sequence, grant/deny/wait behavior, releases, invalid states, trace invariants, input immutability, risk scoring, safe-sequence enumeration limits, what-if analysis, deterministic policy comparison, and scenario JSON validation. The latest local run reported **27 passing tests** and successful syntax checks.

GitHub Actions is configured to run the syntax checks and tests on pushes and pull requests targeting `main`. See the [workflow](.github/workflows/ci.yml) for details.

## Explore the seven workspaces

| Workspace | What you can do |
| --- | --- |
| **Overview** | Get oriented and jump into the lab. |
| **System setup** | Configure processes, resource types, Maximum, Allocation, and Available; load textbook, unsafe, or random examples. |
| **Safety check** | Step through the safety algorithm, play or pause the trace, and inspect the final proof. |
| **Requests** | Submit resource requests and releases, inspect outcomes, and review the action history. |
| **Risk intelligence** | Explore system/process risk scores, factor breakdowns, charts, completion pathway, and what-if analysis. |
| **Policy comparison** | Compare Banker's Algorithm with a naive availability-only policy over a reproducible workload. |
| **Learn & export** | Review core concepts and import, validate, inspect, or download scenario JSON. |

### A quick first experiment

1. Open **System setup** and load the textbook example.
2. Open **Safety check** and step through the proof. One valid safe sequence is `P1 → P3 → P4 → P0 → P2`.
3. Open **Requests** and try process `P1` requesting `(1, 0, 2)`. The request should be granted for the textbook state.
4. Then try process `P0` requesting `(0, 2, 0)` in the resulting runtime session. It should be denied if the tentative grant makes the state unsafe.
5. Open **Risk intelligence** to compare the formal safety result with the heuristic signals.
6. Open **Policy comparison** and run the default textbook experiment to see why omitting the safety test can allow unsafe grants.

The UI's request session is separate from the configured setup. If you want to restart the experiment, use **Reset to setup** in the Requests workspace or reload the textbook scenario.

## How the algorithms work

### Banker's Algorithm

For each process (P_i) and resource type (R_j):

```text
Need[i][j] = Maximum[i][j] - Allocation[i][j]
```

The safety check starts with:

- `Work = Available`
- `Finish[i] = false` for every process

It repeatedly finds an unfinished process whose entire Need vector is less than or equal to Work. That process can finish, so its allocated resources are returned to Work and it is marked finished. If every process can finish, the state is **safe** and the completion order is a safe sequence. If the scan stops with unfinished processes, the state is **unsafe** under the declared maximum claims and current allocation.

A resource request is checked against the process's remaining Need and current Available resources. VIGIL tentatively applies a valid request to a cloned state and runs the safety check. The tentative state is committed only if it remains safe. Invalid, denied, and waiting requests do not mutate the caller's state.

The safety scan uses deterministic tie-breaking to produce a repeatable demonstration sequence. Other valid safe sequences may exist.

### Result vocabulary

- **SAFE:** at least one complete process completion sequence exists under the model assumptions.
- **UNSAFE:** the safety algorithm cannot find a complete sequence from the current state. This does not necessarily mean a real system is already deadlocked.
- **GRANTED:** a request passed validation, availability, and the post-grant safety check.
- **DENIED:** the request is invalid for the process or its tentative grant would leave the state unsafe.
- **MUST WAIT:** the request exceeds currently available resources but may be possible later.

## Risk intelligence: formulas and interpretation

Risk intelligence is a **deterministic, hand-designed heuristic**, not machine learning and not a calibrated probability of deadlock. Its purpose is to make resource pressure and safety-proof fragility easier to inspect.

### Per-process score

```text
Process score =
  0.40 × Need pressure
+ 0.35 × Competition
+ 0.25 × Sequence fragility
```

- **Need pressure:** for each resource, `Need / (Need + Available) × 100`; the resource values are averaged. A zero Need contributes zero.
- **Competition:** for resources with positive Need, the fraction of other processes that hold or still claim that resource; averaged across resource types.
- **Sequence fragility:** a normalized safe-sequence position, with later positions scoring higher. A process left blocked by an unsafe partial proof receives 100 for this factor.

Per-process bands: **Low** (0–24), **Medium** (25–49), **High** (50–74), and **Critical** (75–100).

### System-level score

```text
System score =
  0.35 × Utilization
+ 0.35 × Sequence scarcity
+ 0.30 × Slack pressure
```

- **Utilization:** `total allocated / (total allocated + total Available) × 100`. If there are no resource instances, utilization is zero.
- **Sequence scarcity:** 100 if no safe sequence exists; otherwise `min(100, 100 / √(distinct safe sequence count))`.
- **Slack pressure:** 100 when minimum slack is negative; otherwise `100 / (1 + minimum slack)`.
- A state that fails the formal safety check is always classified as **Critical**, regardless of its weighted score.

Safe-sequence enumeration is capped at 1,000 sequences to bound computation. When the cap is reached, the result is a lower bound rather than an exact total.

### How to read the score

Treat the score as an **explanatory indicator**, not a verdict. The safety algorithm decides whether the current state is safe under the model. A low heuristic score does not guarantee future safety, and a high score alone does not prove deadlock. The weights are design choices, not values learned or calibrated from a dataset.

## Policy comparison experiment

The Policy comparison workspace creates one deterministic, seeded sequence of resource requests and replays that exact ordered workload against two policies from equivalent copies of the starting scenario.

- **Banker's policy:** validates each request against remaining Need and Available, then grants it only if the tentative state is safe.
- **Naive availability-only policy:** validates Need and Available but deliberately skips the post-grant safety check.

You can choose 50, 100, 250, or 500 trials and a seed from 0 to 2,147,483,647. Reusing the same setup and seed reproduces the workload. The default textbook experiment uses seed 5 to demonstrate unsafe grants under the naive policy; other seeds may produce no unsafe grants, which is a valid result.

The report distinguishes grants, waits, Need rejections, unsafe denials, unsafe grants, safe-to-unsafe transitions, unsafe post-request rounds, final safety, and a request-by-request ledger for the first 20 trials. This is a controlled teaching experiment, not a proof about every possible workload.

## Scenario JSON import and export

Scenario JSON uses a versioned envelope:

- `format`: `"vigil-scenario"`
- `version`: `1`
- `exportedAt`: export timestamp
- `scenario`: process/resource names, Allocation, Maximum, and Available

From **Learn & export**, you can show the current JSON, download the current scenario, paste JSON into the editor, or choose a JSON file to import.

Before loading, VIGIL validates the format and version, dimensions, names, non-negative integer values, and `Allocation ≤ Maximum`. Imports larger than 1 MB are rejected. A failed import leaves the current setup unchanged. A successful import resets the safety trace and request session and clears policy comparison results.

Scenario state and request history are held in memory only. VIGIL does not automatically persist them to browser storage.

## Project structure

```text
Vigil/
├── index.html                  # App structure and seven workspaces
├── style.css                   # Themes, responsive layout, charts, accessibility styles
├── script.js                   # UI orchestration and in-memory interaction state
├── banker.js                   # Need, safety, request/release, validation, cloning
├── risk.js                     # Heuristic scores, sequence enumeration, what-if analysis
├── policy.js                   # Seeded workloads and policy comparison
├── scenario-io.js              # Versioned scenario JSON validation and serialization
├── tests.js                    # Node.js regression tests
├── package.json                # Test and syntax-check scripts
├── .github/
│   └── workflows/
│       └── ci.yml              # Automated syntax and regression checks
└── docs/
    ├── ARCHITECTURE.md         # Modules, data flow, algorithm boundaries
    ├── VIVA_CHEATSHEET.md      # Concepts, formulas, and viva preparation
    ├── DEMO_SCRIPT.md          # Suggested project demonstration
    └── FINAL_AUDIT.md          # Audit scope, evidence, and remaining checks
```

### Architecture at a glance

The app is a static client-side application. The pure algorithm modules are kept separate from the DOM controller so their logic can be tested in Node.js. Script loading follows the dependency order `banker.js` → `risk.js` → `policy.js` → `scenario-io.js` → `script.js`.

The configured scenario, request/release session, and displayed results are kept in JavaScript memory. Policy comparison starts each policy from an independent copy and replays the same workload. Scenario imports are validated in full before replacing the current setup.

## Technology and design

- **Frontend:** semantic HTML, CSS, and vanilla JavaScript.
- **Algorithms:** pure JavaScript modules with browser and CommonJS exports.
- **Visualizations:** native HTML and SVG; no charting library is required.
- **Testing:** Node.js built-in runtime, custom regression tests, and `node --check`.
- **Automation:** GitHub Actions on Node.js 20.
- **Runtime dependencies:** none.
- **Build system:** none.
- **Persistence/backend:** none; scenario and session data are not automatically stored or sent to a server.

## Limitations and assumptions

- Processes declare their maximum resource claims in advance, as required by the Banker's model.
- The simulation models discrete resource instances and does not observe a real computer's processes or resource usage.
- A safe state means a completion sequence exists under the configured assumptions; it does not guarantee every future request will be safe.
- An unsafe state means the safety proof fails from the current allocation; it does not by itself prove that a live system is currently deadlocked.
- Risk weights are heuristic design choices and are not empirically calibrated probabilities.
- Safe-sequence enumeration is bounded to prevent excessive computation.
- Data is not persisted between page reloads.
- The optional web font needs internet access; system fonts are used as a fallback.
- Automated tests cover the pure logic and syntax. They do not replace cross-browser, screen-reader, or full end-to-end testing.

## Documentation

- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Viva cheatsheet](docs/VIVA_CHEATSHEET.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Final audit and remaining checks](docs/FINAL_AUDIT.md)
- [CI workflow](.github/workflows/ci.yml)

## Contributing and support

Suggestions and bug reports are welcome through [GitHub Issues](https://github.com/BethalaRinosh/Vigil/issues). When reporting a bug, include the steps to reproduce it, the scenario being used, the expected outcome, and the actual outcome. Avoid including private or sensitive information in issue reports.

For code changes:

1. Keep the pure algorithm modules independent of the DOM where practical.
2. Add or update regression tests for behavior changes.
3. Run `npm run check` before opening a pull request.
4. Keep the formal safety result distinct from heuristic risk interpretation.

## License

No `LICENSE` file is currently present in this repository. Until a license is added, do not assume that the project is available for unrestricted reuse or redistribution.
