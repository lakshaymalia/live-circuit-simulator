import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import nodeTypes from './CustomNodes';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const versionRef = useRef(0);
  const latestAppliedVersionRef = useRef(0);

  const isValidConnection = (connection) => {
    if (connection.source === connection.target) return false;
    const existing = edges.find(
      (e) => e.target === connection.target && e.targetHandle === connection.targetHandle
    );
    return !existing;
  };

  const updateNumberValue = (id, val) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, value: val } } : n))
    );
  };

  const updateFormulaExpr = (id, expr) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, expression: expr } } : n))
    );
  };

  const deleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
  };

  const addNodeToCanvas = (type) => {
    const id = `${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: 150 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: {
        value: type === 'number' ? 1 : 0,
        expression: type === 'formula' ? 'a*2+b' : '',
        onChange: updateNumberValue,
        onFormulaChange: updateFormulaExpr,
        onDelete: deleteNode
      }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const saveGraph = async () => {
    await fetch('http://localhost:5000/api/graph/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges })
    });
    alert('Graph saved successfully!');
  };

  const loadGraph = async () => {
    const res = await fetch('http://localhost:5000/api/graph/load');
    if (res.ok) {
      const data = await res.json();
      setNodes(
        data.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            onChange: updateNumberValue,
            onFormulaChange: updateFormulaExpr,
            onDelete: deleteNode
          }
        }))
      );
      setEdges(data.edges || []);
    }
  };

  const triggerSimulation = useCallback(async (currentNodes, currentEdges) => {
    versionRef.current += 1;
    const currentVersion = versionRef.current;

    try {
      const res = await fetch('http://localhost:5000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: currentVersion,
          nodes: currentNodes,
          edges: currentEdges
        })
      });
      const data = await res.json();

      if (data.version < latestAppliedVersionRef.current) return;
      latestAppliedVersionRef.current = data.version;

      setNodes((nds) =>
        nds.map((node) => {
          const resultVal = data.results ? data.results[node.id] : undefined;
          const hasError = data.node_errors && data.node_errors[node.id];
          const isBlocked = data.blocked_nodes && data.blocked_nodes.includes(node.id);

          return {
            ...node,
            data: {
              ...node.data,
              result: resultVal,
              error: hasError ? data.node_errors[node.id] : null,
              isBlocked: isBlocked && !hasError
            }
          };
        })
      );
    } catch (err) {
      console.error('Error in auto-sync simulation', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodes.length > 0) {
        triggerSimulation(nodes, edges);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [nodes, edges, triggerSimulation]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#1e293b', color: '#fff', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={() => addNodeToCanvas('number')}>+ Number</button>
        <button onClick={() => addNodeToCanvas('add')}>+ Add</button>
        <button onClick={() => addNodeToCanvas('multiply')}>+ Multiply</button>
        <button onClick={() => addNodeToCanvas('divide')}>+ Divide</button>
        <button onClick={() => addNodeToCanvas('formula')}>+ Formula</button>
        <button onClick={() => addNodeToCanvas('display')}>+ Display</button>
        <button onClick={clearCanvas} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Clear Canvas</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={saveGraph}>Save</button>
          <button onClick={loadGraph}>Load</button>
        </div>
      </div>
      <div style={{ flexGrow: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}