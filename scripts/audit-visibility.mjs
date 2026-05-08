import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {
    workspace: "all",
    write: undefined,
    followUp: process.env.STREAMLINEAR_AUDIT_FOLLOWUP,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === "--workspace") {
      assert.ok(value, "--workspace requires root, mcp, or all");
      args.workspace = value;
      index += 1;
    } else if (arg === "--write") {
      assert.ok(value, "--write requires a path");
      args.write = value;
      index += 1;
    } else if (arg === "--follow-up") {
      assert.ok(value, "--follow-up requires an issue reference");
      args.followUp = value;
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  assert.ok(["root", "mcp", "all"].includes(args.workspace), "--workspace must be root, mcp, or all");
  return args;
}

function auditWorkspace(name, cwd) {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd,
    encoding: "utf8",
  });

  const output = result.stdout || result.stderr;
  assert.ok(output.trim(), `${name} audit did not produce JSON output`);

  let report;
  try {
    report = JSON.parse(output);
  } catch (error) {
    throw new Error(`${name} audit did not produce parseable JSON: ${error.message}`);
  }

  const vulnerabilities = report.metadata?.vulnerabilities ?? {};
  const counts = {
    total: vulnerabilities.total ?? 0,
    critical: vulnerabilities.critical ?? 0,
    high: vulnerabilities.high ?? 0,
    moderate: vulnerabilities.moderate ?? 0,
    low: vulnerabilities.low ?? 0,
  };

  return { name, counts, status: result.status ?? 0 };
}

function formatCounts({ name, counts }) {
  return `${name}: total=${counts.total} critical=${counts.critical} high=${counts.high} moderate=${counts.moderate} low=${counts.low}`;
}

function markdownSummary(results, followUp) {
  const lines = [
    "# Streamlinear Production Audit",
    "",
    "| Workspace | Total | Critical | High | Moderate | Low |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const { name, counts } of results) {
    lines.push(
      `| ${name} | ${counts.total} | ${counts.critical} | ${counts.high} | ${counts.moderate} | ${counts.low} |`,
    );
  }

  if (followUp) {
    lines.push("", `Follow-up: ${followUp}`);
  }

  return `${lines.join("\n")}\n`;
}

const args = parseArgs(process.argv.slice(2));
const workspaces = {
  root,
  mcp: resolve(root, "mcp"),
};

const selected =
  args.workspace === "all"
    ? Object.entries(workspaces)
    : [[args.workspace, workspaces[args.workspace]]];

const results = selected.map(([name, cwd]) => auditWorkspace(name, cwd));

for (const result of results) {
  console.log(formatCounts(result));
}

if (args.write) {
  const destination = resolve(root, args.write);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, markdownSummary(results, args.followUp));
}
