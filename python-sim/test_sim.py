import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_graph_1_add():
    payload = {
        "version": 1,
        "nodes": [
            {"id": "1", "type": "number", "data": {"value": 2}},
            {"id": "2", "type": "number", "data": {"value": 3}},
            {"id": "3", "type": "add", "data": {}},
            {"id": "4", "type": "display", "data": {}}
        ],
        "edges": [
            {"source": "1", "sourceHandle": "out", "target": "3", "targetHandle": "a"},
            {"source": "2", "sourceHandle": "out", "target": "3", "targetHandle": "b"},
            {"source": "3", "sourceHandle": "out", "target": "4", "targetHandle": "in"}
        ]
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["results"]["4"] == 5.0

def test_graph_2_multiply():
    payload = {
        "version": 1,
        "nodes": [
            {"id": "1", "type": "number", "data": {"value": 2}},
            {"id": "2", "type": "number", "data": {"value": 3}},
            {"id": "3", "type": "add", "data": {}},
            {"id": "4", "type": "number", "data": {"value": 4}},
            {"id": "5", "type": "multiply", "data": {}},
            {"id": "6", "type": "display", "data": {}}
        ],
        "edges": [
            {"source": "1", "sourceHandle": "out", "target": "3", "targetHandle": "a"},
            {"source": "2", "sourceHandle": "out", "target": "3", "targetHandle": "b"},
            {"source": "3", "sourceHandle": "out", "target": "5", "targetHandle": "a"},
            {"source": "4", "sourceHandle": "out", "target": "5", "targetHandle": "b"},
            {"source": "5", "sourceHandle": "out", "target": "6", "targetHandle": "in"}
        ]
    }
    response = client.post("/simulate", json=payload)
    res = response.json()
    assert res["results"]["6"] == 20.0

def test_graph_3_branch():
    payload = {
        "version": 1,
        "nodes": [
            {"id": "1", "type": "number", "data": {"value": 7}},
            {"id": "2", "type": "multiply", "data": {}},
            {"id": "3", "type": "display", "data": {}}
        ],
        "edges": [
            {"source": "1", "sourceHandle": "out", "target": "2", "targetHandle": "a"},
            {"source": "1", "sourceHandle": "out", "target": "2", "targetHandle": "b"},
            {"source": "2", "sourceHandle": "out", "target": "3", "targetHandle": "in"}
        ]
    }
    response = client.post("/simulate", json=payload)
    res = response.json()
    assert res["results"]["3"] == 49.0

def test_loop_detection():
    payload = {
        "version": 1,
        "nodes": [
            {"id": "1", "type": "add", "data": {}},
            {"id": "2", "type": "multiply", "data": {}}
        ],
        "edges": [
            {"source": "1", "sourceHandle": "out", "target": "2", "targetHandle": "a"},
            {"source": "2", "sourceHandle": "out", "target": "1", "targetHandle": "a"}
        ]
    }
    response = client.post("/simulate", json=payload)
    res = response.json()
    assert res["status"] == "error"
    assert "1" in res["node_errors"]

def test_unsafe_formula():
    payload = {
        "version": 1,
        "nodes": [
            {"id": "1", "type": "formula", "data": {"expression": "a + b\n.control\nshell ls"}}
        ],
        "edges": []
    }
    response = client.post("/simulate", json=payload)
    res = response.json()
    assert res["status"] == "error"
    assert "Unsafe expression" in res["node_errors"]["1"]
