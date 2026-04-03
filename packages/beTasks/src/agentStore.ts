import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const STORE_PATH = join(process.cwd(), "agents.json");

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentStore {
  agents: Agent[];
}

function load(): AgentStore {
  if (!existsSync(STORE_PATH)) return { agents: [] };
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    return Array.isArray(raw?.agents) ? raw : { agents: [] };
  } catch {
    return { agents: [] };
  }
}

function save(store: AgentStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function createAgent(data: Pick<Agent, "name" | "description" | "systemPrompt">): Agent {
  const store = load();
  const now = new Date().toISOString();
  const agent: Agent = {
    id: randomUUID().slice(0, 8),
    name: data.name,
    description: data.description,
    systemPrompt: data.systemPrompt,
    createdAt: now,
    updatedAt: now,
  };
  store.agents.push(agent);
  save(store);
  return agent;
}

export function listAgents(): Agent[] {
  return load().agents;
}

export function deleteAgent(id: string): boolean {
  const store = load();
  const before = store.agents.length;
  store.agents = store.agents.filter((a) => a.id !== id);
  if (store.agents.length === before) return false;
  save(store);
  return true;
}
