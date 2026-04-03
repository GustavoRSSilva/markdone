import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TodoStatus = "pending" | "in-progress" | "done";
type TaskCategory = "research" | "writing" | "coding" | "planning" | "general";

interface Todo {
  id: string;
  title: string;
  category?: TaskCategory;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  result?: string;
  subtasks?: string[];
}

const STORAGE_KEY = "markdone-web-todos";

function loadTodos(): Todo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { todos?: Todo[] };
    return Array.isArray(data.todos) ? data.todos : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos }, null, 0));
}

function createTodo(title: string): Todo {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID().slice(0, 8),
    title,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

function statusLabel(s: TodoStatus): string {
  switch (s) {
    case "pending":
      return "Pending";
    case "in-progress":
      return "In progress";
    case "done":
      return "Done";
  }
}

function statusIcon(s: TodoStatus): string {
  switch (s) {
    case "pending":
      return "⬜";
    case "in-progress":
      return "🔄";
    case "done":
      return "✅";
  }
}

function nextStatus(s: TodoStatus): TodoStatus {
  if (s === "pending") return "in-progress";
  if (s === "in-progress") return "done";
  return "pending";
}

type Filter = "all" | "active" | "done";

function resizeTextArea(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 28)}px`;
}

export default function MarkDoneApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [hydrated, setHydrated] = useState(false);
  const [composer, setComposer] = useState("");
  const lineRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    setTodos(loadTodos());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveTodos(todos);
  }, [todos, hydrated]);

  const filtered = useMemo(() => {
    if (filter === "all") return todos;
    if (filter === "done") return todos.filter((t) => t.status === "done");
    return todos.filter((t) => t.status !== "done");
  }, [todos, filter]);

  const focusLine = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = lineRefs.current.get(id);
      el?.focus();
      el?.setSelectionRange(0, 0);
    });
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    const now = new Date().toISOString();
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, updatedAt: now } : t))
    );
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: nextStatus(t.status), updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setTodos((prev) => prev.filter((t) => t.status !== "done"));
  }, []);

  const insertAfter = useCallback(
    (afterId: string) => {
      const next = createTodo("");
      setTodos((prev) => {
        const i = prev.findIndex((t) => t.id === afterId);
        if (i === -1) return [...prev, next];
        const copy = [...prev];
        copy.splice(i + 1, 0, next);
        return copy;
      });
      focusLine(next.id);
    },
    [focusLine]
  );

  const commitComposer = useCallback(() => {
    setComposer((current) => {
      const t = current.trim();
      if (!t) return "";
      const next = createTodo(t);
      setTodos((prev) => [...prev, next]);
      focusLine(next.id);
      return "";
    });
  }, [focusLine]);

  const onBlockKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string, title: string) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertAfter(id);
        return;
      }
      if (e.key === "Backspace" && title === "") {
        e.preventDefault();
        const idx = todos.findIndex((t) => t.id === id);
        if (idx > 0) {
          const prevId = todos[idx - 1]!.id;
          remove(id);
          focusLine(prevId);
        } else if (idx === 0) {
          remove(id);
        }
      }
    },
    [todos, insertAfter, remove, focusLine]
  );

  const showComposer = filter === "all" || filter === "active";

  return (
    <div className="doc">
      <header className="doc-head">
        <div className="doc-title-block">
          <h1 className="doc-title">MarkDone</h1>
          <p className="doc-sub">Write tasks like a page. Enter for a new line. Click the icon to update status.</p>
        </div>
        <nav className="doc-filters" aria-label="Filter MarkDone">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["done", "Done"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`filter-pill ${filter === key ? "on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="blocks">
        {filtered.length === 0 && !showComposer ? (
          <p className="doc-empty">No items in this view.</p>
        ) : null}

        {filtered.map((todo) => (
          <div key={todo.id} className={`block-row ${todo.status === "done" ? "is-done" : ""}`}>
            <button
              type="button"
              className="status-hit"
              onClick={() => cycleStatus(todo.id)}
              title={`${statusLabel(todo.status)} — click to change`}
              aria-label={`${statusLabel(todo.status)} for ${todo.title || "empty line"}`}
            >
              <span aria-hidden>{statusIcon(todo.status)}</span>
            </button>
            <textarea
              ref={(el) => {
                if (el) {
                  lineRefs.current.set(todo.id, el);
                  resizeTextArea(el);
                } else lineRefs.current.delete(todo.id);
              }}
              className="block-text"
              value={todo.title}
              placeholder="Empty — write something…"
              rows={1}
              onChange={(e) => {
                updateTitle(todo.id, e.target.value);
                resizeTextArea(e.target);
              }}
              onKeyDown={(e) => onBlockKeyDown(e, todo.id, todo.title)}
            />
            {todo.category ? <span className="block-meta">{todo.category}</span> : null}
            <button
              type="button"
              className="row-remove"
              onClick={() => remove(todo.id)}
              aria-label={`Remove line`}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}

        {showComposer ? (
          <div className="block-row composer-row">
            <span className="composer-grip" aria-hidden>
              ⋮⋮
            </span>
            <textarea
              className="block-text composer-input"
              value={composer}
              onChange={(e) => {
                setComposer(e.target.value);
                resizeTextArea(e.target);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitComposer();
                }
              }}
              onBlur={() => commitComposer()}
              rows={1}
              placeholder="Write a task…"
              aria-label="New task"
            />
          </div>
        ) : null}
      </div>

      {todos.some((t) => t.status === "done") ? (
        <footer className="doc-foot">
          <button type="button" className="link-btn" onClick={clearDone}>
            Clear completed
          </button>
        </footer>
      ) : null}

      <style>{`
        .doc {
          max-width: 720px;
          margin: 0 auto;
          padding: 3rem 2rem 5rem;
          min-height: 100vh;
        }
        .doc-head {
          margin-bottom: 2.25rem;
        }
        .doc-title-block {
          margin-bottom: 1rem;
        }
        .doc-title {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1.15;
          margin: 0 0 0.5rem;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text);
          width: 100%;
        }
        .doc-sub {
          margin: 0;
          font-size: 0.9rem;
          color: var(--muted);
          max-width: 36rem;
          line-height: 1.45;
        }
        .doc-filters {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .filter-pill {
          font: inherit;
          font-size: 0.8rem;
          padding: 0.25rem 0.65rem;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
        }
        .filter-pill:hover {
          background: color-mix(in srgb, var(--text) 6%, transparent);
          color: var(--text);
        }
        .filter-pill.on {
          background: color-mix(in srgb, var(--text) 10%, transparent);
          color: var(--text);
          font-weight: 600;
        }
        .blocks {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .doc-empty {
          color: var(--muted);
          font-size: 0.95rem;
          margin: 0.5rem 0 1rem;
        }
        .block-row {
          display: flex;
          align-items: flex-start;
          gap: 0.35rem;
          padding: 2px 0;
          border-radius: 4px;
          margin: 0 -0.35rem;
          padding-left: 0.35rem;
          padding-right: 0.35rem;
          position: relative;
        }
        .block-row:hover {
          background: color-mix(in srgb, var(--text) 4%, transparent);
        }
        .block-row.is-done .block-text {
          color: var(--muted);
          text-decoration: line-through;
          text-decoration-thickness: 1px;
        }
        .status-hit {
          flex-shrink: 0;
          width: 1.75rem;
          height: 1.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          font-size: 1rem;
          margin-top: 0.2rem;
          padding: 0;
        }
        .status-hit:hover {
          background: color-mix(in srgb, var(--text) 8%, transparent);
        }
        .status-hit:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .composer-grip {
          flex-shrink: 0;
          width: 1.75rem;
          text-align: center;
          color: var(--muted);
          opacity: 0.35;
          font-size: 0.65rem;
          line-height: 2rem;
          user-select: none;
          margin-top: 0.15rem;
        }
        .block-text {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 1.05rem;
          line-height: 1.55;
          resize: none;
          padding: 0.35rem 0;
          margin: 0;
          overflow: hidden;
          field-sizing: content;
          min-height: 1.55rem;
        }
        .block-text::placeholder {
          color: var(--muted);
          opacity: 0.65;
        }
        .block-text:focus {
          outline: none;
        }
        .composer-input::placeholder {
          opacity: 0.75;
        }
        .block-meta {
          font-size: 0.7rem;
          color: var(--muted);
          text-transform: capitalize;
          align-self: center;
          padding: 0 0.25rem;
        }
        .row-remove {
          flex-shrink: 0;
          width: 1.5rem;
          height: 1.5rem;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          border-radius: 4px;
          font-size: 1.25rem;
          line-height: 1;
          opacity: 0;
          margin-top: 0.25rem;
          transition: opacity 0.12s;
        }
        .block-row:hover .row-remove {
          opacity: 0.7;
        }
        .row-remove:hover {
          opacity: 1 !important;
          color: #f66;
        }
        .doc-foot {
          margin-top: 2.5rem;
          padding-top: 1rem;
        }
        .link-btn {
          font: inherit;
          font-size: 0.85rem;
          border: none;
          background: none;
          color: var(--muted);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 0;
        }
        .link-btn:hover {
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
