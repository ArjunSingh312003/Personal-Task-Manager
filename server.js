// ─────────────────────────────────────────────
//  TaskFlow  —  Node.js + Express Backend
//  All tasks are saved to tasks.json (the DB)
// ─────────────────────────────────────────────

import express from 'express';
import fs      from 'fs';
import path    from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app    = express();
const PORT = process.env.PORT || 5000;
const DB     = path.join(__dirname, 'tasks.json');  // our "database"

// ── Middleware ────────────────────────────────
app.use(express.json());                              // parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // serve index.html + CSS + JS

// ── Tiny DB helpers ───────────────────────────
function load()        { return fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB,'utf8')) : []; }
function save(tasks)   { fs.writeFileSync(DB, JSON.stringify(tasks, null, 2)); }
function uid()         { return Math.random().toString(36).slice(2,9); }

// ── API Routes ────────────────────────────────

// GET  /api/tasks  — return all tasks (sorted newest first)
app.get('/api/tasks', (req, res) => {
  let tasks = load();
  tasks.sort((a, b) => a.order - b.order);
  res.json(tasks);
});

// POST /api/tasks  — create a new task
app.post('/api/tasks', (req, res) => {
  const { title, description = '', dueDate = null } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const tasks   = load();
  const minOrder = tasks.length ? Math.min(...tasks.map(t => t.order)) : 0;

  const task = {
    id: uid(),
    title: title.trim(),
    description: description.trim(),
    dueDate,
    completed: false,
    createdAt: new Date().toISOString(),
    order: minOrder - 1   // new task sits at the top
  };

  tasks.push(task);
  save(tasks);
  res.status(201).json(task);
});

// PUT  /api/tasks/:id  — edit title / description / dueDate
app.put('/api/tasks/:id', (req, res) => {
  const tasks = load();
  const task  = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const { title, description, dueDate } = req.body;
  if (title       !== undefined) task.title       = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (dueDate     !== undefined) task.dueDate     = dueDate || null;

  save(tasks);
  res.json(task);
});

// PATCH /api/tasks/:id/toggle  — mark complete ↔ incomplete
app.patch('/api/tasks/:id/toggle', (req, res) => {
  const tasks = load();
  const task  = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  task.completed = !task.completed;
  save(tasks);
  res.json(task);
});

// POST /api/tasks/reorder  — drag-and-drop reorder
app.post('/api/tasks/reorder', (req, res) => {
  const { ids } = req.body;
  const tasks   = load();
  const map     = new Map(tasks.map(t => [t.id, t]));
  ids.forEach((id, i) => { if (map.has(id)) map.get(id).order = i; });
  save([...map.values()]);
  res.json({ ok: true });
});

// DELETE /api/tasks/:id  — delete a task
app.delete('/api/tasks/:id', (req, res) => {
  let tasks   = load();
  const before = tasks.length;
  tasks = tasks.filter(t => t.id !== req.params.id);
  if (tasks.length === before) return res.status(404).json({ error: 'Not found' });
  save(tasks);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────
app.listen(PORT, () => console.log(`✅  http://localhost:${PORT}`));
