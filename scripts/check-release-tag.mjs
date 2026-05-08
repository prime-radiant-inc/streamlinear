import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const expectedTag = `v${packageJson.version}`;

function currentRefName() {
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }

  const result = spawnSync("git", ["describe", "--tags", "--exact-match"], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `release verification must run on ${expectedTag}; no exact git tag found and GITHUB_REF_NAME is unset`,
    );
  }

  return result.stdout.trim();
}

const actualTag = currentRefName();
assert.equal(actualTag, expectedTag, `release tag must match package version`);

console.log(`release tag ${actualTag} matches package version`);
