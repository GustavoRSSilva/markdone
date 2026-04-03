#!/usr/bin/env node
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxLoader = join(__dirname, "node_modules/tsx/dist/loader.mjs");
const result = spawnSync(
  process.execPath,
  ["--import", tsxLoader, join(__dirname, "src/index.ts"), ...process.argv.slice(2)],
  { stdio: "inherit", cwd: process.cwd() }
);
process.exit(result.status ?? 0);
