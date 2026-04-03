import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MarkDoneStatus = "pending" | "in-progress" | "done";
type TaskCategory = "research" | "writing" | "coding" | "planning" | "general";

type AgentKey = "researcher" | "writer" | "coder" | "planner" | "custom";

interface AgentDefinition {
  key: AgentKey;
  label: string;
  icon: string;
  avatar: string;
  description: string;
}

interface CustomAgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
}

const CUSTOM_AGENT_STORAGE_KEY = "markdone-custom-agent";

const AGENTS: AgentDefinition[] = [
  {
    key: "researcher",
    label: "Researcher",
    icon: "🔍",
    avatar: "/avatars/researcher.svg",
    description: "Finds, summarises and explains information on any topic.",
  },
  {
    key: "writer",
    label: "Writer",
    icon: "✍️",
    avatar: "/avatars/writer.svg",
    description: "Produces well-structured docs, emails, posts and more.",
  },
  {
    key: "coder",
    label: "Coder",
    icon: "💻",
    avatar: "/avatars/coder.svg",
    description: "Writes, reviews and explains code as an expert engineer.",
  },
  {
    key: "planner",
    label: "Planner",
    icon: "🗂️",
    avatar: "/avatars/planner.svg",
    description: "Breaks complex tasks into clear, actionable subtasks.",
  },
];

const AGENT_STORAGE_KEY = "markdone-selected-agent";

const CUSTOM_AGENT: AgentDefinition = {
  key: "custom",
  label: "Create your own",
  icon: "✨",
  avatar: "/avatars/custom.svg",
  description: "Design a custom agent with your own name and instructions.",
};

interface MarkDoneItem {
  id: string;
  title: string;
  category?: TaskCategory;
  status: MarkDoneStatus;
  createdAt: string;
  updatedAt: string;
  result?: string;
  subtasks?: string[];
}

const STORAGE_KEY = "markdone-web-todos";

function loadMarkDoneItems(): MarkDoneItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { markDoneItems?: MarkDoneItem[]; todos?: MarkDoneItem[] };
    const items = data.markDoneItems ?? data.todos;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveMarkDoneItems(markDoneItems: MarkDoneItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ markDoneItems }, null, 0));
}

function createMarkDoneItem(title: string): MarkDoneItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID().slice(0, 8),
    title,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

function statusLabel(s: MarkDoneStatus): string {
  switch (s) {
    case "pending":
      return "Pending";
    case "in-progress":
      return "In progress";
    case "done":
      return "Done";
  }
}

function statusIcon(s: MarkDoneStatus): string {
  switch (s) {
    case "pending":
      return "⬜";
    case "in-progress":
      return "🔄";
    case "done":
      return "✅";
  }
}

function nextStatus(s: MarkDoneStatus): MarkDoneStatus {
  if (s === "pending") return "in-progress";
  if (s === "in-progress") return "done";
  return "pending";
}

type Filter = "all" | "active" | "done";
type Screen = "pick" | "create" | "app";

function resizeTextArea(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 28)}px`;
}

export default function MarkDoneApp() {
  const [markDoneItems, setMarkDoneItems] = useState<MarkDoneItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [hydrated, setHydrated] = useState(false);
  const [composer, setComposer] = useState("");
  const [screen, setScreen] = useState<Screen>("pick");
  const [selectedAgent, setSelectedAgent] = useState<AgentKey | null>(null);
  const [customAgentConfig, setCustomAgentConfig] = useState<CustomAgentConfig | null>(null);
  const [customDraft, setCustomDraft] = useState<CustomAgentConfig>({ name: "", description: "", systemPrompt: "" });
  const lineRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    setMarkDoneItems(loadMarkDoneItems());
    const stored = localStorage.getItem(AGENT_STORAGE_KEY) as AgentKey | null;
    const validKeys: AgentKey[] = [...AGENTS.map((a) => a.key), "custom"];
    if (stored && validKeys.includes(stored)) {
      setSelectedAgent(stored);
      setScreen("app");
    }
    const storedCustom = localStorage.getItem(CUSTOM_AGENT_STORAGE_KEY);
    if (storedCustom) {
      try { setCustomAgentConfig(JSON.parse(storedCustom)); } catch { /* ignore */ }
    }
    setHydrated(true);
  }, []);

  const chooseAgent = useCallback((key: AgentKey) => {
    setSelectedAgent(key);
    localStorage.setItem(AGENT_STORAGE_KEY, key);
    setScreen("app");
  }, []);

  const clearAgent = useCallback(() => {
    setSelectedAgent(null);
    localStorage.removeItem(AGENT_STORAGE_KEY);
    setScreen("pick");
  }, []);

  const submitCustomAgent = useCallback((config: CustomAgentConfig) => {
    setCustomAgentConfig(config);
    localStorage.setItem(CUSTOM_AGENT_STORAGE_KEY, JSON.stringify(config));
    setSelectedAgent("custom");
    localStorage.setItem(AGENT_STORAGE_KEY, "custom");
    setScreen("app");
  }, []);

  useEffect(() => {
    if (hydrated) saveMarkDoneItems(markDoneItems);
  }, [markDoneItems, hydrated]);

  const filtered = useMemo(() => {
    if (filter === "all") return markDoneItems;
    if (filter === "done") return markDoneItems.filter((t) => t.status === "done");
    return markDoneItems.filter((t) => t.status !== "done");
  }, [markDoneItems, filter]);

  const focusLine = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = lineRefs.current.get(id);
      el?.focus();
      el?.setSelectionRange(0, 0);
    });
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    const now = new Date().toISOString();
    setMarkDoneItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, updatedAt: now } : t))
    );
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setMarkDoneItems((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: nextStatus(t.status), updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setMarkDoneItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setMarkDoneItems((prev) => prev.filter((t) => t.status !== "done"));
  }, []);

  const insertAfter = useCallback(
    (afterId: string) => {
      const next = createMarkDoneItem("");
      setMarkDoneItems((prev) => {
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
      const next = createMarkDoneItem(t);
      setMarkDoneItems((prev) => [...prev, next]);
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
        const idx = markDoneItems.findIndex((t) => t.id === id);
        if (idx > 0) {
          const prevId = markDoneItems[idx - 1]!.id;
          remove(id);
          focusLine(prevId);
        } else if (idx === 0) {
          remove(id);
        }
      }
    },
    [markDoneItems, insertAfter, remove, focusLine]
  );

  const showComposer = filter === "all" || filter === "active";

  // ── Agent picker screen ────────────────────────────────────────────────────
  if (hydrated && screen === "pick") {
    return (
      <div className="doc">
        <header className="doc-head">
          <div className="doc-title-block">
            <h1 className="doc-title">MarkDone</h1>
            <p className="doc-sub">Choose an agent to power your tasks.</p>
          </div>
        </header>

        <div className="agent-row">
          {AGENTS.map((agent) => (
            <button
              key={agent.key}
              type="button"
              className="agent-avatar-btn"
              onClick={() => chooseAgent(agent.key)}
            >
              <div className="agent-avatar">
                <img src={agent.avatar} alt={agent.label} className="agent-avatar-img" />
              </div>
              <span className="agent-avatar-label">{agent.label}</span>
              <span className="agent-avatar-desc">{agent.description}</span>
            </button>
          ))}
          <button
            type="button"
            className="agent-avatar-btn"
            onClick={() => setScreen("create")}
          >
            <div className="agent-avatar agent-avatar--custom">
              <img src={CUSTOM_AGENT.avatar} alt={CUSTOM_AGENT.label} className="agent-avatar-img" />
            </div>
            <span className="agent-avatar-label">{CUSTOM_AGENT.label}</span>
            <span className="agent-avatar-desc">{CUSTOM_AGENT.description}</span>
          </button>
        </div>

        <style>{`
          .doc {
            max-width: 720px;
            margin: 0 auto;
            padding: 3rem 2rem 5rem;
            min-height: 100vh;
          }
          .doc-head { margin-bottom: 2.25rem; }
          .doc-title-block { margin-bottom: 1rem; }
          .doc-title {
            font-size: 2.5rem;
            font-weight: 700;
            letter-spacing: -0.04em;
            line-height: 1.15;
            margin: 0 0 0.5rem;
            color: var(--text);
          }
          .doc-sub {
            margin: 0;
            font-size: 0.9rem;
            color: var(--muted);
            max-width: 36rem;
            line-height: 1.45;
          }
          .agent-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 2rem;
            margin-top: 1rem;
          }
          .agent-avatar-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.6rem;
            background: none;
            border: none;
            cursor: pointer;
            font: inherit;
            color: var(--text);
            padding: 0.5rem;
            border-radius: 12px;
            transition: transform 0.15s;
            max-width: 9rem;
            text-align: center;
          }
          .agent-avatar-btn:hover {
            transform: translateY(-3px);
          }
          .agent-avatar-btn:hover .agent-avatar {
            border-color: var(--accent);
            box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent);
          }
          .agent-avatar {
            width: 5.5rem;
            height: 5.5rem;
            border-radius: 50%;
            border: 2px solid var(--border);
            overflow: hidden;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .agent-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .agent-avatar-label {
            font-size: 1rem;
            font-weight: 600;
          }
          .agent-avatar-desc {
            font-size: 0.78rem;
            color: var(--muted);
            line-height: 1.4;
          }
          .agent-avatar--custom {
            border-style: dashed;
          }
        `}</style>
      </div>
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Create agent screen ───────────────────────────────────────────────────
  if (hydrated && screen === "create") {
    return (
      <div className="doc">
        <button type="button" className="back-btn" onClick={() => setScreen("pick")}>
          ← Choose agent
        </button>

        <header className="create-head">
          <div className="create-avatar-preview">
            <img src={CUSTOM_AGENT.avatar} alt="Custom agent" className="create-avatar-img" />
          </div>
          <div>
            <h1 className="create-title">Create your agent</h1>
            <p className="create-sub">Define a name, personality, and instructions for your custom agent.</p>
          </div>
        </header>

        <form
          className="create-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!customDraft.name.trim() || !customDraft.systemPrompt.trim()) return;
            submitCustomAgent({
              name: customDraft.name.trim(),
              description: customDraft.description.trim(),
              systemPrompt: customDraft.systemPrompt.trim(),
            });
          }}
        >
          <label className="create-label">
            <span className="create-label-text">Agent name</span>
            <input
              className="create-input"
              type="text"
              placeholder="e.g. Legal Advisor"
              value={customDraft.name}
              autoFocus
              onChange={(e) => setCustomDraft((d) => ({ ...d, name: e.target.value }))}
              required
            />
          </label>

          <label className="create-label">
            <span className="create-label-text">
              Short description <span className="create-optional">(optional)</span>
            </span>
            <input
              className="create-input"
              type="text"
              placeholder="e.g. Reviews contracts and flags legal risks"
              value={customDraft.description}
              onChange={(e) => setCustomDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>

          <label className="create-label">
            <span className="create-label-text">System prompt</span>
            <span className="create-hint">Describe how your agent should behave — its expertise, tone, and goals.</span>
            <textarea
              className="create-textarea"
              placeholder={`You are an expert legal advisor specialising in contract law.\nWhen reviewing tasks:\n1. Identify key legal risks\n2. Flag any ambiguous clauses\n3. Suggest clear, actionable remedies`}
              value={customDraft.systemPrompt}
              onChange={(e) => setCustomDraft((d) => ({ ...d, systemPrompt: e.target.value }))}
              required
            />
          </label>

          <div className="create-actions">
            <button type="button" className="create-cancel" onClick={() => setScreen("pick")}>
              Cancel
            </button>
            <button
              type="submit"
              className="create-submit"
              disabled={!customDraft.name.trim() || !customDraft.systemPrompt.trim()}
            >
              Create agent →
            </button>
          </div>
        </form>

        <style>{`
          .doc {
            max-width: 680px;
            margin: 0 auto;
            padding: 2.5rem 2rem 5rem;
            min-height: 100vh;
          }
          .back-btn {
            font: inherit;
            font-size: 0.85rem;
            color: var(--muted);
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-bottom: 2rem;
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            transition: color 0.12s;
          }
          .back-btn:hover { color: var(--text); }
          .create-head {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            margin-bottom: 2.25rem;
          }
          .create-avatar-preview {
            width: 5rem;
            height: 5rem;
            border-radius: 50%;
            border: 2px dashed var(--border);
            overflow: hidden;
            flex-shrink: 0;
          }
          .create-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .create-title {
            font-size: 1.9rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin: 0 0 0.35rem;
            color: var(--text);
          }
          .create-sub {
            margin: 0;
            font-size: 0.9rem;
            color: var(--muted);
            line-height: 1.45;
          }
          .create-form {
            display: flex;
            flex-direction: column;
            gap: 1.4rem;
          }
          .create-label {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
          }
          .create-label-text {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text);
          }
          .create-optional {
            font-weight: 400;
            color: var(--muted);
          }
          .create-hint {
            font-size: 0.8rem;
            color: var(--muted);
            margin-top: -0.1rem;
          }
          .create-input,
          .create-textarea {
            font: inherit;
            font-size: 0.975rem;
            color: var(--text);
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.65rem 0.85rem;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .create-input:focus,
          .create-textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
          }
          .create-textarea {
            min-height: 11rem;
            resize: vertical;
            line-height: 1.6;
          }
          .create-actions {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 0.75rem;
            margin-top: 0.5rem;
          }
          .create-cancel {
            font: inherit;
            font-size: 0.875rem;
            border: none;
            background: none;
            color: var(--muted);
            cursor: pointer;
            padding: 0.55rem 0.85rem;
            border-radius: 7px;
            transition: color 0.12s;
          }
          .create-cancel:hover { color: var(--text); }
          .create-submit {
            font: inherit;
            font-size: 0.9rem;
            font-weight: 600;
            border: none;
            background: var(--accent);
            color: #fff;
            cursor: pointer;
            padding: 0.6rem 1.4rem;
            border-radius: 7px;
            transition: background 0.15s, opacity 0.15s;
          }
          .create-submit:hover { background: var(--accent-dim); }
          .create-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        `}</style>
      </div>
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  const activeAgent = selectedAgent === "custom"
    ? { ...CUSTOM_AGENT, label: customAgentConfig?.name ?? CUSTOM_AGENT.label }
    : AGENTS.find((a) => a.key === selectedAgent);

  return (
    <div className="doc">
      <header className="doc-head">
        <div className="doc-title-block">
          <h1 className="doc-title">MarkDone</h1>
          <p className="doc-sub">Write tasks like a page. Enter for a new line. Click the icon to update status.</p>
        </div>
        {activeAgent && (
          <div className="agent-badge">
            <span>{activeAgent.icon} {activeAgent.label}</span>
            <button type="button" className="agent-change-btn" onClick={clearAgent} title="Change agent">
              Change
            </button>
          </div>
        )}
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
          <p className="doc-empty">No MarkDone items in this view.</p>
        ) : null}

        {filtered.map((item) => (
          <div key={item.id} className={`block-row ${item.status === "done" ? "is-done" : ""}`}>
            <button
              type="button"
              className="status-hit"
              onClick={() => cycleStatus(item.id)}
              title={`${statusLabel(item.status)} — click to change`}
              aria-label={`${statusLabel(item.status)} for ${item.title || "empty line"}`}
            >
              <span aria-hidden>{statusIcon(item.status)}</span>
            </button>
            <textarea
              ref={(el) => {
                if (el) {
                  lineRefs.current.set(item.id, el);
                  resizeTextArea(el);
                } else lineRefs.current.delete(item.id);
              }}
              className="block-text"
              value={item.title}
              placeholder="Empty — write something…"
              rows={1}
              onChange={(e) => {
                updateTitle(item.id, e.target.value);
                resizeTextArea(e.target);
              }}
              onKeyDown={(e) => onBlockKeyDown(e, item.id, item.title)}
            />
            {item.category ? <span className="block-meta">{item.category}</span> : null}
            <button
              type="button"
              className="row-remove"
              onClick={() => remove(item.id)}
              aria-label="Remove line"
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
              placeholder="Add a MarkDone…"
              aria-label="New MarkDone item"
            />
          </div>
        ) : null}
      </div>

      {markDoneItems.some((t) => t.status === "done") ? (
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
        .agent-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 0.85rem;
          color: var(--text);
        }
        .agent-change-btn {
          font: inherit;
          font-size: 0.78rem;
          border: none;
          background: none;
          color: var(--accent);
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .agent-change-btn:hover {
          color: var(--accent-dim);
        }
      `}</style>
    </div>
  );
}
