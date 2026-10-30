# Changelog

## 1.2.1 - 2026-10-30

- Added labels, state, and assignee options to streamlinear-cli's create and
  update commands, matching the MCP tool: assignee accepts an email, me, or
  a user UUID; labels are comma-separated; an empty --labels value clears
  all labels on update.
- Made the search assignee filter accept UUIDs, so assignee means the same
  thing across every action.
- Fixed a crash in the CLI's create and update when no --labels flag was
  passed.
- Fixed npm run build on Windows by building through a Node script that
  calls esbuild's API, with no shell argument quoting.

## 1.2.0 - 2026-10-30

- Wired the labels parameter into create and update: label names resolve
  against the workspace label list, an empty list clears labels on update,
  and unknown labels return an error listing the available options.
- Honored state and assignee on create, and UUID assignees on update (#5, #6).
- Added post-only mode: setting STREAMLINEAR_POST_ONLY disables search, get,
  and graphql so agents can create and update issues without ever reading
  issue content (#11).
- Converted @name mentions in create descriptions and comment bodies into
  Linear profile links when they match exactly one workspace user (#1).
- Refreshed dependencies across the board, including zod 4 and
  @modelcontextprotocol/sdk 1.32, clearing every open Dependabot security
  advisory in the process.
- Added an end-to-end test suite that drives the built MCP server over stdio
  against a stubbed Linear API, covering create, update, get, labels,
  post-only mode, and mention conversion through the real tool surface.

## 1.1.3 - 2026-05-08

- Reissued the npm package from the corrected OIDC trusted-publishing workflow
  so npm can publish provenance from the tag build.

## 1.1.2 - 2026-05-08

- Reissued the npm package through the GitHub release workflow so npm can record
  provenance for the published artifact.
- Switched the release workflow to npm trusted publishing via GitHub OIDC and
  corrected package repository metadata to match the GitHub repo.
- Added repository-local `AGENTS.md` and `CLAUDE.md` guidance for future
  agent-assisted release and package maintenance work.

## 1.1.1 - 2026-05-08

- Moved npm package identity to `@primeradianthq/streamlinear`.
- Added public npm package metadata and a runtime-only package allowlist.
- Added deterministic build, typecheck, test, package verification, audit visibility, and CI/release workflows.
- Preserved the `streamlinear` MCP server binary and `streamlinear-cli` human CLI binary.
- Kept Claude plugin metadata in the repository while excluding plugin files from the npm tarball.
