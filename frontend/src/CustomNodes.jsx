import React from 'react';
import { Handle, Position } from '@xyflow/react';

const nodeStyle = {
  position: 'relative',
  padding: '10px 14px',
  borderRadius: '8px',
  background: '#ffffff',
  border: '2px solid #333',
  minWidth: '120px',
  fontSize: '12px'
};

const deleteBtnStyle = {
  position: 'absolute',
  top: '-8px',
  right: '-8px',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  background: '#ef4444',
  color: '#ffffff',
  border: 'none',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  padding: 0
};

const getNodeBorderStyle = (data) => {
  if (data?.error) return { ...nodeStyle, borderColor: '#ef4444', backgroundColor: '#fef2f2' };
  if (data?.isBlocked) return { ...nodeStyle, borderColor: '#f59e0b', backgroundColor: '#fffbeb' };
  return nodeStyle;
};

export function NumberNode({ id, data }) {
  return (
    <div style={getNodeBorderStyle(data)}>
      {data?.onDelete && (
        <button style={deleteBtnStyle} onClick={() => data.onDelete(id)} title="Delete node">
          ×
        </button>
      )}
      <strong style={{ display: 'block', marginBottom: '4px' }}>Number</strong>
      <input
        type="number"
        value={data.value ?? 0}
        onChange={(e) => data.onChange(id, parseFloat(e.target.value) || 0)}
        style={{ width: '100%', padding: '2px' }}
      />
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
}

export function AddNode({ id, data }) {
  return (
    <div style={getNodeBorderStyle(data)}>
      {data?.onDelete && (
        <button style={deleteBtnStyle} onClick={() => data.onDelete(id)} title="Delete node">
          ×
        </button>
      )}
      <Handle type="target" position={Position.Left} id="a" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <strong>Add (+)</strong>
      {data?.error && <div style={{ color: '#ef4444', fontSize: '10px' }}>{data.error}</div>}
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
}

export function MultiplyNode({ id, data }) {
  return (
    <div style={getNodeBorderStyle(data)}>
      {data?.onDelete && (
        <button style={deleteBtnStyle} onClick={() => data.onDelete(id)} title="Delete node">
          ×
        </button>
      )}
      <Handle type="target" position={Position.Left} id="a" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <strong>Multiply (×)</strong>
      {data?.error && <div style={{ color: '#ef4444', fontSize: '10px' }}>{data.error}</div>}
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
}

export function DivideNode({ id, data }) {
  return (
    <div style={getNodeBorderStyle(data)}>
      {data?.onDelete && (
        <button style={deleteBtnStyle} onClick={() => data.onDelete(id)} title="Delete node">
          ×
        </button>
      )}
      <Handle type="target" position={Position.Left} id="a" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <strong>Divide (÷)</strong>
      {data?.error && <div style={{ color: '#ef4444', fontSize: '10px' }}>{data.error}</div>}
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
}

export function FormulaNode({ id, data }) {
  return (
    <div style={getNodeBorderStyle(data)}>
      {data?.onDelete && (
        <button style={deleteBtnStyle} onClick={() => data.onDelete(id)} title="Delete node">
          ×
        </button>
      )}
      <Handle type="target" position={Position.Left} id="a" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <strong style={{ display: 'block', marginBottom: '4px' }}>Formula</strong>
      <input
        type="text"
        value={data.expression ?? 'a*2+b'}
        onChange={(e) => data.onFormulaChange(id, e.target.value)}
        style={{ width: '100%', padding: '2px' }}
      />
      {data?.error && <div style={{ color: '#ef4444', fontSize: '10px' }}>{data.error}</div>}
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
}

export function DisplayNode({ id, data }) {
  return (
    <div style={getNodeBorderStyle(data)}>
      {data?.onDelete && (
        <button style={deleteBtnStyle} onClick={() => data.onDelete(id)} title="Delete node">
          ×
        </button>
      )}
      <Handle type="target" position={Position.Left} id="in" style={{ background: '#555' }} />
      <strong>Display</strong>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
        {data?.isBlocked ? 'Blocked' : data?.result ?? '—'}
      </div>
      {data?.error && <div style={{ color: '#ef4444', fontSize: '10px' }}>{data.error}</div>}
    </div>
  );
}

const nodeTypes = {
  number: NumberNode,
  add: AddNode,
  multiply: MultiplyNode,
  divide: DivideNode,
  formula: FormulaNode,
  display: DisplayNode
};

export default nodeTypes;