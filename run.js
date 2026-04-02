#!/usr/bin/env node
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    join(__dirname, "src/index.ts"),
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" }
);
process.exit(result.status ?? 0);
