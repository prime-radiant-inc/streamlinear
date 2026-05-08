import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distFiles = ["mcp/dist/index.js", "mcp/dist/cli.js"];

function gitMode(path) {
  const result = spawnSync("git", ["ls-files", "-s", path], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);

  const [mode] = result.stdout.trim().split(/\s+/);
  assert.equal(mode, "100755", `${path} must be tracked with git mode 100755`);
}

for (const file of distFiles) {
  const path = resolve(root, file);
  const contents = readFileSync(path, "utf8");
  const stat = statSync(path);

  assert.ok(contents.startsWith("#!/usr/bin/env node\n"), `${file} must start with a node shebang`);
  assert.ok((stat.mode & 0o111) !== 0, `${file} must be executable on disk`);
  gitMode(file);
}

console.log("dist artifacts are executable and have node shebangs");
