import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function assertNoInstallLifecycleScripts(packageName, scripts = {}) {
  const forbiddenLifecycle = ["prepare", "prepublish", "prepublishOnly", "postinstall"];

  for (const scriptName of forbiddenLifecycle) {
    assert.equal(
      scripts[scriptName],
      undefined,
      `${packageName} must not define ${scriptName}`,
    );
  }

  for (const [scriptName, command] of Object.entries(scripts)) {
    assert.doesNotMatch(
      command,
      /(^|&&|\|\||;|\s)npm\s+(install|ci)(\s|$)/,
      `${packageName} script ${scriptName} must not run npm install or npm ci`,
    );
  }
}

const rootPackage = readJson("package.json");
const mcpPackage = readJson("mcp/package.json");
const plugin = readJson(".claude-plugin/plugin.json");

assert.equal(rootPackage.name, "@primeradianthq/streamlinear");
assert.equal(rootPackage.version, "1.1.2");
assert.equal(rootPackage.publishConfig?.access, "public");
assert.deepEqual(rootPackage.bin, {
  streamlinear: "mcp/dist/index.js",
  "streamlinear-cli": "mcp/dist/cli.js",
});
assert.deepEqual(rootPackage.files, [
  "mcp/dist/index.js",
  "mcp/dist/cli.js",
  "mcp/package.json",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
]);

assertNoInstallLifecycleScripts("root package", rootPackage.scripts);
assertNoInstallLifecycleScripts("mcp package", mcpPackage.scripts);

assert.equal(mcpPackage.version, rootPackage.version);
assert.equal(mcpPackage.type, "module");

assert.equal(plugin.version, rootPackage.version);
assert.equal(plugin.repository, "https://github.com/primeradianthq/streamlinear");

console.log("package metadata is npm-grade");
