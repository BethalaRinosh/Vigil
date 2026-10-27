# Vigil architecture

Vigil is a static, client-side teaching application. It has no backend, database, framework, bundler, or runtime package dependency. Open `index.html` in a modern browser; an internet connection is only needed for the optional Inter web font.

## Runtime loading order

The scripts are loaded with `defer` in dependency order:

1. `banker.js` exposes `VigilBanker`.
2. `risk.js` exposes `VigilRisk` and receives the Banker API as an argument for analysis calls.
3. `policy.js` exposes `VigilPolicy` for deterministic workload generation and policy comparison.
4. `scenario-io.js` exposes `VigilScenarioIO` for versioned JSON validation and serialization.
5. `script.js` connects these pure modules to the DOM and manages UI state.

The pure modules also export CommonJS APIs for Node.js tests. They do not depend on the browser DOM.

## Source map

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic page structure, seven workspaces, navigation, controls, and accessible status regions |
| `style.css` | Theme tokens, responsive layouts, focus states, charts, reduced-motion rules, and visual components |
| `script.js` | In-memory scenario editing, rendering, safety walkthrough, request/release session, risk visualizations, policy results, import/export UI |
| `banker.js` | State validation, Need calculation, safety check, tentative request transaction, release transaction, defensive cloning |
| `risk.js` | Bounded safe-sequence enumeration, transparent process/system heuristics, what-if analysis |
| `policy.js` | Seeded request generation and identical-workload comparison between safety-aware and availability-only policies |
| `scenario-io.js` | Versioned scenario envelope and strict validation before import |
| `tests.js` | Node.js regression tests for pure logic |
| `docs/VIVA_CHEATSHEET.md` | Oral-exam concepts, definitions, formulas, and likely questions |
| `docs/DEMO_SCRIPT.md` | Presenter walkthrough with checkpoints and narration |
| `docs/FINAL_AUDIT.md` | Scope and evidence for the final static/code audit |
| `package.json` | Zero-dependency test and syntax-check commands |
| `.github/workflows/ci.yml` | Automated syntax and regression checks on pushes and pull requests |

## Data flow and state boundaries

- The configured scenario lives in JavaScript memory. There is no automatic browser-storage persistence.
- The request/release simulator uses a separate runtime snapshot. A transaction updates that runtime copy only when its rules permit it.
- The safety trace and risk summaries are derived from the current configured scenario.
- Policy comparison starts both policies from the same scenario and replays the same ordered generated workload.
- Scenario import validates the entire document before replacing the configured scenario. A successful import resets dependent runtime history/results.
- Rendering uses DOM APIs and text nodes for dynamic labels. User-provided process/resource names are not inserted as HTML markup.

## Algorithm boundaries

### Banker's Algorithm

For every process (P_i) and resource type (R_j):

`Need[i][j] = Maximum[i][j] - Allocation[i][j]`

The safety check starts with `Work = Available` and all `Finish[i] = false`. It finds an unfinished process whose full Need vector is no greater than Work, then adds that process's Allocation back to Work and marks it finished. If all processes finish, the state is safe. Otherwise, the unfinished processes form the blocked remainder of the proof.

For (n) processes and (m) resource types, the safety scan is (O(n^2m)) in the usual bounded-matrix model.

A request is first checked against remaining Need and Available. Vigil tentatively applies it to a cloned state and accepts it only if the resulting state is safe. Invalid, denied, and waiting requests do not mutate the caller's state.

### Heuristic risk analysis

Risk scores are explanatory, hand-designed heuristics, not machine learning and not calibrated probabilities. Distinct safe-sequence enumeration is capped to bound work. A capped result is a lower bound, not an exact total. The formal Banker safety result is authoritative.

### Policy comparison

The seeded generator creates one ordered request workload. Both policies receive the same requests from equivalent initial state copies. The naive policy omits the post-grant safety check but still respects Need and Available, isolating the effect of that missing check.

## Local developer commands

Requires Node.js 18 or newer:

```sh
npm test
npm run check:syntax
npm run check
```

No `npm install` is needed because the project has no npm dependencies. The CI workflow runs the syntax check and regression tests on Node.js 20.

## Known limitations

- This is a deterministic educational simulator, not a kernel, scheduler, or live resource monitor.
- The user must declare maximum claims in advance.
- A safe state means at least one completion order exists under the model assumptions; it does not guarantee all future requests will be safe.
- An unsafe state is not proof that a real-world deadlock is already occurring.
- UI rendering, keyboard behavior, download prompts, and mobile layout still need real-browser checks; Node tests cannot verify those behaviors.
