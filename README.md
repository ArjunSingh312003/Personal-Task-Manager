# TaskFlow – Personal Task Manager

A simple full-stack task manager built with **HTML, CSS, Vanilla JavaScript** (frontend) and **Node.js + Express** (backend). Tasks are saved to `tasks.json` — no database setup needed.

---

## Project Structure

```
PERSONAL TASK MANAGER/
├── server.js        ← Node.js + Express backend (API + serves frontend)
├── tasks.json       ← auto-created on first run (stores all tasks)
├── package.json     ← dependencies: express + nodemon
├── public/
│   ├── index.html   ← the UI (open this via the server)
│   ├── style.css    ← all styles (dark/light theme)
│   └── app.js       ← all frontend logic (fetch API calls, render, events)
└── node_modules/    ← installed packages (git-ignored)
```

---

## How to Run

```bash
# 1. Install dependencies (only needed once)
npm install

# 2. Start the server
npm start          # production
npm run dev        # auto-restarts on file changes (uses nodemon)
```

Then open **http://localhost:5000** in your browser.

> `index.html` is served automatically by Express — no need to open the file directly.

---

## REST API

| Method | Endpoint                  | What it does           |
|--------|---------------------------|------------------------|
| GET    | `/api/tasks`              | Get all tasks          |
| POST   | `/api/tasks`              | Create a task          |
| PUT    | `/api/tasks/:id`          | Edit title/desc/date   |
| PATCH  | `/api/tasks/:id/toggle`   | Toggle complete status |
| POST   | `/api/tasks/reorder`      | Save drag-drop order   |
| DELETE | `/api/tasks/:id`          | Delete a task          |

---

## Features

- Add tasks with title, description, and due date
- Mark tasks complete / incomplete (toggle)
- Edit and delete tasks (with confirmation)
- Filter: All / Active / Completed
- Search by title or description
- Overdue tasks highlighted in orange
- Drag-and-drop to reorder
- Stats panel with progress ring
- Dark / Light theme toggle
- Data persists in `tasks.json` across server restarts
