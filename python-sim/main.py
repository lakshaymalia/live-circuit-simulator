import re
import tempfile
import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI()

class GraphPayload(BaseModel):
    version: int
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

ALLOWED_FORMULA_REGEX = re.compile(r'^[a-b0-9\+\-\*\/\(\)\s\.]+$')

def validate_topology(nodes, edges):
    adj = {n["id"]: [] for n in nodes}
    incoming_handles = {n["id"]: set() for n in nodes}

    for e in edges:
        source, target = e["source"], e["target"]
        t_handle = e.get("targetHandle") or "a"
        adj[source].append(target)
        incoming_handles[target].add(t_handle)

    errors = {}
    
    for n in nodes:
        nid = n["id"]
        ntype = n["type"]
        inc = incoming_handles[nid]
        
        if ntype in ["add", "multiply", "divide", "formula"]:
            if "a" not in inc or "b" not in inc:
                errors[nid] = "Unconnected input handle"
        elif ntype == "display" and len(inc) == 0:
            errors[nid] = "Unconnected input"

    if errors:
        return errors, True

    visited = {}
    loop_nodes = set()

    def dfs(node, path):
        visited[node] = 1
        path.append(node)
        for neighbor in adj.get(node, []):
            if visited.get(neighbor, 0) == 1:
                idx = path.index(neighbor)
                loop_nodes.update(path[idx:])
            elif visited.get(neighbor, 0) == 0:
                dfs(neighbor, path)
        path.pop()
        visited[node] = 2

    for n in nodes:
        nid = n["id"]
        if visited.get(nid, 0) == 0:
            dfs(nid, [])

    if loop_nodes:
        for nid in loop_nodes:
            errors[nid] = "Loop detected in graph"
        return errors, True

    return {}, False

@app.post("/simulate")
async def simulate(payload: GraphPayload):
    nodes = payload.nodes
    edges = payload.edges
    version = payload.version

    for n in nodes:
        if n["type"] == "formula":
            expr = str(n.get("data", {}).get("expression", "")).strip()
            if "\n" in expr or "\r" in expr or not ALLOWED_FORMULA_REGEX.match(expr):
                return {
                    "version": version,
                    "status": "error",
                    "node_errors": {n["id"]: "Unsafe expression detected"},
                    "blocked_nodes": [x["id"] for x in nodes],
                    "results": {}
                }

    topology_errors, has_error = validate_topology(nodes, edges)
    if has_error:
        return {
            "version": version,
            "status": "error",
            "node_errors": topology_errors,
            "blocked_nodes": list(topology_errors.keys()),
            "results": {}
        }

    net_map = {}
    for e in edges:
        s_handle = e.get("sourceHandle") or "out"
        t_handle = e.get("targetHandle") or "a"
        net_name = f"net_{e['source']}_{s_handle}"
        net_map[(e["source"], s_handle)] = net_name
        net_map[(e["target"], t_handle)] = net_name

    netlist_lines = ["* Circuit Netlist"]

    for n in nodes:
        nid = n["id"]
        ntype = n["type"]

        if ntype == "number":
            out_net = net_map.get((nid, "out"), f"net_{nid}_out")
            val = float(n.get("data", {}).get("value", 0))
            netlist_lines.append(f"V{nid} {out_net} 0 DC {val}")

        elif ntype in ["add", "multiply", "divide"]:
            out_net = net_map.get((nid, "out"), f"net_{nid}_out")
            a_net = net_map.get((nid, "a"), "0")
            b_net = net_map.get((nid, "b"), "0")

            if ntype == "add":
                netlist_lines.append(f"B{nid} {out_net} 0 V=V({a_net})+V({b_net})")
            elif ntype == "multiply":
                netlist_lines.append(f"B{nid} {out_net} 0 V=V({a_net})*V({b_net})")
            elif ntype == "divide":
                netlist_lines.append(f"B{nid} {out_net} 0 V=V({a_net})/V({b_net})")

        elif ntype == "formula":
            out_net = net_map.get((nid, "out"), f"net_{nid}_out")
            a_net = net_map.get((nid, "a"), "0")
            b_net = net_map.get((nid, "b"), "0")
            expr = str(n.get("data", {}).get("expression", "a+b"))
            parsed = re.sub(r'\ba\b', f'V({a_net})', expr)
            parsed = re.sub(r'\bb\b', f'V({b_net})', parsed)
            netlist_lines.append(f"B{nid} {out_net} 0 V={parsed}")

    netlist_lines.append(".op")
    netlist_lines.append(".end")

    try:
        with tempfile.NamedTemporaryFile(suffix=".cir", mode="w+", delete=False) as f:
            f.write("\n".join(netlist_lines))
            f_path = f.name

        proc = await asyncio.create_subprocess_exec(
            "ngspice", "-b", f_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=3.0)
        output = stdout.decode()

        results = {}
        for line in output.splitlines():
            match = re.search(r'(?:v\()?([a-zA-Z0-9_]*net_[^\s\)=]+)(?:\))?\s*=?\s*([-\d\.eE\+]+)', line, re.IGNORECASE)
            if match:
                results[match.group(1)] = float(match.group(2))

        div_by_zero_node = None
        for line in output.splitlines():
            if "divide by zero" in line.lower() or "singular matrix" in line.lower():
                for n in nodes:
                    if n["type"] == "divide":
                        div_by_zero_node = n["id"]

        for n in nodes:
            if n["type"] == "divide":
                out_net = net_map.get((n["id"], "out"))
                b_net = net_map.get((n["id"], "b"))
                if (out_net in results and abs(results[out_net]) > 1e12) or (b_net in results and abs(results[b_net]) < 1e-9):
                    div_by_zero_node = n["id"]

        if div_by_zero_node:
            return {
                "version": version,
                "status": "error",
                "node_errors": {div_by_zero_node: "Division by zero"},
                "blocked_nodes": [x["id"] for x in nodes if x["id"] != div_by_zero_node],
                "results": {}
            }

        node_results = {}
        for n in nodes:
            nid = n["id"]
            out_net = net_map.get((nid, "out"))
            in_net = net_map.get((nid, "in"))
            if out_net and out_net in results:
                node_results[nid] = results[out_net]
            elif n["type"] == "display" and in_net in results:
                node_results[nid] = results[in_net]

        return {
            "version": version,
            "status": "success",
            "results": node_results
        }

    except asyncio.TimeoutError:
        return {"version": version, "status": "error", "error_message": "ngspice timeout"}
    except Exception as e:
        return {"version": version, "status": "error", "error_message": str(e)}