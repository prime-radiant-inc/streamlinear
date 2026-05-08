# Streamlinear npm-grade Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@primeradianthq/streamlinear@1.1.1` as a normal npm runtime package that Scribble can consume without a source checkout.

**Architecture:** Keep `mcp/` as the TypeScript source and ESM runtime boundary, and make the root package the npm-facing release wrapper. The tarball contains only public docs, root package metadata, built MCP/CLI artifacts, and `mcp/package.json` so direct Node execution keeps ESM semantics.

**Tech Stack:** npm, Node 20/24, TypeScript, esbuild, Node's built-in test runner, lefthook for optional clone-only hooks, GitHub Actions, npm publish.

---

## File Structure

- Modify `package.json`: scoped package identity, version `1.1.1`, public publish metadata, runtime `files` allowlist, stable bins, deterministic scripts, optional hook install command, no npm lifecycle hook install.
- Modify `package-lock.json`: synchronize root package identity and dev dependency changes after root package edits.
- Modify `mcp/package.json`: version `1.1.1`, add `typecheck` and `test`, keep `"type": "module"` for direct Node execution of packed `mcp/dist/*.js`.
- Modify `mcp/package-lock.json`: synchronize nested package version after `mcp/package.json` edits.
- Modify `mcp/src/index.ts`: update MCP server version to `1.1.1`.
- Create `mcp/test/smoke.test.mjs`: deterministic smoke coverage for CLI help and MCP missing-token startup.
- Create `scripts/check-dist-artifacts.mjs`: validate shebangs, executable bits, and git executable modes for the two published bins.
- Create `scripts/check-package-metadata.mjs`: validate package metadata, bins, files allowlist, plugin metadata, and script policy.
- Create `scripts/verify-pack.mjs`: run `npm pack --json`, assert exact tarball files, install tarball in a temp consumer, and smoke the bins plus direct Node path.
- Create `scripts/audit-visibility.mjs`: run root and nested production audits, print normalized summaries, and optionally write a release audit note without failing solely because vulnerabilities exist.
- Create `scripts/check-release-tag.mjs`: validate release tag and package version agree.
- Create `lefthook.yml`: optional path-scoped developer hook, check-only, no staging.
- Create `.github/workflows/ci.yml`: run install and full checks on Node 20 and Node 24 for PRs and `main`.
- Create `.github/workflows/release.yml`: tag-driven npm publish workflow for `v*.*.*`.
- Modify `.claude-plugin/plugin.json`: migrate repo metadata and version to Prime Radiant while keeping plugin metadata repo-only.
- Modify `.claude-plugin/skills/linear/SKILL.md`: update action count wording if needed, and leave plugin behavior unchanged.
- Modify `README.md`: replace GitHub source install snippets with npm package usage and document Scribble-compatible runtime env.
- Create `LICENSE`: add the MIT license text for the existing MIT package declaration.
- Create `SECURITY.md`: public security reporting policy that does not invent an email address.
- Create `CONTRIBUTING.md`: install, build, check, hooks, and release discipline.
- Create `CHANGELOG.md`: record `1.1.1` as the first Prime Radiant npm-grade release.
- Create `docs/release/streamlinear-1.1.1-audit.md`: generated audit visibility note after the follow-up Linear ticket exists.

Commit note: the current checkout may still have an obsolete `simple-git-hooks` pre-commit hook installed under `.git/hooks`. The task commit commands use `--no-verify` because this plan is removing that hook behavior, and Drew approved bypassing it for this cleanup.

## Task 1: Metadata And Package Identity

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `mcp/package.json`
- Modify: `mcp/package-lock.json`
- Modify: `mcp/src/index.ts`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/skills/linear/SKILL.md`

- [ ] **Step 1: Inspect current worktree and preserve unrelated changes**

Run:

```bash
git status --short
```

Expected:

```text
 M package-lock.json
?? CLAUDE.md
```

If additional unrelated files appear, leave them unstaged. Do not revert `package-lock.json` or `CLAUDE.md`; they predate this plan in the caller checkout.

- [ ] **Step 2: Replace root package metadata**

Edit `package.json` to this shape, preserving JSON formatting with two-space indentation:

```json
{
  "name": "@primeradianthq/streamlinear",
  "version": "1.1.1",
  "description": "A lightweight Linear MCP for Claude Code",
  "author": "Prime Radiant",
  "contributors": [
    "Jesse Vincent <jesse@fsck.com>"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/primeradianthq/streamlinear.git"
  },
  "bugs": {
    "url": "https://github.com/primeradianthq/streamlinear/issues"
  },
  "homepage": "https://github.com/primeradianthq/streamlinear#readme",
  "engines": {
    "node": ">=20"
  },
  "publishConfig": {
    "access": "public"
  },
  "bin": {
    "streamlinear": "mcp/dist/index.js",
    "streamlinear-cli": "mcp/dist/cli.js"
  },
  "files": [
    "mcp/dist/index.js",
    "mcp/dist/cli.js",
    "mcp/package.json",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "npm --prefix mcp run build",
    "typecheck": "npm --prefix mcp run typecheck",
    "test": "npm --prefix mcp run test",
    "dist:check": "node scripts/check-dist-artifacts.mjs",
    "package:check": "node scripts/check-package-metadata.mjs",
    "audit:prod": "node scripts/audit-visibility.mjs --workspace root",
    "audit:prod:mcp": "node scripts/audit-visibility.mjs --workspace mcp",
    "audit:summary": "node scripts/audit-visibility.mjs --workspace all --write docs/release/streamlinear-1.1.1-audit.md",
    "pack:verify": "node scripts/verify-pack.mjs",
    "check": "npm run build && npm run typecheck && npm run test && npm run dist:check && npm run package:check && npm run audit:prod && npm run audit:prod:mcp && npm run pack:verify",
    "hooks:install": "lefthook install",
    "release:verify-tag": "node scripts/check-release-tag.mjs"
  },
  "devDependencies": {
    "lefthook": "^2.1.6"
  },
  "keywords": [
    "linear",
    "mcp",
    "claude-code",
    "model-context-protocol"
  ]
}
```

- [ ] **Step 3: Update nested MCP package metadata**

Edit `mcp/package.json` to keep the existing dependencies and build scripts, while changing version and adding typecheck/test:

```json
{
  "name": "streamlinear-mcp",
  "version": "1.1.1",
  "description": "A lightweight MCP server for Linear",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "npm run build:mcp && npm run build:cli",
    "build:mcp": "esbuild src/index.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/index.js --external:fsevents --banner:js='#!/usr/bin/env node'",
    "build:cli": "esbuild src/cli.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/cli.js --external:fsevents --banner:js='#!/usr/bin/env node'",
    "typecheck": "tsc --noEmit",
    "test": "npm run build && node --test test/*.test.mjs",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 4: Update MCP server version**

In `mcp/src/index.ts`, change only the server version:

```ts
const server = new McpServer({
  name: "linear",
  version: "1.1.1",
});
```

- [ ] **Step 5: Update repo-only Claude plugin metadata**

Edit `.claude-plugin/plugin.json` to:

```json
{
  "name": "streamlinear",
  "version": "1.1.1",
  "description": "Streamlined Linear integration - one tool, seven actions, zero bloat",
  "author": {
    "name": "Prime Radiant"
  },
  "repository": "https://github.com/primeradianthq/streamlinear",
  "mcpServers": {
    "linear": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js"],
      "env": {
        "LINEAR_API_TOKEN": "${LINEAR_API_TOKEN}"
      }
    }
  }
}
```

- [ ] **Step 6: Update plugin skill wording**

In `.claude-plugin/skills/linear/SKILL.md`, keep the commands unchanged. If the phrase `six actions` appears, replace it with `seven actions`; the current skill body already lists the expected user-facing commands.

- [ ] **Step 7: Update lockfiles deterministically**

Run:

```bash
npm install --package-lock-only
npm --prefix mcp install --package-lock-only
```

Expected:

```text
up to date
```

The exact audit line may vary. Confirm the lockfile roots now show `@primeradianthq/streamlinear@1.1.1` and `streamlinear-mcp@1.1.1`:

```bash
jq '.packages[""].name, .packages[""].version' package-lock.json
jq '.packages[""].name, .packages[""].version' mcp/package-lock.json
```

Expected:

```text
"@primeradianthq/streamlinear"
"1.1.1"
"streamlinear-mcp"
"1.1.1"
```

- [ ] **Step 8: Verify no npm install remains inside project scripts**

Run:

```bash
jq -r '.scripts | to_entries[] | "\(.key)=\(.value)"' package.json mcp/package.json
```

Expected: no script value contains `npm install` or `npm ci`.

- [ ] **Step 9: Commit metadata changes**

Stage only files touched in this task:

```bash
git add package.json package-lock.json mcp/package.json mcp/package-lock.json mcp/src/index.ts .claude-plugin/plugin.json .claude-plugin/skills/linear/SKILL.md
git commit --no-verify -m "chore: prepare streamlinear package metadata"
```

## Task 2: Tests And Verification Scripts

**Files:**
- Create: `mcp/test/smoke.test.mjs`
- Create: `scripts/check-dist-artifacts.mjs`
- Create: `scripts/check-package-metadata.mjs`
- Create: `scripts/verify-pack.mjs`
- Create: `scripts/audit-visibility.mjs`
- Create: `scripts/check-release-tag.mjs`

- [ ] **Step 1: Add MCP smoke tests**

Create `mcp/test/smoke.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests once to verify the current build path is covered**

Run:

```bash
npm --prefix mcp run test
```

Expected:

```text
# pass 2
# fail 0
```

- [ ] **Step 3: Add dist artifact checker**

Create `scripts/check-dist-artifacts.mjs`:

```js
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const artifacts = [
  "mcp/dist/index.js",
  "mcp/dist/cli.js",
];

let failed = false;

function fail(message) {
  failed = true;
  console.error(`dist check failed: ${message}`);
}

for (const artifact of artifacts) {
  const source = readFileSync(artifact, "utf8");
  if (!source.startsWith("#!/usr/bin/env node\n")) {
    fail(`${artifact} must start with #!/usr/bin/env node`);
  }

  const mode = statSync(artifact).mode;
  if ((mode & 0o111) === 0) {
    fail(`${artifact} must be executable on disk`);
  }

  const stage = execFileSync("git", ["ls-files", "--stage", artifact], {
    encoding: "utf8",
  }).trim();
  if (!stage.startsWith("100755 ")) {
    fail(`${artifact} must be tracked with git mode 100755`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("dist artifacts are executable and have node shebangs");
```

- [ ] **Step 4: Add package metadata checker**

Create `scripts/check-package-metadata.mjs`:

```js
import { readFileSync } from "node:fs";

const expectedFiles = [
  "mcp/dist/index.js",
  "mcp/dist/cli.js",
  "mcp/package.json",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
];

const forbiddenLifecycleScripts = [
  "prepare",
  "prepublish",
  "prepublishOnly",
  "postinstall",
];

let failed = false;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  failed = true;
  console.error(`package metadata check failed: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(`${message}; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertArrayEqual(actual, expected, message) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(`${message}; expected ${JSON.stringify(expectedSorted)}, got ${JSON.stringify(actualSorted)}`);
  }
}

function assertScriptsAreConsumerSafe(packagePath, scripts) {
  for (const scriptName of forbiddenLifecycleScripts) {
    if (Object.hasOwn(scripts, scriptName)) {
      fail(`${packagePath} must not define consumer lifecycle script ${scriptName}`);
    }
  }

  for (const [scriptName, scriptValue] of Object.entries(scripts)) {
    if (/\bnpm\s+(install|ci)\b/.test(scriptValue)) {
      fail(`${packagePath} script ${scriptName} must not run ${scriptValue}`);
    }
  }
}

const rootPackage = readJson("package.json");
assertEqual(rootPackage.name, "@primeradianthq/streamlinear", "root package name");
assertEqual(rootPackage.version, "1.1.1", "root package version");
assertEqual(rootPackage.publishConfig?.access, "public", "publish access");
assertEqual(rootPackage.bin?.streamlinear, "mcp/dist/index.js", "streamlinear bin path");
assertEqual(rootPackage.bin?.["streamlinear-cli"], "mcp/dist/cli.js", "streamlinear-cli bin path");
assertArrayEqual(rootPackage.files ?? [], expectedFiles, "root package files allowlist");
assertScriptsAreConsumerSafe("package.json", rootPackage.scripts ?? {});

const mcpPackage = readJson("mcp/package.json");
assertEqual(mcpPackage.version, "1.1.1", "mcp package version");
assertEqual(mcpPackage.type, "module", "mcp package type");
assertScriptsAreConsumerSafe("mcp/package.json", mcpPackage.scripts ?? {});

const plugin = readJson(".claude-plugin/plugin.json");
assertEqual(plugin.version, "1.1.1", "plugin version");
assertEqual(plugin.repository, "https://github.com/primeradianthq/streamlinear", "plugin repository");

if (failed) {
  process.exit(1);
}

console.log("package metadata is npm-grade");
```

- [ ] **Step 5: Add pack verifier**

Create `scripts/verify-pack.mjs`:

```js
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedPackedFiles = [
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "mcp/dist/cli.js",
  "mcp/dist/index.js",
  "mcp/package.json",
  "package.json",
].sort();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
  });

  if (options.allowFailure) {
    return result;
  }

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }

  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertOutputIncludes(result, streamName, expected) {
  const value = result[streamName] ?? "";
  assert(value.includes(expected), `${streamName} must include ${JSON.stringify(expected)}; got ${JSON.stringify(value)}`);
}

const packDir = mkdtempSync(join(tmpdir(), "streamlinear-pack-"));
const consumerDir = mkdtempSync(join(tmpdir(), "streamlinear-consumer-"));

try {
  const packResult = run("npm", ["pack", "--json", "--pack-destination", packDir]);
  const packEntries = JSON.parse(packResult.stdout.trim());
  assert(packEntries.length === 1, "npm pack must produce exactly one tarball");

  const pack = packEntries[0];
  assert(pack.name === "@primeradianthq/streamlinear", `packed package name was ${pack.name}`);
  assert(pack.version === "1.1.1", `packed package version was ${pack.version}`);

  const packedFiles = pack.files.map((file) => file.path).sort();
  assert(
    JSON.stringify(packedFiles) === JSON.stringify(expectedPackedFiles),
    `packed files mismatch\nexpected: ${expectedPackedFiles.join("\n")}\nactual: ${packedFiles.join("\n")}`,
  );

  const tarballPath = join(packDir, pack.filename);
  run("npm", ["init", "-y"], { cwd: consumerDir });
  run("npm", ["install", "--no-audit", "--no-fund", tarballPath], { cwd: consumerDir });

  const installedPackagePath = join(consumerDir, "node_modules/@primeradianthq/streamlinear/package.json");
  const installedPackage = JSON.parse(readFileSync(installedPackagePath, "utf8"));
  assert(installedPackage.bin.streamlinear === "mcp/dist/index.js", "installed streamlinear bin path");
  assert(installedPackage.bin["streamlinear-cli"] === "mcp/dist/cli.js", "installed streamlinear-cli bin path");

  const installedMcpPackagePath = join(consumerDir, "node_modules/@primeradianthq/streamlinear/mcp/package.json");
  const installedMcpPackage = JSON.parse(readFileSync(installedMcpPackagePath, "utf8"));
  assert(installedMcpPackage.type === "module", "installed mcp package must preserve ESM type");

  const binDir = join(consumerDir, "node_modules/.bin");
  const cliHelp = run(join(binDir, "streamlinear-cli"), ["help"], { cwd: consumerDir });
  assertOutputIncludes(cliHelp, "stdout", "USAGE:");

  const envWithoutToken = { ...process.env, LINEAR_API_TOKEN: "" };
  const binServer = run(join(binDir, "streamlinear"), [], {
    cwd: consumerDir,
    env: envWithoutToken,
    allowFailure: true,
  });
  assert(binServer.status !== 0, "streamlinear bin must fail without LINEAR_API_TOKEN");
  assertOutputIncludes(binServer, "stderr", "LINEAR_API_TOKEN environment variable is required");

  const directServerPath = join(consumerDir, "node_modules/@primeradianthq/streamlinear/mcp/dist/index.js");
  const directServer = run(process.execPath, [directServerPath], {
    cwd: consumerDir,
    env: envWithoutToken,
    allowFailure: true,
  });
  assert(directServer.status !== 0, "direct node MCP server must fail without LINEAR_API_TOKEN");
  assertOutputIncludes(directServer, "stderr", "LINEAR_API_TOKEN environment variable is required");

  console.log(`verified ${pack.filename}`);
} finally {
  rmSync(packDir, { force: true, recursive: true });
  rmSync(consumerDir, { force: true, recursive: true });
}
```

- [ ] **Step 6: Add audit visibility script**

Create `scripts/audit-visibility.mjs`:

```js
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function readFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const workspaceFlag = readFlag("--workspace") ?? "all";
const writePath = readFlag("--write");
const followUpIssue = readFlag("--follow-up") ?? process.env.STREAMLINEAR_AUDIT_FOLLOWUP ?? null;

const workspaceConfigs = {
  root: { label: "root", cwd: root },
  mcp: { label: "mcp", cwd: resolve(root, "mcp") },
};

const selectedWorkspaces = workspaceFlag === "all"
  ? [workspaceConfigs.root, workspaceConfigs.mcp]
  : [workspaceConfigs[workspaceFlag]].filter(Boolean);

if (selectedWorkspaces.length === 0) {
  console.error(`Unknown workspace: ${workspaceFlag}`);
  process.exit(1);
}

function runAudit(workspace) {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd: workspace.cwd,
    encoding: "utf8",
  });

  if (!result.stdout.trim()) {
    console.error(result.stderr);
    throw new Error(`npm audit produced no JSON for ${workspace.label}`);
  }

  const report = JSON.parse(result.stdout);
  return {
    label: workspace.label,
    status: result.status,
    vulnerabilities: report.metadata?.vulnerabilities ?? {},
    dependencyCounts: report.metadata?.dependencies ?? {},
    advisoryNames: Object.keys(report.vulnerabilities ?? {}).sort(),
  };
}

function formatSummary(summaries) {
  const lines = [
    "# Streamlinear 1.1.1 Audit Visibility",
    "",
    `Generated: ${new Date().toISOString()}`,
    followUpIssue ? `Follow-up issue: ${followUpIssue}` : "Follow-up issue: not recorded in this run",
    "",
    "| Workspace | Total | Critical | High | Moderate | Low | Info | Prod deps | Advisory packages |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const summary of summaries) {
    const counts = summary.vulnerabilities;
    const advisoryNames = summary.advisoryNames.length > 0
      ? summary.advisoryNames.join(", ")
      : "none";
    lines.push([
      summary.label,
      counts.total ?? 0,
      counts.critical ?? 0,
      counts.high ?? 0,
      counts.moderate ?? 0,
      counts.low ?? 0,
      counts.info ?? 0,
      summary.dependencyCounts.prod ?? 0,
      advisoryNames,
    ].join(" | "));
  }

  lines.push("");
  lines.push("This file records audit visibility for the npm-grade release. Vulnerability remediation is tracked separately so package publication can unblock Scribble bridge removal.");
  lines.push("");

  return lines.join("\n");
}

try {
  const summaries = selectedWorkspaces.map(runAudit);
  for (const summary of summaries) {
    const counts = summary.vulnerabilities;
    console.log(`${summary.label}: total=${counts.total ?? 0} critical=${counts.critical ?? 0} high=${counts.high ?? 0} moderate=${counts.moderate ?? 0} low=${counts.low ?? 0}`);
  }

  if (writePath) {
    const absoluteWritePath = resolve(root, writePath);
    mkdirSync(dirname(absoluteWritePath), { recursive: true });
    writeFileSync(absoluteWritePath, formatSummary(summaries));
    console.log(`wrote ${writePath}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
```

- [ ] **Step 7: Add release tag checker**

Create `scripts/check-release-tag.mjs`:

```js
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const expectedTag = `v${packageJson.version}`;

function currentTag() {
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }

  return execFileSync("git", ["describe", "--tags", "--exact-match"], {
    encoding: "utf8",
  }).trim();
}

const tag = currentTag();

if (tag !== expectedTag) {
  console.error(`release tag ${tag} does not match package version ${expectedTag}`);
  process.exit(1);
}

console.log(`release tag ${tag} matches package version ${packageJson.version}`);
```

- [ ] **Step 8: Run verification scripts locally**

Run:

```bash
npm run build
npm run typecheck
npm run test
npm run dist:check
npm run package:check
npm run audit:prod
npm run audit:prod:mcp
npm run pack:verify
```

Expected highlights:

```text
dist artifacts are executable and have node shebangs
package metadata is npm-grade
root: total=0 critical=0 high=0 moderate=0 low=0
mcp: total=6 critical=0 high=4 moderate=2 low=0
verified primeradianthq-streamlinear-1.1.1.tgz
```

The nested MCP audit count is a current npm audit snapshot. If the npm advisory database changes before execution, record the observed count in the audit note and keep remediation scoped to `PRI-1538`.

- [ ] **Step 9: Commit verification scripts**

```bash
git add mcp/test/smoke.test.mjs scripts/check-dist-artifacts.mjs scripts/check-package-metadata.mjs scripts/verify-pack.mjs scripts/audit-visibility.mjs scripts/check-release-tag.mjs
git commit --no-verify -m "test: verify streamlinear npm package"
```

## Task 3: Clone-Only Hooks, CI, And Release Workflow

**Files:**
- Create: `lefthook.yml`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Add path-scoped lefthook config**

Create `lefthook.yml`:

```yaml
pre-commit:
  commands:
    streamlinear-check:
      glob: "{package.json,package-lock.json,mcp/package.json,mcp/package-lock.json,mcp/tsconfig.json,mcp/src/**/*.ts,mcp/test/**/*.mjs,scripts/**/*.mjs,lefthook.yml,.github/workflows/*.yml}"
      run: npm run check
```

This hook is intentionally installed only through `npm run hooks:install`; there is no `prepare` script.

- [ ] **Step 2: Verify hook config is check-only**

Run:

```bash
rg "git add|npm install|npm ci|simple-git-hooks|prepare" package.json lefthook.yml
```

Expected: no output for `git add`, `npm install`, `npm ci`, `simple-git-hooks`, or a root `prepare` script.

- [ ] **Step 3: Add CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  check:
    name: Node ${{ matrix.node-version }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version:
          - 20.x
          - 24.x

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
          cache-dependency-path: |
            package-lock.json
            mcp/package-lock.json

      - name: Install root dependencies
        run: npm ci

      - name: Install MCP dependencies
        run: npm --prefix mcp ci

      - name: Check
        run: npm run check
```

- [ ] **Step 4: Add tag-driven release workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: npm
          cache-dependency-path: |
            package-lock.json
            mcp/package-lock.json
          registry-url: https://registry.npmjs.org

      - name: Install root dependencies
        run: npm ci

      - name: Install MCP dependencies
        run: npm --prefix mcp ci

      - name: Verify release tag
        run: npm run release:verify-tag

      - name: Check
        run: npm run check

      - name: Publish to npm
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 5: Run CI-equivalent local check**

Run:

```bash
npm ci
npm --prefix mcp ci
npm run check
```

Expected: all commands exit 0. The nested audit summary can include nonzero vulnerability counts while still exiting 0.

- [ ] **Step 6: Commit hooks and workflows**

```bash
git add lefthook.yml .github/workflows/ci.yml .github/workflows/release.yml package-lock.json mcp/package-lock.json
git commit --no-verify -m "ci: add streamlinear package release checks"
```

## Task 4: Public Docs And Release Notes

**Files:**
- Modify: `README.md`
- Create: `LICENSE`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: Add the MIT license file**

Create `LICENSE`:

```text
MIT License

Copyright (c) Jesse Vincent and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Update README install instructions**

In `README.md`, replace the `Installation` section with:

````markdown
## Installation

### Single Workspace

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@primeradianthq/streamlinear@1.1.1"],
      "env": {
        "LINEAR_API_TOKEN": "lin_api_xxxxx"
      }
    }
  }
}
```

### Multiple Workspaces

To use streamlinear with multiple Linear workspaces, create separate MCP entries and map each secret to `LINEAR_API_TOKEN`:

```json
{
  "mcpServers": {
    "linear-personal": {
      "command": "npx",
      "args": ["-y", "@primeradianthq/streamlinear@1.1.1"],
      "env": {
        "LINEAR_API_TOKEN": "${LINEAR_PERSONAL_TOKEN}"
      },
      "envFrom": ["LINEAR_PERSONAL_TOKEN"]
    },
    "linear-work": {
      "command": "npx",
      "args": ["-y", "@primeradianthq/streamlinear@1.1.1"],
      "env": {
        "LINEAR_API_TOKEN": "${LINEAR_WORK_TOKEN}"
      },
      "envFrom": ["LINEAR_WORK_TOKEN"]
    }
  }
}
```

### Installed Package

When installed as a dependency, the package provides two binaries:

```bash
npm install @primeradianthq/streamlinear@1.1.1
npx streamlinear-cli help
npx streamlinear
```

The MCP server requires `LINEAR_API_TOKEN` at runtime. Consumers such as Scribble may expose their own operator-facing variable and map it to `LINEAR_API_TOKEN` before starting streamlinear.
````

- [ ] **Step 3: Remove obsolete GitHub source install references**

Run:

```bash
rg "github:obra|obra/streamlinear|github.com/obra" README.md package.json .claude-plugin
```

Expected: no output.

- [ ] **Step 4: Add security policy**

Create `SECURITY.md`:

```markdown
# Security Policy

## Supported Versions

Prime Radiant supports the current `1.1.x` release line.

## Reporting A Vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability reporting for this repository. If private reporting is unavailable, contact a Prime Radiant maintainer through an existing private project channel before filing a public issue.

Do not include Linear API tokens, customer data, or private workspace details in public issues.
```

- [ ] **Step 5: Add contributing guide**

Create `CONTRIBUTING.md`:

````markdown
# Contributing

## Setup

Install root and MCP dependencies separately:

```bash
npm ci
npm --prefix mcp ci
```

## Checks

Run the full local gate before opening a pull request:

```bash
npm run check
```

This builds `mcp/dist/index.js` and `mcp/dist/cli.js`, runs TypeScript validation, runs smoke tests, checks package metadata, records production audit visibility, and verifies the packed tarball in a temporary consumer.

## Developer Hooks

Hooks are optional clone-only conveniences:

```bash
npm run hooks:install
```

The hook runs checks for package, MCP source, test, script, and workflow changes. It does not install during npm package consumption and does not stage generated files.

## Release

The npm package is published from `v*.*.*` tags. Before tagging, run:

```bash
npm ci
npm --prefix mcp ci
npm run check
npm view @primeradianthq/streamlinear@1.1.1 version
```

The `npm view` command should fail before the first `1.1.1` publish.
````

- [ ] **Step 6: Add changelog**

Create `CHANGELOG.md`:

```markdown
# Changelog

## 1.1.1 - 2026-05-08

- Moved npm package identity to `@primeradianthq/streamlinear`.
- Added public npm package metadata and a runtime-only package allowlist.
- Added deterministic build, typecheck, test, package verification, audit visibility, and CI/release workflows.
- Preserved the `streamlinear` MCP server binary and `streamlinear-cli` human CLI binary.
- Kept Claude plugin metadata in the repository while excluding plugin files from the npm tarball.
```

- [ ] **Step 7: Verify docs are included or excluded correctly**

Run:

```bash
npm run package:check
npm run pack:verify
```

Expected:

```text
package metadata is npm-grade
verified primeradianthq-streamlinear-1.1.1.tgz
```

- [ ] **Step 8: Commit docs**

```bash
git add README.md LICENSE SECURITY.md CONTRIBUTING.md CHANGELOG.md
git commit --no-verify -m "docs: document streamlinear npm package"
```

## Task 5: Audit Follow-Up And Release Evidence

**Files:**
- Create: `docs/release/streamlinear-1.1.1-audit.md`

- [ ] **Step 1: Confirm the bug/secops fast-follow Linear ticket**

Use existing Prime Radiant issue `PRI-1538`:

```text
Track streamlinear runtime bugs and secops fast-follow after npm publish
```

Use this description:

```markdown
streamlinear is being published to npm first so Scribble can remove the temporary source bridge. This issue tracks the known runtime and secops follow-up work that should happen immediately after package publication.

Scope:
- mcp dependency audit cleanup
- CLI auth flag leakage into search filters
- structured search filter construction
- MCP startup auth/API error shaping
- CLI/MCP validation drift
- ignored labels schema field
- plugin --token-cmd permission and documentation boundary
- plugin metadata action-count drift

This is intentionally separate from PRI-1537 so npm publication can unblock PRI-1530.
```

- [ ] **Step 2: Generate audit visibility evidence**

Run the summary command with the follow-up issue ID:

```bash
STREAMLINEAR_AUDIT_FOLLOWUP=PRI-1538 npm run audit:summary
```

Expected:

```text
root: total=0 critical=0 high=0 moderate=0 low=0
mcp: total=6 critical=0 high=4 moderate=2 low=0
wrote docs/release/streamlinear-1.1.1-audit.md
```

Then open `docs/release/streamlinear-1.1.1-audit.md` and verify it contains `PRI-1538`.

- [ ] **Step 3: Run the full check gate**

Run:

```bash
npm run check
```

Expected:

```text
verified primeradianthq-streamlinear-1.1.1.tgz
```

The command exits 0.

- [ ] **Step 4: Commit release evidence**

```bash
git add docs/release/streamlinear-1.1.1-audit.md
git commit --no-verify -m "docs: record streamlinear audit follow-up"
```

## Task 6: Final Publish Preparation

**Files:**
- No source files unless verification reveals an implementation mistake in prior tasks.

- [ ] **Step 1: Confirm intended working tree**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing caller changes remain, or a clean tree if those were resolved outside this plan. Do not publish with uncommitted implementation changes.

- [ ] **Step 2: Confirm package version is absent from npm**

Run:

```bash
npm view @primeradianthq/streamlinear@1.1.1 version
```

Expected: npm reports the package version is not found. If it returns `1.1.1`, stop because this version has already been published.

- [ ] **Step 3: Build and verify from a fresh install state**

Run:

```bash
npm ci
npm --prefix mcp ci
npm run check
```

Expected: all commands exit 0.

- [ ] **Step 4: Run optional live Linear smoke if a token is explicitly available**

If `LINEAR_API_TOKEN` is set in the shell for this release run, verify the MCP server can complete startup and the shared Linear search path can execute. If no token is set, skip this step and note that the live smoke was not run.

Run:

```bash
if [ -z "${LINEAR_API_TOKEN:-}" ]; then
  echo "LINEAR_API_TOKEN is not set; skipping live Linear smoke"
else
node - <<'NODE'
const { spawn } = require("node:child_process");

const child = spawn(process.execPath, ["mcp/dist/index.js"], {
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

setTimeout(() => {
  if (child.exitCode !== null) {
    console.error(stderr);
    process.exit(1);
  }

  child.kill("SIGTERM");
  console.log("MCP server stayed up with LINEAR_API_TOKEN");
}, 3000);
NODE

node mcp/dist/cli.js search
fi
```

Expected with a token:

```text
MCP server stayed up with LINEAR_API_TOKEN
```

The `streamlinear-cli search` command exits 0 and prints either issue rows or `No issues found.`.

- [ ] **Step 5: Create the release tag on the final release commit**

Run:

```bash
git tag v1.1.1
npm run release:verify-tag
```

Expected:

```text
release tag v1.1.1 matches package version 1.1.1
```

- [ ] **Step 6: Push the release commit and tag**

Run:

```bash
git push origin HEAD
git push origin v1.1.1
```

Expected: GitHub Actions CI and Release start. The release workflow publishes `@primeradianthq/streamlinear@1.1.1`.

- [ ] **Step 7: Verify npm after publish**

Run:

```bash
npm view @primeradianthq/streamlinear version dist-tags --json
```

Expected:

```json
{
  "version": "1.1.1",
  "dist-tags": {
    "latest": "1.1.1"
  }
}
```

- [ ] **Step 8: Publish handoff for PRI-1530**

Add a comment to `PRI-1537` with:

```markdown
Published `@primeradianthq/streamlinear@1.1.1`.

Scribble handoff for PRI-1530:
- Add `@primeradianthq/streamlinear@1.1.1` to Scribble package metadata and lockfile.
- Keep mapping Scribble's `LINEAR_API_KEY` to streamlinear's `LINEAR_API_TOKEN`.
- Replace the Docker BuildKit streamlinear source context with either the package bin or a copy of `node_modules/@primeradianthq/streamlinear/mcp/dist/index.js`.
- Remove `docs/bridge-refs.json`, `npm run check:bridge`, the Compose streamlinear context, and the sen-deploy `streamlinear_ref` path after Scribble verifies the packaged entrypoint.

Bug/secops follow-up is tracked in the linked fast-follow issue.
```

## Final Verification Gate

Before calling the implementation complete, run:

```bash
git status --short
npm ci
npm --prefix mcp ci
npm run check
npm view @primeradianthq/streamlinear@1.1.1 version
```

Expected before publish: the final `npm view` command reports not found.

Expected after publish:

```bash
npm view @primeradianthq/streamlinear version dist-tags --json
```

returns `1.1.1` for both `version` and the `latest` dist-tag.
