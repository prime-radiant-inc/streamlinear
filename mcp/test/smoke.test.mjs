import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const mcpRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(mcpRoot, "dist/cli.js");
const serverPath = resolve(mcpRoot, "dist/index.js");

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: mcpRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      LINEAR_API_TOKEN: "",
      ...(options.env ?? {}),
    },
  });
}

test("streamlinear-cli help does not require a Linear token", () => {
  const result = runNode([cliPath, "help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /USAGE:/);
  assert.match(result.stdout, /streamlinear-cli search/);
});

test("MCP server exits clearly when LINEAR_API_TOKEN is missing", () => {
  const result = runNode([serverPath]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /LINEAR_API_TOKEN environment variable is required/);
});
