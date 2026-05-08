# Changelog

## 1.1.2 - 2026-05-08

- Reissued the npm package through the GitHub release workflow so npm can record
  provenance for the published artifact.
- Added repository-local `AGENTS.md` and `CLAUDE.md` guidance for future
  agent-assisted release and package maintenance work.

## 1.1.1 - 2026-05-08

- Moved npm package identity to `@primeradianthq/streamlinear`.
- Added public npm package metadata and a runtime-only package allowlist.
- Added deterministic build, typecheck, test, package verification, audit visibility, and CI/release workflows.
- Preserved the `streamlinear` MCP server binary and `streamlinear-cli` human CLI binary.
- Kept Claude plugin metadata in the repository while excluding plugin files from the npm tarball.
