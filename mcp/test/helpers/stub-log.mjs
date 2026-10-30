import { readFileSync } from "node:fs";

// Read the JSON-lines request log written by linear-api-stub.mjs (one
// { query, variables } line per request the spawned process made).
export function readStubLog(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
