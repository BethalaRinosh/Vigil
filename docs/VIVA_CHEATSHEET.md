# VIGIL viva cheatsheet

**Project:** VIGIL: Deadlock Avoidance with Heuristic Risk Intelligence  
**Course area:** Operating Systems, resource allocation, deadlock avoidance  
**Implementation:** Static HTML/CSS/JavaScript with pure JavaScript algorithm modules

## 30-second project explanation

Vigil is an interactive Operating Systems learning lab that demonstrates Banker's Algorithm for deadlock avoidance. A user can edit Allocation, Maximum, and Available values, watch the safety algorithm step by step, test resource requests and releases, inspect transparent heuristic risk indicators, and compare Banker's safety-aware policy against a naive policy using the same seeded workload. It is an educational simulation, not a live operating-system monitor. The formal safety algorithm determines safe versus unsafe; heuristic scores are advisory only.

## Core definitions

- **Process:** A unit of work competing for resources.
- **Resource type:** A category of reusable resource, such as a printer or a pool of identical units.
- **Allocation:** Instances of each resource type currently held by a process.
- **Maximum:** The process's declared maximum possible claim for each resource type.
- **Need:** Remaining resource claim, computed as Maximum minus Allocation.
- **Available:** Instances not currently allocated.
- **Work:** A temporary vector used by the safety check, initially equal to Available.
- **Finish:** A Boolean flag showing whether the safety proof has found a completion order for a process.
- **Safe state:** At least one sequence exists in which every process can finish under its declared maximum claims.
- **Unsafe state:** No complete safe sequence was found. This does not necessarily mean the system is currently deadlocked.
- **Deadlock:** A set of processes is permanently blocked waiting for resources/events held by one another.
- **Deadlock avoidance:** Evaluate a tentative allocation before committing it, so the modeled system remains in a safe state.

## Banker's safety algorithm

1. Compute `Need = Maximum - Allocation`.
2. Set `Work = Available` and every `Finish[i] = false`.
3. Find an unfinished process (P_i) where every `Need[i][j] <= Work[j]`.
4. Pretend (P_i) finishes; set `Work = Work + Allocation[i]`, and set `Finish[i] = true`.
5. Repeat the scan.
6. If every Finish flag becomes true, the state is safe and the order is a safe sequence. If the scan cannot find an eligible unfinished process, the state is unsafe.

**Why return Allocation to Work?** The safety proof assumes that a process which can obtain its remaining Need can finish and release the resources it already holds.

**Why use a temporary Work vector?** The algorithm tests a hypothetical completion order without actually changing the configured resource state.

## Resource request rule

For process (P_i) requesting vector (Request_i):

1. Reject if any request value exceeds its remaining Need.
2. Return **MUST WAIT** if any request value exceeds Available.
3. Apply the request to a cloned state as a tentative allocation.
4. Run the safety check on that tentative state.
5. Commit only if the new state is safe. Otherwise deny the request and preserve the previous state.

A request that fits Available is not automatically safe. That is the central distinction between resource availability and deadlock avoidance.

## The four Coffman conditions

All four are necessary for a classic deadlock to occur:

1. **Mutual exclusion:** At least one resource cannot be shared simultaneously.
2. **Hold and wait:** A process holds resources while waiting for more.
3. **No preemption:** Resources cannot be forcibly taken away under the model.
4. **Circular wait:** A cycle of processes waits for resources held by the next process.

Banker's Algorithm is an avoidance method based on declared maximum claims. It does not act as a universal real-world deadlock detector.

## Complexity

For (n) processes and (m) resource types, the standard safety scan is (O(n^2m)). Vigil limits the UI scenario to at most 10 processes and 6 resource types, making the walkthrough small and understandable.

Counting every safe sequence can grow combinatorially, so Vigil caps sequence enumeration at 1,000. When the cap is reached, the count is a lower bound rather than an exact total.

## Vigil's heuristic risk scores

The scores are intentionally transparent and hand-designed. They are not trained machine-learning models, empirically calibrated probabilities, or replacements for the formal safety check.

- **Process score:** 40% Need pressure + 35% competition + 25% sequence fragility.
- **System score:** 35% utilization + 35% sequence scarcity + 30% slack pressure.
- **Unsafe states:** Always classified as Critical by the system-level rule.
- **What-if analysis:** Evaluates a hypothetical request without committing it to the configured scenario or request simulator.

If asked why the score is useful: it offers explanatory warning signals for comparing scenarios and locating pressure points. If asked whether a low score proves safety: no. Only the formal safety check establishes safety under the model's assumptions.

## Policy comparison

- Both policies receive the same ordered, seeded request workload.
- Both reject requests that exceed Need and wait for requests that exceed Available.
- Banker's policy also checks the resulting tentative state for safety.
- The naive policy skips that post-grant safety check.
- A workload may not trigger an unsafe grant for every seed. That does not prove the naive policy is safe.

## Software structure

- `banker.js`: pure algorithm and state validation.
- `risk.js`: bounded sequence enumeration and risk heuristics.
- `policy.js`: seeded workload and policy comparison.
- `scenario-io.js`: versioned JSON import/export validation.
- `script.js`: UI orchestration and in-memory state.
- `index.html` / `style.css`: structure and responsive presentation.
- `tests.js`: automated Node.js regression tests.

## Likely viva questions

**Q: What is the difference between deadlock prevention and avoidance?**  
Prevention designs the system to break at least one necessary deadlock condition. Avoidance evaluates each tentative allocation and grants only when the resulting state remains safe.

**Q: Can an unsafe state be deadlocked already?**  
It may be, but unsafe does not necessarily mean deadlock has already occurred. It means the algorithm cannot prove that every process can finish under the declared claims.

**Q: If a request fits Available, why can it still be denied?**  
Because granting it may leave no completion sequence for all processes. Availability is necessary, but safety must also be checked.

**Q: What does Need represent?**  
The maximum additional resources a process may still request: `Need = Maximum - Allocation`.

**Q: Why clone the state for a request?**  
To evaluate a tentative allocation and roll it back safely if it is denied. The pure API avoids mutating the caller's state.

**Q: Why can two safe sequences exist?**  
More than one unfinished process may have Need less than or equal to Work at a given step. Any eligible process can be selected, potentially yielding different valid orders.

**Q: Why does Vigil include a naive policy?**  
It provides a controlled comparison that isolates the effect of omitting the post-grant safety check while keeping the ordered request workload the same.

**Q: Is Vigil's risk intelligence AI?**  
No. It is a deterministic, explainable heuristic with hand-selected weights. The project labels it honestly and does not claim machine learning.

**Q: What are the limitations?**  
Maximum claims must be known in advance; the model assumes a process that can satisfy Need can finish and release Allocation; sequence counting is capped; the application is a client-side educational simulation, not a kernel or live monitor.

## If you forget an answer

Return to the invariant: **a request is granted only when it is within Need, within Available, and the tentative state is safe.** The safety algorithm proves a completion order; the heuristic only helps explain relative pressure.
