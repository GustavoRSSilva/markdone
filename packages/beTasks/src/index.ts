#!/usr/bin/env node
import { addMarkDoneItem, listMarkDoneItems, getMarkDoneItem, updateMarkDoneItem } from "./store.js";
import { orchestrate } from "./agents.js";
import type { MarkDoneItem } from "./types.js";

function formatStatus(status: MarkDoneItem["status"]): string {
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

function printMarkDoneItem(item: MarkDoneItem): void {
  console.log(
    `  ${formatStatus(item.status)} ${item.id}  ${item.title}${formatCategory(item.category)}`
  );
  if (item.subtasks?.length) {
    item.subtasks.forEach((s) => console.log(`       • ${s}`));
  }
  if (item.result) {
    const preview = item.result.slice(0, 120).replace(/\n/g, " ");
    console.log(`       → ${preview}${item.result.length > 120 ? "…" : ""}`);
  }
}

async function cmdAdd(title: string): Promise<void> {
  const item = addMarkDoneItem(title);
  console.log(`\n✚ Added: [${item.id}] ${item.title}`);
  console.log("  Running agents…\n");

  updateMarkDoneItem(item.id, { status: "in-progress" });

  const { category, result, subtasks } = await orchestrate(item.id, title);

  updateMarkDoneItem(item.id, {
    status: "done",
    category: category as MarkDoneItem["category"],
    result,
    subtasks: subtasks.length ? subtasks : undefined,
  });

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done: [${item.id}] ${title}`);
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
  const item = getMarkDoneItem(id);
  if (!item) {
    console.error(`MarkDone item not found: ${id}`);
    process.exit(1);
  }

  console.log(`\n▶ Running agents on: [${item.id}] ${item.title}\n`);
  updateMarkDoneItem(item.id, { status: "in-progress" });

  const { category, result, subtasks } = await orchestrate(item.id, item.title);

  updateMarkDoneItem(item.id, {
    status: "done",
    category: category as MarkDoneItem["category"],
    result,
    subtasks: subtasks.length ? subtasks : undefined,
  });

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done: [${item.id}] ${item.title}`);
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
  const items = listMarkDoneItems();
  if (!items.length) {
    console.log("No MarkDone items yet. Run: markdone add \"<task>\"");
    return;
  }

  const groups = {
    "in-progress": items.filter((t) => t.status === "in-progress"),
    pending: items.filter((t) => t.status === "pending"),
    done: items.filter((t) => t.status === "done"),
  };

  if (groups["in-progress"].length) {
    console.log("\nIn Progress:");
    groups["in-progress"].forEach(printMarkDoneItem);
  }
  if (groups.pending.length) {
    console.log("\nPending:");
    groups.pending.forEach(printMarkDoneItem);
  }
  if (groups.done.length) {
    console.log("\nDone:");
    groups.done.forEach(printMarkDoneItem);
  }
  console.log();
}

function printHelp(): void {
  console.log(`
MarkDone — AI-powered tasks with agents

Usage:
  markdone add "<task>"   Add a task and run agents on it immediately
  markdone run <id>       Re-run agents on an existing item
  markdone list           List all MarkDone items
  markdone help           Show this help
`);
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  console.log(cmd);

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
