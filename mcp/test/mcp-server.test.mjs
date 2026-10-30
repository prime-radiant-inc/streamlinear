import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const mcpRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(mcpRoot, "dist", "index.js");
const stubPath = join(mcpRoot, "test", "helpers", "linear-api-stub.mjs");

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// Spawn the built MCP server with the Linear API stubbed and speak JSON-RPC
// over stdio, the same way real MCP clients do.
class McpSession {
  constructor(stubLog, options = {}) {
    this.child = spawn(
      process.execPath,
      ["--import", pathToFileURL(stubPath).href, serverPath],
      {
        env: {
          ...process.env,
          LINEAR_API_TOKEN: "stub-token",
          LINEAR_STUB_LOG: stubLog,
          ...(options.env ?? {}),
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    this.pending = new Map();
    this.buffer = "";
    this.stderr = "";

    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.onStdout(chunk));
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk;
    });

    this.exit = new Promise((resolve) => this.child.on("exit", resolve));
    this.child.on("exit", () => {
      for (const reject of this.pending.values()) {
        reject(new Error(`server exited before responding; stderr:\n${this.stderr}`));
      }
      this.pending.clear();
    });
  }

  onStdout(chunk) {
    this.buffer += chunk;
    let newline;
    while ((newline = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined && this.pending.has(message.id)) {
        this.pending.get(message.id)(message);
        this.pending.delete(message.id);
      }
    }
  }

  send(message) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(message, timeoutMs = 15000) {
    const received = new Promise((resolve, reject) => {
      this.pending.set(message.id, resolve);
    });
    this.send(message);
    return withTimeout(received, timeoutMs, `response to ${message.method} (id ${message.id})`);
  }

  async stop() {
    if (this.pending.size === 0 && this.exit.isFulfilled) return;
    this.child.kill();
    await withTimeout(this.exit, 5000, "server exit");
  }
}

function readStubLog(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("linear MCP tool works end to end over stdio", async () => {
  const { session, init, stubLog, workDir } = await startSession();

  try {
    assert.equal(init.result.serverInfo.name, "linear");

    const tools = await session.request({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    assert.ok(!tools.error, `tools/list failed: ${JSON.stringify(tools.error ?? {})}`);
    const linear = tools.result.tools.find((t) => t.name === "linear");
    assert.ok(linear, `linear tool missing from tools/list: ${JSON.stringify(tools.result)}`);
    assert.deepEqual(linear.inputSchema.properties.action.enum, [
      "search",
      "get",
      "update",
      "comment",
      "create",
      "graphql",
      "help",
    ]);
    assert.ok(linear.inputSchema.properties.labels, "tool schema must expose a labels parameter");
    assert.ok(linear.inputSchema.properties.assignee, "tool schema must expose an assignee parameter");

    const call = (id, arguments_) =>
      session.request({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "linear", arguments: arguments_ },
      });

    const created = await call(3, {
      action: "create",
      title: "Test issue",
      team: "DEV",
      state: "Todo",
      assignee: "me",
    });
    assert.ok(!created.error, `create failed: ${JSON.stringify(created.error ?? {})}`);
    assert.match(
      created.result.content[0].text,
      /Created DEV-1/,
      `unexpected create response: ${JSON.stringify(created.result)}`,
    );

    const updated = await call(4, {
      action: "update",
      id: "DEV-1",
      assignee: "ad660447-3bc6-46c9-bec8-568c55512e79",
    });
    assert.ok(!updated.error, `update failed: ${JSON.stringify(updated.error ?? {})}`);
    assert.match(
      updated.result.content[0].text,
      /Updated DEV-1/,
      `unexpected update response: ${JSON.stringify(updated.result)}`,
    );

    const helped = await call(5, { action: "help" });
    assert.match(
      helped.result.content[0].text,
      /## Actions/,
      `unexpected help response: ${JSON.stringify(helped.result)}`,
    );

    const requests = readStubLog(stubLog);
    const createRequest = requests.find((r) => r.query.includes("issueCreate"));
    assert.ok(createRequest, "no issueCreate mutation reached the stubbed API");
    assert.equal(createRequest.variables.input.stateId, "state-todo");
    assert.equal(createRequest.variables.input.assigneeId, "user-viewer");

    const updateRequest = requests.find((r) => r.query.includes("issueUpdate"));
    assert.ok(updateRequest, "no issueUpdate mutation reached the stubbed API");
    assert.equal(
      updateRequest.variables.input.assigneeId,
      "ad660447-3bc6-46c9-bec8-568c55512e79",
    );
  } finally {
    await session.stop();
    rmSync(workDir, { recursive: true, force: true });
  }
});

async function startSession() {
  const workDir = mkdtempSync(join(tmpdir(), "streamlinear-mcp-test-"));
  const stubLog = join(workDir, "linear-stub.log");
  const session = new McpSession(stubLog);

  const init = await session.request({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "streamlinear-test", version: "0.0.0" },
    },
  });
  assert.ok(!init.error, `initialize failed: ${JSON.stringify(init.error ?? {})}`);
  session.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  return { session, init, stubLog, workDir };
}

function cleanupSession(session, workDir) {
  return session.stop().finally(() => rmSync(workDir, { recursive: true, force: true }));
}

test("labels reach the create and update mutations", async () => {
  const { session, stubLog, workDir } = await startSession();

  try {
    const call = (id, arguments_) =>
      session.request({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "linear", arguments: arguments_ },
      });

    const created = await call(2, {
      action: "create",
      title: "Labeled issue",
      team: "DEV",
      labels: ["bug", "urgent"],
    });
    assert.ok(!created.error, `create failed: ${JSON.stringify(created.error ?? {})}`);
    assert.match(created.result.content[0].text, /Created DEV-1/);

    const relabeled = await call(3, { action: "update", id: "DEV-1", labels: ["docs"] });
    assert.ok(!relabeled.error, `update failed: ${JSON.stringify(relabeled.error ?? {})}`);
    assert.match(
      relabeled.result.content[0].text,
      /Updated DEV-1: labels → docs/,
      `labels-only update did not apply: ${JSON.stringify(relabeled.result)}`,
    );

    const cleared = await call(4, { action: "update", id: "DEV-1", labels: [] });
    assert.ok(!cleared.error, `clear failed: ${JSON.stringify(cleared.error ?? {})}`);
    assert.match(
      cleared.result.content[0].text,
      /Updated DEV-1: labels → none/,
      `clearing labels did not apply: ${JSON.stringify(cleared.result)}`,
    );

    const requests = readStubLog(stubLog);
    const createRequest = requests.find((r) => r.query.includes("issueCreate"));
    assert.ok(createRequest, "no issueCreate mutation reached the stubbed API");
    assert.deepEqual(
      createRequest.variables.input.labelIds,
      ["label-bug", "label-urgent"],
      "create must resolve label names to label IDs",
    );

    const updateRequests = requests.filter((r) => r.query.includes("issueUpdate"));
    assert.equal(updateRequests.length, 2, "labels-only updates must reach issueUpdate");
    assert.deepEqual(
      updateRequests[0].variables.input.labelIds,
      ["label-docs"],
      "update must send the resolved label IDs",
    );
    assert.deepEqual(
      updateRequests[1].variables.input.labelIds,
      [],
      "an empty labels list must be sent to clear labels",
    );
  } finally {
    await cleanupSession(session, workDir);
  }
});

test("unknown label names produce an actionable error", async () => {
  const { session, workDir } = await startSession();

  try {
    const failed = await session.request({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "linear",
        arguments: { action: "create", title: "Mislabeled", team: "DEV", labels: ["nope"] },
      },
    });

    assert.ok(!failed.error, `tools/call failed: ${JSON.stringify(failed.error ?? {})}`);
    assert.match(
      failed.result.content[0].text,
      /Label "nope" not found\. Available labels: bug, urgent, docs/,
      `unknown label should name the missing label and the options: ${JSON.stringify(failed.result)}`,
    );
  } finally {
    await cleanupSession(session, workDir);
  }
});

test("post-only mode blocks read actions and allows writes", async () => {
  const workDir = mkdtempSync(join(tmpdir(), "streamlinear-mcp-test-"));
  const stubLog = join(workDir, "linear-stub.log");
  const session = new McpSession(stubLog, { env: { STREAMLINEAR_POST_ONLY: "1" } });

  try {
    const init = await session.request({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "streamlinear-test", version: "0.0.0" },
      },
    });
    assert.ok(!init.error, `initialize failed: ${JSON.stringify(init.error ?? {})}`);
    session.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

    const call = (id, arguments_) =>
      session.request({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "linear", arguments: arguments_ },
      });

    const blockedGet = await call(2, { action: "get", id: "DEV-1" });
    assert.match(
      blockedGet.result.content[0].text,
      /Action "get" is disabled: STREAMLINEAR_POST_ONLY is set/,
      `get must be blocked in post-only mode: ${JSON.stringify(blockedGet.result)}`,
    );

    const blockedSearch = await call(3, { action: "search", query: "anything" });
    assert.match(
      blockedSearch.result.content[0].text,
      /Action "search" is disabled: STREAMLINEAR_POST_ONLY is set/,
      `search must be blocked in post-only mode: ${JSON.stringify(blockedSearch.result)}`,
    );

    const blockedGraphql = await call(4, { action: "graphql", graphql: "query { viewer { id } }" });
    assert.match(
      blockedGraphql.result.content[0].text,
      /Action "graphql" is disabled: STREAMLINEAR_POST_ONLY is set/,
      `graphql must be blocked in post-only mode: ${JSON.stringify(blockedGraphql.result)}`,
    );

    const created = await call(5, { action: "create", title: "Post-only create", team: "DEV" });
    assert.match(
      created.result.content[0].text,
      /Created DEV-1/,
      `create must still work in post-only mode: ${JSON.stringify(created.result)}`,
    );

    const helped = await call(6, { action: "help" });
    assert.match(
      helped.result.content[0].text,
      /Post-only mode is active/,
      `help must explain post-only mode: ${JSON.stringify(helped.result)}`,
    );

    const requests = readStubLog(stubLog);
    assert.ok(
      !requests.some((r) => r.query.includes("searchIssues")),
      "blocked search must not reach the Linear API",
    );
    assert.ok(
      !requests.some((r) => r.query.includes("issue(id:")),
      "blocked get must not reach the Linear API",
    );
  } finally {
    await cleanupSession(session, workDir);
  }
});

test("read actions work when post-only mode is not set", async () => {
  const { session, stubLog, workDir } = await startSession();

  try {
    const read = await session.request({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "linear", arguments: { action: "get", id: "DEV-1" } },
    });

    assert.ok(!read.error, `get failed: ${JSON.stringify(read.error ?? {})}`);
    assert.match(
      read.result.content[0].text,
      /\*\*DEV-1\*\*: Test issue/,
      `get must return issue details without the flag: ${JSON.stringify(read.result)}`,
    );
    assert.match(read.result.content[0].text, /Labels: bug/);
    assert.match(read.result.content[0].text, /Recent Comments/);
  } finally {
    await cleanupSession(session, workDir);
  }
});
