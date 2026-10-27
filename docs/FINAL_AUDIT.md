# Final repository audit

**Audit target:** `main` branch of `BethalaRinosh/Vigil`  
**Project type:** Static browser application with pure JavaScript modules  
**Purpose:** Record what was inspected, what is automated, and what still requires a real browser.

## Scope inspected

- Main entry point and script dependency order in `index.html`.
- UI orchestration and state handling in `script.js`.
- Core state validation, Need calculation, safety check, requests, and releases in `banker.js`.
- Safe-sequence enumeration and heuristic scoring in `risk.js`.
- Seeded policy workload and comparison logic in `policy.js`.
- Versioned scenario import/export validation in `scenario-io.js`.
- Regression coverage in `tests.js`.
- Responsive CSS, focus-visible styles, and reduced-motion rules in `style.css`.
- README and the architecture, viva, and demo documents.

## Fix made during final review

Safe-sequence enumeration previously set its capped flag as soon as the number of discovered sequences reached the cap. If the true total exactly equaled the cap, the result could incorrectly imply truncation. The enumerator now marks itself capped only when it discovers an additional complete sequence beyond the limit. A regression test covers the exact-cap case.

## Automated checks

Run the checks locally from the repository root:

```sh
npm run check:syntax
npm test
```

The same commands run in GitHub Actions on pushes and pull requests to `main`.

Regression coverage includes:

- Textbook Need matrix and safe sequence.
- Granted and unsafe-denied requests.
- Requests beyond Need and Available.
- Resource releases and invalid releases.
- Invalid dimensions, negative values, and Allocation above Maximum.
- Safe/unsafe trace invariants and state immutability.
- Bounded safe-sequence enumeration, including exact-cap behavior.
- Risk-score bounds and unsafe-state classification.
- What-if requests without mutation.
- Deterministic policy workloads and identical request ordering.
- Scenario JSON round-trip, malformed JSON, wrong format/version, and invalid resource values.

## Static structural checks performed

- All expected source and documentation files are present.
- JavaScript source files pass syntax parsing.
- No duplicate HTML IDs were found.
- No missing references were found for fixed DOM IDs queried with the UI's ID helper.
- Script load order matches module dependencies.
- No `localStorage`, `sessionStorage`, or direct `.innerHTML =` assignment appears in the UI controller.
- JSON file import enforces a 1 MB limit and validates before loading.
- Reduced-motion rules and visible keyboard-focus styling are present.
- Light-theme secondary text color exceeds a 4.5:1 contrast ratio against white.

## Boundaries of this audit

This is a code and static-structure review, not a formal proof that the application is bug-free. No real browser automation or assistive-technology session was run during this audit. The following still deserve manual browser verification:

- Download and file-picker behavior across browsers.
- Keyboard-only navigation across every workspace and interactive SVG control.
- Screen-reader announcements for live regions and dynamic charts.
- Actual mobile viewport rendering at 320 px, 375 px, 768 px, and desktop widths.
- Dark/light theme contrast across all status colors, not only the secondary text token.
- GitHub Actions workflow result after the workflow file is committed.

## Known product limitations

- This is an educational simulation, not a kernel, scheduler, or live resource monitor.
- Maximum claims are assumed to be declared in advance.
- Safe means at least one completion sequence exists under the model; unsafe does not necessarily mean a current real-world deadlock.
- Risk weights are hand-designed heuristics, not machine learning or calibrated probabilities.
- Enumeration of safe sequences is capped to bound computation.
- Scenario/session state is not automatically persisted.
- The Inter font is fetched from Google Fonts when online; the app falls back to system fonts offline.

## Release judgment

The repository is organized into pure algorithm modules, a UI controller, static presentation assets, regression tests, and project documentation. The available automated checks provide a repeatable baseline. Treat browser behavior as pending until the manual checklist above has been exercised on the target browser/device.
