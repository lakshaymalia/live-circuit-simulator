# Live Circuit / Node Graph Simulator

A web-based interactive node editor and simulation engine built with React Flow, Node.js, Python (FastAPI + ngspice), and MongoDB, fully orchestrated with Docker Compose[cite: 6, 9].

---

## 1. How to Run

Ensure Docker Desktop is running locally, then execute from the project root[cite: 9]:

```bash
docker compose up --build
```

- **Frontend Canvas:** `http://localhost:3000`
- **Node API Service:** `http://localhost:5000`
- **Python Simulation Engine:** `http://localhost:8000`
- **MongoDB Database:** `localhost:27017`

To run the automated integration test suite inside the container[cite: 9]:
```bash
docker exec -it circuit_python_sim pytest
```

---

## 2. Architecture Diagram

```text
+-----------------------------------------------------------------------+
|                             React Frontend                            |
|                    (@xyflow/react on Port 3000)                        |
+----------------------------------+------------------------------------+
                                   |
               HTTP (Graph Sync, Save/Load Requests)
                                   v
+----------------------------------+------------------------------------+
|                             Node API                              |
|                     (Express.js on Port 5000)                         |
+-----------------+--------------------------------+--------------------+
                  |                                |
          MongoDB Persistence              Proxy Simulation Payload
                  v                                v
+-----------------+-------------------+  +---------+--------------------+
|             MongoDB                 |  |         Python Engine        |
|      (Database on Port 27017)       |  |  (FastAPI + ngspice @ 8000)  |
+-------------------------------------+  +------------------------------+
```

---

## 3. Netlist Generation & Loop Detection

### Netlist Mapping
Every canvas node dynamically translates to a corresponding ngspice behavioral netlist model line[cite: 7]:
- **Number:** `V<id> net_<id>_out 0 DC <val>`[cite: 7]
- **Add:** `B<id> net_<id>_out 0 V=V(net_a)+V(net_b)`[cite: 7]
- **Multiply:** `B<id> net_<id>_out 0 V=V(net_a)*V(net_b)`[cite: 7]
- **Divide:** `B<id> net_<id>_out 0 V=V(net_a)/V(net_b)`[cite: 7]
- **Formula:** `B<id> net_<id>_out 0 V=<parsed_expression>`

Node graph adjacency lists dynamically resolve input/output handles to unified net names (`net_<sourceId>_<handle>`)[cite: 7].

### Loop Detection Algorithm
Before invoking ngspice, the graph topology is validated using Depth-First Search (DFS)[cite: 8, 9]. Nodes track visited states (`0` = unvisited, `1` = visiting, `2` = visited). If an active node in the current recursion stack points back to an ancestor (`visited == 1`), a cycle is detected[cite: 8]. The exact set of nodes forming the feedback loop are flagged with a `"Loop detected in graph"` error state on the UI[cite: 8].

---

## 4. Step 5 Answers

1. **Fast Edits & Out-of-Order Safety:**
   The frontend maintains an incrementing monotonic integer (`versionRef`). Every graph modification attaches the current version counter to the request payload. When simulation responses return, if `response.version < latestAppliedVersion`, the payload is silently dropped to prevent older out-of-order responses from overwriting newer canvas states[cite: 8, 9].

2. **Precise Error Mapping & Blocked Downstream Propagation:**
   Topology validation flags missing input connections or circular loops before simulation[cite: 8]. During execution, ngspice output logs are parsed for division-by-zero or singular matrix errors and mapped directly to the offending node[cite: 8]. Downstream nodes connected to an errored node automatically receive an `isBlocked` flag to render a blocked state instead of stale numeric values[cite: 8].

3. **Backend Failure & ngspice Resilience:**
   The FastAPI backend executes ngspice in isolated sub-processes guarded by an asynchronous timeout (`asyncio.wait_for(timeout=3.0)`)[cite: 8]. If ngspice hangs, encounters infinite loops, or crashes, the subprocess is killed and an error state is returned, keeping the main API and frontend responsive[cite: 8].

4. **Untrusted Formula Sanitization:**
   User-entered formula expressions are validated against a strict whitelist regular expression (`^[a-b0-9\+\-\*\/\(\)\s\.]+$`)[cite: 8]. Any expression containing newline characters (`\n`, `\r`) or unapproved tokens (such as `.control`, `shell`, or system commands) is rejected immediately at the backend before netlist file generation[cite: 8].

### Known Breaking Edge Case
If a user creates an extremely complex expression containing valid characters that causes internal ngspice floating-point overflow or underflow without producing explicit error strings, ngspice outputs `NaN` or unparsed scientific notation strings[cite: 9]. While division by zero is trapped, raw floating-point overflow inside nested formulas can currently lead to unhandled parsing fallback values on the canvas[cite: 9].

---

## 5. AI Usage Note

AI tools were used during development for[cite: 9]:
- Scaffolding Docker Compose configurations and multi-stage Dockerfiles[cite: 6, 9].
- Accelerating React Flow custom node state updates and handle layout syntax[cite: 6, 9].
- Generating Pytest unit testing suite structure for edge-case coverage[cite: 9].

---

## 6. What I'd Do Next

- **Multi-Output Nodes:** Support nodes with multiple distinct output handles and multi-variable equations[cite: 9, 10].
- **Transient Analysis (`.tran`):** Implement interactive waveform rendering over time using Chart.js or Recharts for AC/transient simulations[cite: 9, 10].
- **Auto-Layout Routing:** Integrate Dagre graph library to automatically arrange cluttered node layouts cleanly on the canvas[cite: 9, 10].