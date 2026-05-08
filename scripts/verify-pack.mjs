import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoot = mkdtempSync(resolve(tmpdir(), "streamlinear-pack-"));
const packDestination = resolve(tempRoot, "pack");
const consumer = resolve(tempRoot, "consumer");

const expectedFiles = [
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "mcp/dist/cli.js",
  "mcp/dist/index.js",
  "mcp/package.json",
  "package.json",
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: {
      ...process.env,
      LINEAR_API_TOKEN: "",
      ...(options.env ?? {}),
    },
  });

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return result;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

mkdirSync(packDestination, { recursive: true });
mkdirSync(consumer, { recursive: true });

const packResult = run("npm", ["pack", "--json", "--pack-destination", packDestination]);
const [pack] = JSON.parse(packResult.stdout);
assert.ok(pack, "npm pack must return package metadata");

const packedFiles = pack.files.map((file) => file.path).sort();
const sortedExpectedFiles = [...expectedFiles].sort();
const missingFiles = sortedExpectedFiles.filter((file) => !packedFiles.includes(file));
const unexpectedFiles = packedFiles.filter((file) => !sortedExpectedFiles.includes(file));
assert.deepEqual(
  packedFiles,
  sortedExpectedFiles,
  `packed files must match release allowlist; missing=${missingFiles.join(",") || "none"} unexpected=${unexpectedFiles.join(",") || "none"}`,
);

const tarball = resolve(packDestination, pack.filename);
writeFileSync(resolve(consumer, "package.json"), '{"private":true,"type":"module"}\n');
run("npm", ["install", tarball], { cwd: consumer });

const installedRoot = resolve(consumer, "node_modules/@primeradianthq/streamlinear");
const installedPackage = readJson(resolve(installedRoot, "package.json"));
const installedMcpPackage = readJson(resolve(installedRoot, "mcp/package.json"));

assert.deepEqual(installedPackage.bin, {
  streamlinear: "mcp/dist/index.js",
  "streamlinear-cli": "mcp/dist/cli.js",
});
assert.equal(installedMcpPackage.type, "module");

const cliResult = run(resolve(consumer, "node_modules/.bin/streamlinear-cli"), ["help"], {
  cwd: consumer,
});
assert.match(cliResult.stdout, /USAGE:/);
assert.match(cliResult.stdout, /streamlinear-cli search/);

const binServerResult = run(resolve(consumer, "node_modules/.bin/streamlinear"), [], {
  cwd: consumer,
  allowFailure: true,
});
assert.notEqual(binServerResult.status, 0);
assert.match(binServerResult.stderr, /LINEAR_API_TOKEN environment variable is required/);

const directServerResult = run(
  process.execPath,
  [resolve(installedRoot, "mcp/dist/index.js")],
  { cwd: consumer, allowFailure: true },
);
assert.notEqual(directServerResult.status, 0);
assert.match(directServerResult.stderr, /LINEAR_API_TOKEN environment variable is required/);

console.log(`verified ${basename(tarball)}`);
