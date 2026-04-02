#!/usr/bin/env node
import { addTodo, listTodos, getTodo, updateTodo } from "./store.js";
import { orchestrate } from "./agents.js";
import type { Todo } from "./types.js";

function formatStatus(status: Todo["status"]): string {
  return { pending: "⬜", "in-progress": "🔄", done: "✅" }[status];
}

function formatCategory(cat?: string): string {
  if (!cat) return "";
  const icons: Record<string, string> = {
    research: "🔍",
    writing: "✍️",
    coding: "💻",
    planning: "📋",
    general: "📌",
  };
  return ` [${icons[cat] ?? "📌"} ${cat}]`;
}

function printTodo(todo: Todo): void {
  console.log(
    `  ${formatStatus(todo.status)} ${todo.id}  ${todo.title}${formatCategory(todo.category)}`
  );
  if (todo.subtasks?.length) {
    todo.subtasks.forEach((s) => console.log(`       • ${s}`));
  }
  if (todo.result) {
    const preview = todo.result.slice(0, 120).replace(/\n/g, " ");
    console.log(`       → ${preview}${todo.result.length > 120 ? "…" : ""}`);
  }
}

async function cmdAdd(title: string): Promise<void> {
  const todo = addTodo(title);
  console.log(`\n✚ Added: [${todo.id}] ${todo.title}`);
  console.log("  Running agents…\n");

  updateTodo(todo.id, { status: "in-progress" });

  const { category, result, subtasks } = await orchestrate(todo.id, title);

  updateTodo(todo.id, {
    status: "done",
    category: category as Todo["category"],
    result,
    subtasks: subtasks.length ? subtasks : undefined,
  });

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done: [${todo.id}] ${title}`);
  if (subtasks.length) {
    console.log("\nSubtasks:");
    subtasks.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
  if (result) {
    console.log("\nResult:");
    console.log(result);
  }
}

async function cmdRun(id: string): Promise<void> {
  const todo = getTodo(id);
  if (!todo) {
    console.error(`Todo not found: ${id}`);
    process.exit(1);
  }

  console.log(`\n▶ Running agents on: [${todo.id}] ${todo.title}\n`);
  updateTodo(todo.id, { status: "in-progress" });

  const { category, result, subtasks } = await orchestrate(todo.id, todo.title);

  updateTodo(todo.id, {
    status: "done",
    category: category as Todo["category"],
    result,
    subtasks: subtasks.length ? subtasks : undefined,
  });

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done: [${todo.id}] ${todo.title}`);
  if (subtasks.length) {
    console.log("\nSubtasks:");
    subtasks.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
  if (result) {
    console.log("\nResult:");
    console.log(result);
  }
}

function cmdList(): void {
  const todos = listTodos();
  if (!todos.length) {
    console.log("No todos yet. Run: markdone add \"<task>\"");
    return;
  }

  const groups = {
    "in-progress": todos.filter((t) => t.status === "in-progress"),
    pending: todos.filter((t) => t.status === "pending"),
    done: todos.filter((t) => t.status === "done"),
  };

  if (groups["in-progress"].length) {
    console.log("\nIn Progress:");
    groups["in-progress"].forEach(printTodo);
  }
  if (groups.pending.length) {
    console.log("\nPending:");
    groups.pending.forEach(printTodo);
  }
  if (groups.done.length) {
    console.log("\nDone:");
    groups.done.forEach(printTodo);
  }
  console.log();
}

function printHelp(): void {
  console.log(`
Markdone — AI-powered todo app with agents

Usage:
  markdone add "<task>"   Add a task and run agents on it immediately
  markdone run <id>       Re-run agents on an existing task
  markdone list           List all todos
  markdone help           Show this help
`);
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case "add":
      if (!rest.length) {
        console.error("Usage: markdone add \"<task title>\"");
        process.exit(1);
      }
      await cmdAdd(rest.join(" "));
      break;
    case "run":
      if (!rest[0]) {
        console.error("Usage: markdone run <id>");
        process.exit(1);
      }
      await cmdRun(rest[0]);
      break;
    case "list":
    case "ls":
      cmdList();
      break;
    default:
      printHelp();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
