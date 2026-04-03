import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { MarkDoneItem, MarkDoneStore } from "./types.js";

const STORE_PATH = join(process.cwd(), "todos.json");

function normalizeStore(raw: unknown): MarkDoneStore {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.markDoneItems)) {
      return { markDoneItems: o.markDoneItems as MarkDoneItem[] };
    }
    if (Array.isArray(o.todos)) {
      return { markDoneItems: o.todos as MarkDoneItem[] };
    }
  }
  return { markDoneItems: [] };
}

function load(): MarkDoneStore {
  if (!existsSync(STORE_PATH)) {
    return { markDoneItems: [] };
  }
  const raw = JSON.parse(readFileSync(STORE_PATH, "utf-8"));
  const store = normalizeStore(raw);
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { todos?: unknown }).todos) &&
    !Array.isArray((raw as { markDoneItems?: unknown }).markDoneItems)
  ) {
    save(store);
  }
  return store;
}

function save(store: MarkDoneStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function addMarkDoneItem(title: string): MarkDoneItem {
  const store = load();
  const now = new Date().toISOString();
  const item: MarkDoneItem = {
    id: randomUUID().slice(0, 8),
    title,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  store.markDoneItems.push(item);
  save(store);
  return item;
}

export function updateMarkDoneItem(
  id: string,
  patch: Partial<Pick<MarkDoneItem, "status" | "result" | "subtasks" | "category">>
): MarkDoneItem | null {
  const store = load();
  const item = store.markDoneItems.find((t) => t.id === id);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  save(store);
  return item;
}

export function listMarkDoneItems(): MarkDoneItem[] {
  return load().markDoneItems;
}

export function getMarkDoneItem(id: string): MarkDoneItem | null {
  return load().markDoneItems.find((t) => t.id === id) ?? null;
}
