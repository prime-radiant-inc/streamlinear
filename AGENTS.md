# AGENTS.md

These instructions apply to this repository.

## Project

streamlinear publishes `@primeradianthq/streamlinear`, a small Linear MCP/CLI
package for Claude Code and other MCP consumers.

The package exposes:

- `streamlinear`: stdio MCP server, backed by `mcp/dist/index.js`.
- `streamlinear-cli`: local command-line interface, backed by `mcp/dist/cli.js`.

Source lives under `mcp/src`. The shared behavior is in
`mcp/src/linear-core.ts`; keep the MCP server and CLI entry points thin.

## Setup

Install both dependency trees before verification:

```bash
npm ci
npm --prefix mcp ci
```

## Verification

Use the smallest relevant check while developing, and run the full gate before
claiming release readiness.

```bash
npm run build
npm run typecheck
npm run test
npm run dist:check
npm run package:check
npm run pack:verify
npm run check
```

`npm run check` is the full local release gate. It builds, typechecks, tests,
checks committed dist artifacts, validates package metadata, runs production
dependency audits, and verifies the packed tarball in a temp consumer.

## Build Artifacts

`mcp/dist/index.js` and `mcp/dist/cli.js` are committed on purpose because npm
executes those files directly. Do not hand-edit dist. If `mcp/src/**` changes,
run `npm run build` and commit any resulting dist changes.

## Package Boundary

The npm package surface is the root `package.json` `files` allowlist. Keep
repo-only agent/plugin/development files out of npm unless Drew explicitly asks
to publish them.

Currently clone/dev-only:

- `AGENTS.md`
- `CLAUDE.md`
- `.claude-plugin/**`
- `.github/**`
- `scripts/**`
- `mcp/src/**`
- `mcp/test/**`

Do not add npm lifecycle hooks such as `prepare`, `postinstall`, or
`prepublishOnly`. Consumers should not need a build step during install.

## Development Hooks

Optional clone hooks use Lefthook and are installed explicitly with:

```bash
npm run hooks:install
```

Keep hooks clone/dev-only. They should check or rebuild local artifacts for
contributors; they should not mutate package consumers.

## Release

The intended package is `@primeradianthq/streamlinear`. The unscoped
`streamlinear` package on npm is not the target for this repo.

Release tags are `vX.Y.Z` and must match `package.json`. The GitHub release
workflow verifies the tag, runs `npm run check`, then publishes with provenance.
If npm auth is not configured for GitHub yet, the first scoped publish may need
to be done manually by a logged-in npm user.

## Scope Guardrails

Keep publication/tooling changes separate from runtime bug fixes and security
hardening unless Drew expands the scope. The follow-up bug/secops ticket should
own behavioral hardening.
