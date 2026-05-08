# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## What This Is

streamlinear is a lightweight Linear integration published as the npm package
`@primeradianthq/streamlinear`.

It ships two runtime binaries from one TypeScript codebase:

- `streamlinear`: the stdio MCP server at `mcp/dist/index.js`.
- `streamlinear-cli`: the local CLI at `mcp/dist/cli.js`.

The repo also contains `.claude-plugin/` for clone-based Claude Code plugin
usage. That plugin surface is intentionally repo-only and is not included in
the npm package.

Most behavior lives in `mcp/src/linear-core.ts`. The MCP server and CLI should
stay thin shells over that shared module.

## Setup

Install dependencies in both workspaces:

```bash
npm ci
npm --prefix mcp ci
```

## Common Commands

Run commands from the repository root unless noted otherwise.

```bash
npm run build          # bundle mcp/dist/index.js and mcp/dist/cli.js
npm run typecheck      # TypeScript check for mcp/src
npm run test           # node:test coverage under mcp/test
npm run dist:check     # verify committed dist artifacts match source
npm run package:check  # verify npm metadata and release invariants
npm run pack:verify    # pack and install into a temp consumer
npm run check          # full local release gate
npm start --prefix mcp # run the MCP server over stdio
```

To exercise the CLI locally:

```bash
LINEAR_API_TOKEN=lin_api_xxx node mcp/dist/cli.js search
node mcp/dist/cli.js --token-cmd "op read 'op://vault/linear/token'" get ABC-123
```

## Build Artifacts

`mcp/dist/index.js` and `mcp/dist/cli.js` are checked into git because they are
the files npm executes. Do not hand-edit them. If you change `mcp/src/**`, run
`npm run build` and commit any matching `mcp/dist/**` changes.

Both dist files need a `#!/usr/bin/env node` shebang. The `mcp/package.json`
esbuild commands add it with `--banner:js`.

## Package Boundary

The npm package is intentionally small. The root `package.json` `files`
allowlist controls the published surface:

- `mcp/dist/index.js`
- `mcp/dist/cli.js`
- `mcp/package.json`
- `README.md`
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

`CLAUDE.md`, `AGENTS.md`, `.claude-plugin/**`, GitHub workflows, scripts, tests,
and source files are clone/dev-only unless the allowlist is changed on purpose.

Avoid adding npm lifecycle hooks such as `prepare`, `postinstall`, or
`prepublishOnly`. Consumers should be able to install the package without
running a local build. Clone-time hooks are optional and should stay behind
explicit commands such as `npm run hooks:install`.

## Architecture Notes

`mcp/src/linear-core.ts` owns:

- The Linear GraphQL helper and runtime token handling.
- Lazy caches for the authenticated viewer and teams.
- Resolution helpers for issue IDs, team names, workflow state names, and
  assignees.
- Action handlers for `search`, `get`, `update`, `comment`, `create`,
  `graphql`, and `help`.
- The Zod `LinearParams` schema and `dispatchAction(params)` dispatcher.
- `buildToolDescription()`, which fetches teams/states at MCP startup so the
  model sees valid options in the tool description.

When adding an action, update the schema, dispatcher, handler, `handleHelp()`,
CLI argument routing, tests, and `buildToolDescription()` together.

Handlers should return useful strings for user-recoverable failures, especially
unknown teams or workflow states. Throw only for unrecoverable setup/API errors
that the MCP and CLI entry points should surface as command failures.

The `graphql` action is the deliberate escape valve for Linear capabilities not
covered by the typed actions. Prefer using it before growing the typed surface.

## Runtime Contract

The MCP server requires `LINEAR_API_TOKEN` at runtime. Product consumers can
expose their own operator-facing variable names, but they should map those
values to `LINEAR_API_TOKEN` before starting streamlinear.

The CLI token precedence is:

1. `--token`
2. `--token-cmd`
3. `LINEAR_API_TOKEN`

## Release Notes

Release tags are `vX.Y.Z` and must match the package version. The release
workflow runs `npm run release:verify-tag`, `npm run check`, then
`npm publish --access public --provenance`.

The first scoped npm publish may still need to happen manually with a human
logged into npm. After that, prefer the GitHub release workflow once npm auth is
configured.

Runtime bugs and security hardening belong in the follow-up ticket, not in the
npm publication plumbing, unless Drew explicitly expands the release scope.
