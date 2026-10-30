import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { readStubLog } from "./helpers/stub-log.mjs";

const mcpRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(mcpRoot, "dist", "cli.js");
const stubPath = join(mcpRoot, "test", "helpers", "linear-api-stub.mjs");

function runCli(args, stubLog) {
  return spawnSync(
    process.execPath,
    ["--import", pathToFileURL(stubPath).href, cliPath, ...args],
    {
      encoding: "utf8",
      env: { ...process.env, LINEAR_API_TOKEN: "stub-token", LINEAR_STUB_LOG: stubLog },
    },
  );
}

function withStubLog() {
  const workDir = mkdtempSync(join(tmpdir(), "streamlinear-cli-test-"));
  return { workDir, stubLog: join(workDir, "linear-stub.log") };
}

test("CLI create accepts state, assignee, and labels", () => {
  const { workDir, stubLog } = withStubLog();

  try {
    const result = runCli(
      [
        "create",
        "--title",
        "CLI test",
        "--team",
        "DEV",
        "--state",
        "Todo",
        "--assignee",
        "me",
        "--labels",
        "bug,urgent",
      ],
      stubLog,
    );

    assert.equal(result.status, 0, `CLI failed: ${result.stderr}`);
    assert.match(result.stdout, /Created DEV-1/);

    const createRequest = readStubLog(stubLog).find((r) => r.query.includes("issueCreate"));
    assert.ok(createRequest, "no issueCreate mutation reached the stubbed API");
    assert.equal(createRequest.variables.input.stateId, "state-todo");
    assert.equal(createRequest.variables.input.assigneeId, "user-viewer");
    assert.deepEqual(
      createRequest.variables.input.labelIds,
      ["label-bug", "label-urgent"],
      "create must resolve comma-separated labels to IDs",
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("CLI update applies labels and can clear them", () => {
  const relabel = withStubLog();
  const clear = withStubLog();

  try {
    const relabeled = runCli(["update", "DEV-1", "--labels", "docs"], relabel.stubLog);
    assert.equal(relabeled.status, 0, `labels-only update failed: ${relabeled.stderr}`);
    assert.match(relabeled.stdout, /Updated DEV-1: labels → docs/);

    const relabelRequest = readStubLog(relabel.stubLog).find((r) => r.query.includes("issueUpdate"));
    assert.ok(relabelRequest, "no issueUpdate mutation reached the stubbed API");
    assert.deepEqual(relabelRequest.variables.input.labelIds, ["label-docs"]);

    const cleared = runCli(["update", "DEV-1", "--labels", ""], clear.stubLog);
    assert.equal(cleared.status, 0, `clearing labels failed: ${cleared.stderr}`);
    assert.match(cleared.stdout, /Updated DEV-1: labels → none/);

    const clearRequest = readStubLog(clear.stubLog).find((r) => r.query.includes("issueUpdate"));
    assert.ok(clearRequest, "no issueUpdate mutation reached the stubbed API");
    assert.deepEqual(
      clearRequest.variables.input.labelIds,
      [],
      "an empty --labels value must be sent to clear labels",
    );
  } finally {
    rmSync(relabel.workDir, { recursive: true, force: true });
    rmSync(clear.workDir, { recursive: true, force: true });
  }
});

test("CLI search accepts a UUID assignee", () => {
  const { workDir, stubLog } = withStubLog();
  const uuid = "ad660447-3bc6-46c9-bec8-568c55512e79";

  try {
    const result = runCli(["search", "--assignee", uuid], stubLog);

    assert.equal(result.status, 0, `CLI failed: ${result.stderr}`);
    assert.match(result.stdout, /No issues found/);

    const request = readStubLog(stubLog).find((r) => r.query.includes("issues("));
    assert.ok(request, "no issues query reached the stubbed API");
    assert.match(
      request.query,
      new RegExp(`assignee: \\{ id: \\{ eq: "${uuid}" \\} \\}`),
      `a UUID assignee must filter by id, not by email: ${request.query}`,
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});
