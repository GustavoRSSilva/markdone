import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { Todo, TodoStatus, TaskCategory, TodoStore } from "./types.js";

const STORE_PATH = join(process.cwd(), "todos.json");

function load(): TodoStore {
  if (!existsSync(STORE_PATH)) {
    return { todos: [] };
  }
  return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as TodoStore;
}

function save(store: TodoStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function addTodo(title: string): Todo {
  const store = load();
  const now = new Date().toISOString();
  const todo: Todo = {
    id: randomUUID().slice(0, 8),
    title,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  store.todos.push(todo);
  save(store);
  return todo;
}

export function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, "status" | "result" | "subtasks" | "category">>
): Todo | null {
  const store = load();
  const todo = store.todos.find((t) => t.id === id);
  if (!todo) return null;
  Object.assign(todo, patch, { updatedAt: new Date().toISOString() });
  save(store);
  return todo;
}

export function listTodos(): Todo[] {
  return load().todos;
}

export function getTodo(id: string): Todo | null {
  return load().todos.find((t) => t.id === id) ?? null;
}
