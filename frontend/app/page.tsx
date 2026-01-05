"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type Todo = {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type TodoFormState = {
  title: string;
  description: string;
  deadline: string;
};

const emptyForm: TodoFormState = {
  title: "",
  description: "",
  deadline: ""
};

function formatDateTime(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("deadline");
  const [order, setOrder] = useState("asc");
  const [viewMode, setViewMode] = useState<"open" | "completed">("open");
  const [formState, setFormState] = useState<TodoFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<TodoFormState>(emptyForm);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      sort_by: sortBy,
      order,
      limit: "200",
      offset: "0"
    });
    return params.toString();
  }, [sortBy, order]);

  async function fetchTodos() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/todos?${queryString}`);
      if (!response.ok) {
        throw new Error(`Failed to load todos (${response.status})`);
      }
      const data: Todo[] = await response.json();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load todos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTodos();
  }, [queryString]);

  const openTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!formState.title.trim()) return;

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      deadline: toIsoOrNull(formState.deadline)
    };

    try {
      const response = await fetch(`${API_BASE}/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to create todo (${response.status})`);
      }

      setFormState(emptyForm);
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create todo.");
    }
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditState({
      title: todo.title,
      description: todo.description ?? "",
      deadline: todo.deadline ? todo.deadline.slice(0, 16) : ""
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(emptyForm);
  }

  async function handleUpdate(todo: Todo, overrides?: Partial<TodoFormState>) {
    const state = overrides
      ? { ...editState, ...overrides }
      : editState;

    if (!state.title.trim()) return;

    const payload = {
      title: state.title.trim(),
      description: state.description.trim() || null,
      deadline: toIsoOrNull(state.deadline),
      completed: todo.completed
    };

    try {
      const response = await fetch(`${API_BASE}/todos/${todo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo (${response.status})`);
      }

      setEditingId(null);
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update todo.");
    }
  }

  async function toggleComplete(todo: Todo) {
    try {
      const response = await fetch(`${API_BASE}/todos/${todo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: todo.title,
          description: todo.description,
          deadline: todo.deadline,
          completed: !todo.completed
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo (${response.status})`);
      }

      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update todo.");
    }
  }

  async function handleDelete(todoId: number) {
    try {
      const response = await fetch(`${API_BASE}/todos/${todoId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`Failed to delete todo (${response.status})`);
      }

      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete todo.");
    }
  }

  return (
    <main>
      <section className="card" style={{ marginBottom: "2rem" }}>
        <div className="section-title">
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
              Task Command Center
            </h1>
            <p className="muted" style={{ marginTop: "0.35rem" }}>
              Capture tasks, set deadlines, and track progress in one place.
            </p>
          </div>
          <div className="badge">{todos.length} total</div>
        </div>
        {error && (
          <div className="notice" style={{ marginTop: "1rem" }}>
            {error}
          </div>
        )}
        <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
          <form className="card" onSubmit={handleCreate}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
              Create a new todo
            </h2>
            <div className="grid" style={{ gap: "1rem" }}>
              <label className="form-row">
                Task title
                <input
                  type="text"
                  placeholder="Write project proposal"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      title: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label className="form-row">
                Description
                <textarea
                  placeholder="Add more context to help you later"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                />
              </label>
              <label className="form-row">
                Deadline
                <input
                  type="datetime-local"
                  value={formState.deadline}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      deadline: event.target.value
                    }))
                  }
                />
              </label>
              <button
                className="button primary"
                type="submit"
                disabled={!formState.title.trim()}
              >
                Add todo
              </button>
            </div>
          </form>
          <div className="card">
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
              Sort & view
            </h2>
            <div className="grid" style={{ gap: "1rem" }}>
              <label className="form-row">
                Sort by
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="deadline">Deadline</option>
                  <option value="created_at">Created date</option>
                  <option value="title">Title</option>
                </select>
              </label>
              <label className="form-row">
                Order
                <select
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </label>
              <label className="form-row">
                View
                <select
                  value={viewMode}
                  onChange={(event) =>
                    setViewMode(event.target.value as "open" | "completed")
                  }
                >
                  <option value="open">Open tasks</option>
                  <option value="completed">Completed (separate)</option>
                </select>
              </label>
              <div className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                {loading ? "Loading tasks..." : "Data refreshed"}
              </div>
              <p className="muted">
                Use sorting to prioritize what matters now. Switch the view to show
                completed tasks in their own section.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Current todos</h2>
          <button className="button secondary" onClick={fetchTodos}>
            Refresh
          </button>
        </div>
        {openTodos.length === 0 && completedTodos.length === 0 ? (
          <p className="muted">
            You have no todos yet. Add your first task to get started.
          </p>
        ) : (
          <div className="grid" style={{ gap: "1.5rem" }}>
            <div>
              <div
                className="section-title"
                style={{ marginBottom: "0.75rem" }}
              >
                <h3 style={{ fontSize: "1.1rem" }}>
                  Open tasks ({openTodos.length})
                </h3>
                {viewMode === "completed" && completedTodos.length > 0 && (
                  <span className="badge">{completedTodos.length} completed</span>
                )}
              </div>
              {openTodos.length === 0 ? (
                <p className="muted">All caught up. Great work!</p>
              ) : (
                <div className="grid" style={{ gap: "1rem" }}>
                  {openTodos.map((todo) => {
                    const isEditing = editingId === todo.id;
                    return (
                      <div key={todo.id} className="todo-item">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "1rem"
                          }}
                        >
                          <div>
                            <h3 style={{ marginBottom: "0.35rem" }}>{todo.title}</h3>
                            <div className="todo-meta">
                              <span className="badge">Open</span>
                              <span>Deadline: {formatDateTime(todo.deadline)}</span>
                              <span>Created: {formatDateTime(todo.created_at)}</span>
                            </div>
                          </div>
                          <button
                            className="button secondary"
                            onClick={() => toggleComplete(todo)}
                          >
                            Mark done
                          </button>
                        </div>

                        {todo.description && (
                          <p className="muted" style={{ margin: 0 }}>
                            {todo.description}
                          </p>
                        )}

                        {isEditing ? (
                          <div className="grid" style={{ gap: "0.75rem" }}>
                            <label className="form-row">
                              Title
                              <input
                                type="text"
                                value={editState.title}
                                onChange={(event) =>
                                  setEditState((prev) => ({
                                    ...prev,
                                    title: event.target.value
                                  }))
                                }
                                required
                              />
                            </label>
                            <label className="form-row">
                              Description
                              <textarea
                                value={editState.description}
                                onChange={(event) =>
                                  setEditState((prev) => ({
                                    ...prev,
                                    description: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label className="form-row">
                              Deadline
                              <input
                                type="datetime-local"
                                value={editState.deadline}
                                onChange={(event) =>
                                  setEditState((prev) => ({
                                    ...prev,
                                    deadline: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <div className="todo-actions">
                              <button
                                className="button primary"
                                onClick={() => handleUpdate(todo)}
                              >
                                Save changes
                              </button>
                              <button className="button secondary" onClick={cancelEdit}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="todo-actions">
                            <button
                              className="button secondary"
                              onClick={() => startEdit(todo)}
                            >
                              Edit
                            </button>
                            <button
                              className="button danger"
                              onClick={() => handleDelete(todo.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {viewMode === "completed" && (
              <div>
                <div
                  className="section-title"
                  style={{ marginBottom: "0.75rem" }}
                >
                  <h3 style={{ fontSize: "1.1rem" }}>
                    Completed tasks ({completedTodos.length})
                  </h3>
                  <span className="badge completed">Completed</span>
                </div>
                {completedTodos.length === 0 ? (
                  <p className="muted">No completed tasks yet.</p>
                ) : (
                  <div className="grid" style={{ gap: "1rem" }}>
                    {completedTodos.map((todo) => (
                      <div key={todo.id} className="todo-item">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "1rem"
                          }}
                        >
                          <div>
                            <h3 style={{ marginBottom: "0.35rem" }}>{todo.title}</h3>
                            <div className="todo-meta">
                              <span className="badge completed">Completed</span>
                              <span>Deadline: {formatDateTime(todo.deadline)}</span>
                              <span>Created: {formatDateTime(todo.created_at)}</span>
                            </div>
                          </div>
                          <button
                            className="button secondary"
                            onClick={() => toggleComplete(todo)}
                          >
                            Reopen
                          </button>
                        </div>

                        {todo.description && (
                          <p className="muted" style={{ margin: 0 }}>
                            {todo.description}
                          </p>
                        )}

                        <div className="todo-actions">
                          <button
                            className="button secondary"
                            onClick={() => startEdit(todo)}
                          >
                            Edit
                          </button>
                          <button
                            className="button danger"
                            onClick={() => handleDelete(todo.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
