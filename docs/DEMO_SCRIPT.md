# VIGIL demo script

**Target duration:** 4 minutes  
**Goal:** Show the core OS concept, a safe request, an unsafe denial, and why the heuristic/policy comparison are supporting explanations rather than the proof.

## Before presenting

- Open `index.html` in a modern browser.
- Start on the Overview tab in dark theme.
- Keep the default Textbook example loaded.
- If possible, use a desktop viewport wide enough to show the matrices and charts comfortably.
- Do not depend on network access for functionality; the optional font may fall back to system fonts.

## 0:00–0:25 | Introduce the problem

**Do:** Show Overview, then open System setup.

**Say:**  
“Vigil is an Operating Systems learning lab for resource allocation and deadlock avoidance. Instead of only displaying a final safe or unsafe label, it lets us inspect the resource matrices, follow the safety proof, test requests, and compare policies. The formal Banker's Algorithm makes the safety decision; our risk scores are transparent heuristics.”

## 0:25–0:55 | Explain the matrices

**Do:** Point to Allocation, Maximum, Available, and the derived Need matrix.

**Say:**  
“Allocation is what each process holds now. Maximum is its declared peak claim. Need is Maximum minus Allocation. Available is the resource pool not currently allocated. The classic example begins in a safe state.”

**Checkpoint:** Need is computed rather than edited directly. The setup reports valid inputs.

## 0:55–1:35 | Show the safety proof

**Do:** Open Safety check. Press Next step a few times, then use Auto play or continue until the trace completes.

**Say:**  
“The algorithm starts with Work equal to Available and every Finish flag false. It finds a process whose entire Need vector fits Work. That process can finish, so its current Allocation is returned to Work. The process is marked finished and the scan repeats. A complete sequence proves the state is safe.”

**Checkpoint:** The completed trace shows a safe sequence and final Work vector.

## 1:35–2:15 | Demonstrate request decisions

**Do:** Open Requests. Choose P1 and enter request vector `(1, 0, 2)`, then evaluate. If the runtime session has been changed, press Reset to setup first.

**Say:**  
“A request must first fit the process's remaining Need, then the currently Available resources. Even then, Vigil tentatively grants it to a cloned state and reruns the safety check. This textbook request is granted because the resulting state remains safe.”

**Optional:** Reset to setup, then choose P0 and request `(0, 2, 0)`. Evaluate it after P1's request only if the state matches the textbook follow-up. The request should be denied as unsafe. If the setup/session differs, reset and reproduce the documented sequence rather than improvising.

## 2:15–2:50 | Explain the risk panel

**Do:** Open Risk intelligence. Show the system score, process list, and expandable formula section. Optionally run a what-if request.

**Say:**  
“This panel adds explanation: utilization, sequence scarcity, slack, and per-process pressure. These are hand-designed heuristics, not trained AI and not probabilities. They help compare scenarios, but they never replace the formal safety verdict.”

## 2:50–3:25 | Compare policies

**Do:** Open Policy comparison and run the default seeded workload. Show unsafe grants and the request ledger.

**Say:**  
“Both policies receive the same ordered requests. Banker's Algorithm adds a post-grant safety check. The naive policy only checks Need and Available. Under this default workload, the naive policy can accept a request that leaves the system unsafe. Results depend on the seed, so we report the workload and its limitations.”

**Checkpoint:** Keep the default seed unless you have verified a different seed's result.

## 3:25–3:45 | Import/export and portability

**Do:** Open Learn & export, select Show current JSON, and point out the format/version and validation message. Only perform a file download if time permits.

**Say:**  
“Scenarios can be exported as versioned JSON and imported only after validation. Invalid input does not replace the current setup. The application keeps state in memory rather than silently persisting it in browser storage.”

## 3:45–4:00 | Close

**Say:**  
“The key takeaway is that a request fitting Available is not enough. Vigil demonstrates the safety proof, makes a controlled policy comparison, and uses heuristic indicators only as supporting explanations. The project is a browser-based educational simulator, not a live operating-system monitor.”

## Recovery notes

- **Wrong scenario loaded:** Return to System setup and click Textbook example.
- **Request outcome differs:** Reset the runtime session and repeat the documented P1 request before the P0 follow-up. Do not claim a result from a different state.
- **No unsafe grants in comparison:** Verify the textbook scenario and seed 5. A different seed may legitimately yield a different result.
- **Download prompt is blocked:** Skip the download and demonstrate Show current JSON; browser download settings are environment-specific.
- **Font looks different offline:** Expected. The system font fallback is intentional.
