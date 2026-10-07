const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/circuit_db';
const PYTHON_SIM_URL = process.env.PYTHON_SIM_URL || 'http://localhost:8000';

mongoose.connect(MONGO_URI);

const GraphSchema = new mongoose.Schema({
  name: { type: String, default: 'default' },
  nodes: Array,
  edges: Array,
  updatedAt: { type: Date, default: Date.now }
});

const Graph = mongoose.model('Graph', GraphSchema);

app.post('/api/graph/save', async (req, res) => {
  const { nodes, edges, name } = req.body;
  const graph = await Graph.findOneAndUpdate(
    { name: name || 'default' },
    { nodes, edges, updatedAt: Date.now() },
    { upsert: true, new: true }
  );
  res.json({ success: true, graph });
});

app.get('/api/graph/load', async (req, res) => {
  const name = req.query.name || 'default';
  const graph = await Graph.findOne({ name });
  if (!graph) return res.status(404).json({ error: 'Graph not found' });
  res.json(graph);
});

app.post('/api/simulate', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SIM_URL}/simulate`, req.body, { timeout: 4000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      version: req.body.version,
      error_message: 'Simulation service unreachable'
    });
  }
});

app.listen(5000, () => console.log('Node API running on port 5000'));
