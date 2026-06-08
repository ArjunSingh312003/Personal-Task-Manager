// ═══════════════════════════════════════════════════════════════
//  TaskFlow  —  Frontend Controller  (Vanilla JavaScript)
//
//  HOW IT WORKS (easy to explain in an interview):
//  1. On load  → fetch tasks from Node backend (GET /api/tasks)
//  2. Render   → build task cards with innerHTML, attach events
//  3. Actions  → each button calls the matching API endpoint
//  4. Optimistic UI → update the screen immediately, sync to server
// ═══════════════════════════════════════════════════════════════

/* ── API base URL ───────────────────────────────────────────────
   • Opened via Node (http://localhost:5000)  → use relative path
   • Opened via double-click (file://)        → point to localhost
──────────────────────────────────────────────────────────────── */
const API = '/api';
/* ── App state ──────────────────────────────────────────────── */
let tasks        = [];   // master list (always all tasks)
let filter       = 'all';
let search       = '';
let dragId       = null; // id of task being dragged

/* ── DOM shortcuts ──────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

/* ── Run when page is ready ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  fetchTasks();        // load tasks from server
  setupListeners();    // attach all click/input events
});

// ───────────────────────────────────────────────────────────────
//  FETCH  — load all tasks from the backend
// ───────────────────────────────────────────────────────────────
async function fetchTasks() {
  show('loader');
  try {
    const res = await fetch(`${API}/tasks`);
    tasks = await res.json();
    render();
  } catch {
    toast('Cannot reach server. Is it running?', 'error');
  } finally {
    hide('loader');
  }
}

// ───────────────────────────────────────────────────────────────
//  RENDER  — build the task list + update stats
// ───────────────────────────────────────────────────────────────
function render() {
  updateStats();

  // Apply current filter + search locally (no extra API call)
  const visible = tasks.filter(t => {
    if (filter === 'active'    && t.completed)  return false;
    if (filter === 'completed' && !t.completed) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const list = $('taskList');
  list.innerHTML = '';  // clear list before re-drawing

  if (!visible.length) {
    showEmpty();
    return;
  }
  hide('empty');

  // Build one <li> card per task
  visible.forEach(t => {
    const overdue  = isOverdue(t);
    const li       = document.createElement('li');
    li.className   = `task-card ${t.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`;
    li.dataset.id  = t.id;
    li.draggable   = true;

    // Left-border colour: orange = overdue, green = done, gray = normal
    li.style.borderLeftColor = overdue ? 'var(--orange)' : t.completed ? 'var(--green)' : 'var(--border)';

    li.innerHTML = `
      <!-- Circle checkbox to toggle complete -->
      <button class="check-btn ${t.completed ? 'done' : ''}" title="Toggle complete">
        ${t.completed ? '✓' : ''}
      </button>

      <!-- Task content -->
      <div class="task-body">
        <span class="task-title">${esc(t.title)}</span>
        ${t.description ? `<span class="task-desc">${esc(t.description)}</span>` : ''}
        <div class="task-meta">
          ${t.dueDate ? `<span class="badge ${overdue ? 'badge-overdue' : 'badge-date'}">
            📅 ${overdue ? 'Overdue: ' : ''}${fmtDate(t.dueDate)}</span>` : ''}
          ${t.completed ? `<span class="badge badge-done">✓ Done</span>` : ''}
        </div>
      </div>

      <!-- Edit / Delete buttons -->
      <div class="task-actions">
        <button class="icon-btn edit-btn"  title="Edit">✏️</button>
        <button class="icon-btn del-btn"   title="Delete" style="color:var(--red)">🗑</button>
      </div>`;

    // Wire up buttons inside this card
    li.querySelector('.check-btn').onclick = () => toggleTask(t.id);
    li.querySelector('.edit-btn') .onclick = () => openEditModal(t);
    li.querySelector('.del-btn')  .onclick = () => openDelModal(t);

    // Drag-and-drop events
    li.ondragstart  = () => { dragId = t.id; li.classList.add('dragging'); };
    li.ondragend    = () => { dragId = null;  li.classList.remove('dragging'); };
    li.ondragover   = e  => { e.preventDefault(); li.classList.add('over'); };
    li.ondragleave  = ()  => li.classList.remove('over');
    li.ondrop       = e  => {
      e.preventDefault();
      li.classList.remove('over');
      if (dragId && dragId !== t.id) reorderDrop(dragId, t.id);
    };

    list.appendChild(li);
  });
}

// ───────────────────────────────────────────────────────────────
//  STATS  — update the numbers and the SVG ring
// ───────────────────────────────────────────────────────────────
function updateStats() {
  const done   = tasks.filter(t => t.completed).length;
  const total  = tasks.length;
  const active = total - done;
  const pct    = total ? Math.round(done / total * 100) : 0;

  $('statDone').textContent   = done;
  $('statTotal').textContent  = total;
  $('statActive').textContent = active;
  $('statComp').textContent   = done;
  $('ringPct').textContent    = `${pct}%`;

  // Update SVG ring: circumference = 2π×30 ≈ 188.5
  const C = 188.5;
  $('ring').style.strokeDashoffset = C - (pct / 100) * C;

  $('statMsg').textContent = total === 0 ? 'No tasks yet — add one below!'
    : active === 0 ? '🎉 All tasks complete!'
    : `${active} task${active > 1 ? 's' : ''} remaining`;
}

// ───────────────────────────────────────────────────────────────
//  API CALLS
// ───────────────────────────────────────────────────────────────

// POST /api/tasks — create task
async function createTask() {
  const title = $('newTitle').value.trim();
  if (!title) return;

  const body = {
    title,
    description: $('newDesc').value.trim(),
    dueDate:     $('newDue').value ? new Date($('newDue').value).toISOString() : null
  };

  try {
    const res  = await fetch(`${API}/tasks`, { method:'POST', headers:jsonH(), body:JSON.stringify(body) });
    const task = await res.json();
    tasks.unshift(task);   // add to top of local list
    clearForm();
    render();
    toast('Task added!', 'success');
  } catch {
    toast('Failed to add task', 'error');
  }
}

// PATCH /api/tasks/:id/toggle — flip completed state
async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.completed = !t.completed;  // optimistic update
  render();

  try {
    await fetch(`${API}/tasks/${id}/toggle`, { method:'PATCH' });
    toast(t.completed ? '✓ Marked complete!' : 'Marked active', 'success');
  } catch {
    t.completed = !t.completed;  // rollback on error
    render();
    toast('Failed to update', 'error');
  }
}

// PUT /api/tasks/:id — save edits from modal
async function saveEdit(e) {
  e.preventDefault();
  const id    = $('editId').value;
  const body  = {
    title:       $('editTitle').value.trim(),
    description: $('editDesc').value.trim(),
    dueDate:     $('editDue').value ? new Date($('editDue').value).toISOString() : null
  };
  if (!body.title) return;

  try {
    const res     = await fetch(`${API}/tasks/${id}`, { method:'PUT', headers:jsonH(), body:JSON.stringify(body) });
    const updated = await res.json();
    tasks = tasks.map(t => t.id === id ? updated : t);
    closeModal('editModal');
    render();
    toast('Task updated!', 'success');
  } catch {
    toast('Failed to update', 'error');
  }
}

// DELETE /api/tasks/:id
async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);  // optimistic remove
  closeModal('delModal');
  render();

  try {
    await fetch(`${API}/tasks/${id}`, { method:'DELETE' });
    toast('Task deleted', 'success');
  } catch {
    toast('Failed to delete', 'error');
    fetchTasks();   // rollback
  }
}

// POST /api/tasks/reorder — drag-and-drop save
async function reorderDrop(fromId, toId) {
  const from = tasks.findIndex(t => t.id === fromId);
  const to   = tasks.findIndex(t => t.id === toId);
  if (from === -1 || to === -1) return;

  const [moved] = tasks.splice(from, 1);
  tasks.splice(to, 0, moved);
  render();

  try {
    await fetch(`${API}/tasks/reorder`, {
      method: 'POST', headers: jsonH(),
      body: JSON.stringify({ ids: tasks.map(t => t.id) })
    });
  } catch {
    fetchTasks();  // rollback on failure
  }
}

// ───────────────────────────────────────────────────────────────
//  MODALS
// ───────────────────────────────────────────────────────────────
function openEditModal(t) {
  $('editId').value    = t.id;
  $('editTitle').value = t.title;
  $('editDesc').value  = t.description || '';
  $('editDue').value   = t.dueDate ? t.dueDate.split('T')[0] : '';
  openModal('editModal');
  $('editTitle').focus();
}

let pendingDelId = null;
function openDelModal(t) {
  pendingDelId = t.id;
  $('delName').textContent = `"${t.title}"`;
  openModal('delModal');
}

function openModal(id)  { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

// ───────────────────────────────────────────────────────────────
//  SETUP ALL EVENT LISTENERS  (called once on DOMContentLoaded)
// ───────────────────────────────────────────────────────────────
function setupListeners() {

  // Theme toggle
  $('themeBtn').onclick = () => {
    document.documentElement.classList.toggle('dark');
    const dark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    $('themeBtn').textContent = dark ? '🌙' : '☀️';
  };

  // Show extra fields when user focuses the title input
  $('newTitle').onfocus = () => $('extraFields').classList.remove('hidden');

  // Enable Add button only when title has text
  $('newTitle').oninput = () => {
    $('addBtn').disabled = $('newTitle').value.trim() === '';
  };

  $('addBtn').onclick  = createTask;
  $('clearBtn').onclick = clearForm;

  // Filter tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.f;
      render();
    };
  });

  // Search box
  $('searchInput').oninput = () => {
    search = $('searchInput').value.trim();
    $('clearSearch').classList.toggle('hidden', !search);
    render();
  };
  $('clearSearch').onclick = () => {
    $('searchInput').value = '';
    search = '';
    $('clearSearch').classList.add('hidden');
    render();
  };

  // Keyboard: press "/" to focus search
  document.onkeydown = e => {
    if (e.key === 'Escape') {
      closeModal('editModal');
      closeModal('delModal');
    }
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      $('searchInput').focus();
    }
  };

  // Close modal when clicking the dark backdrop
  ['editModal','delModal'].forEach(id => {
    $(id).onclick = e => { if (e.target === $(id)) closeModal(id); };
  });

  // Edit form submit
  $('editForm').onsubmit = saveEdit;

  // Delete confirm button
  $('delConfirm').onclick = () => { if (pendingDelId) deleteTask(pendingDelId); };
}

// ───────────────────────────────────────────────────────────────
//  HELPERS
// ───────────────────────────────────────────────────────────────
function applyTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  $('themeBtn').textContent = saved === 'dark' ? '🌙' : '☀️';
}

function clearForm() {
  $('newTitle').value = '';
  $('newDesc').value  = '';
  $('newDue').value   = '';
  $('addBtn').disabled = true;
  $('extraFields').classList.add('hidden');
}

function isOverdue(t) {
  if (t.completed || !t.dueDate) return false;
  const d = new Date(t.dueDate);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

// Sanitize text to prevent XSS (Cross-Site Scripting)
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function jsonH() { return { 'Content-Type': 'application/json' }; }

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function showEmpty() {
  show('empty');
  const noTasks   = tasks.length === 0;
  const noResults = !noTasks && !tasks.filter(t => {
    if (filter === 'active'    && t.completed)  return false;
    if (filter === 'completed' && !t.completed) return false;
    return true;
  }).length;

  $('emptyTitle').textContent = noTasks ? 'All Clear!' : filter === 'active' ? 'No Active Tasks!'
    : filter === 'completed' ? 'No Completed Tasks!' : 'No Results';
  $('emptyMsg').textContent   = noTasks ? 'Add your first task using the panel above.'
    : filter === 'active' ? 'Great job! Everything is done.' : filter === 'completed'
    ? 'No tasks marked complete yet.' : 'Try a different search term.';
}

// Toast notification helper
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'success' ? '✅' : '❌'} ${esc(msg)}`;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
