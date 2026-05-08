# Streamlinear npm-grade package design

## Context

`streamlinear` is already public open source software. It previously lived under
Jesse Vincent's personal GitHub account and has now moved into Prime Radiant
ownership. This work is not about opening a private repository. It is about
making the moved project a normal, repeatable npm package that Scribble and
future consumers can depend on.

Scribble currently consumes streamlinear through a temporary Docker BuildKit
source bridge. Its Dockerfile builds the sibling checkout's MCP source, copies
the built MCP server to `/app/lib/streamlinear-mcp.js`, and configures the
`linear` MCP server at runtime only when `LINEAR_API_KEY` is set. Scribble maps
that operator-facing key to streamlinear's `LINEAR_API_TOKEN` environment
contract.

`PRI-1537` should publish `@primeradianthq/streamlinear@1.1.1` so `PRI-1530`
can remove the Scribble and sen-deploy source bridge. Runtime bugs and secops
hardening are intentionally deferred to a follow-up ticket after the package
path is established.

## Goals

- Publish `@primeradianthq/streamlinear@1.1.1` as a public npm package.
- Make npm consumption normal: no GitHub source checkout, no TypeScript build
  step, no git hooks, no lifecycle surprises.
- Preserve the two user-facing binaries:
  - `streamlinear`: MCP stdio server.
  - `streamlinear-cli`: human CLI.
- Migrate repo metadata, docs, and plugin metadata from `obra/streamlinear` to
  Prime Radiant ownership.
- Provide deterministic local and CI checks for build, typecheck, test, audit
  visibility, packed artifact contents, binary smoke, and generated dist drift.
- Verify the packed artifact from a temp consumer before publishing.
- Create or update the fast-follow bug/secops ticket before publishing, so the
  known dependency/runtime hardening work is tracked while Scribble bridge
  removal proceeds.

## Non-goals

- Do not redesign streamlinear's MCP action model.
- Do not change Scribble's Linear optionality.
- Do not make Linear required for Scribble or future consumers.
- Do not solve runtime/API bugs or secops hardening in this design. Track those
  as fast-follow work.
- Do not publish the unscoped `streamlinear` package for Prime Radiant's release
  path.
- Do not create a plugin marketplace/package release in this ticket.

## Package surface

The published package should be a runtime package, not a source checkout in
tarball form.

The root package becomes `@primeradianthq/streamlinear` at version `1.1.1`.
It declares public scoped publishing, Prime Radiant repository metadata, Node
engine support, and the two stable bins:

- `streamlinear` points at the built MCP stdio entrypoint.
- `streamlinear-cli` points at the built CLI entrypoint.

The npm artifact should be enforced with a root `files` allowlist in
`package.json`. Do not rely on `.npmignore` or a clean worktree as the only
package-surface guard.

The allowlist and `pack:verify` expected-path list should include only
intentional runtime and public package files:

- root `package.json`
- `README.md`
- `LICENSE`
- changelog/release docs, if added
- `SECURITY.md`
- `CONTRIBUTING.md`
- `mcp/dist/index.js`
- `mcp/dist/cli.js`
- `mcp/package.json`, or another explicit ESM metadata mechanism required for
  Node to run the bundled `.js` output correctly

The npm artifact should exclude:

- local agent files such as `CLAUDE.md`
- TypeScript source unless deliberately added later
- test files
- local build config unless needed at runtime
- `.claude-plugin/**`

The repository should still keep and migrate `.claude-plugin/**` metadata to
Prime Radiant ownership. It is part of the project, but it is not needed by
Scribble's Docker path and should not complicate the first npm tarball.

For `PRI-1537`, npm is the only release artifact. The npm package is a runtime
package, not a Claude plugin distribution.

For `1.1.x`, direct Node execution remains part of the package contract. Both
of these should work from an installed package:

- `node node_modules/@primeradianthq/streamlinear/mcp/dist/index.js`
- `node_modules/.bin/streamlinear`

## Tooling and release shape

The repo should get a boring, repeatable release path.

Root scripts should expose:

- `build`: deterministic build of MCP and CLI dist files.
- `typecheck`: TypeScript validation with `tsc --noEmit`.
- `test`: a real test command.
- `check`: full local quality gate.
- `pack:verify`: verifies the npm artifact contents and binary behavior.
- `hooks:install`: optional maintainer-only hook setup, if hooks remain useful.

Consumer-facing lifecycle scripts should not install git hooks. The current
`prepare: simple-git-hooks` behavior should be removed or replaced so npm
install, pack, and publish do not mutate `.git/hooks`.

Development hooks should move to a normal clone-only tool such as lefthook, or
an equivalent explicit hook runner, with path-scoped behavior. A docs-only
change should not rebuild or stage generated dist files. Hooks that rebuild
`mcp/dist/*` should run only when relevant source or build files change, and
they should remain developer convenience checks rather than npm lifecycle
behavior. Hooks must be check-only and must not run `git add`.

If hook tooling remains, it should be installed only by an explicit maintainer
command such as `npm run hooks:install`. Relevant staged paths should include
only package/build surfaces such as `mcp/src/**`, `mcp/package*.json`,
`mcp/tsconfig.json`, root package metadata, build scripts, and hook config.

No project script should run `npm install` or `npm ci`. CI and release perform
deterministic installs explicitly, such as root `npm ci` and
`npm --prefix mcp ci` if `mcp/` remains nested. Build scripts should only build
with dependencies that are already installed.

CI should run on pull requests and `main`. It should cover Node 20 and Node 24:
Node 20 because streamlinear currently builds for that target, and Node 24
because Scribble's Docker runtime is Node 24.

The release workflow should be tag-driven and similar to bot-toolkit:

- Trigger on `v*.*.*` tags.
- Install deterministically.
- Run the full check gate.
- Verify the tag matches `package.json` version.
- Publish with `npm publish --access public`, using provenance if configured.

`--ignore-scripts` is useful for pre-change inspection, but final `pack:verify`
and release verification should run the real publish lifecycle after
`prepare` has been removed or replaced. The final gate should prove there are
no package lifecycle side effects, not merely skip them.

## Version and tag sync

`v1.1.0` already exists and should not be moved or reused. The first Prime
Radiant scoped npm release is `1.1.1`.

The release commit should synchronize:

- root `package.json` and `package-lock.json`
- nested `mcp/package.json` and `mcp/package-lock.json`, if the nested package
  remains
- MCP server version
- `.claude-plugin/plugin.json`, as repo metadata only
- README, changelog, and release docs

Before tagging, verify `npm view @primeradianthq/streamlinear@1.1.1` is absent.
Create `v1.1.1` only on the final release commit.

## Scribble consumer contract

`PRI-1537` should guarantee the package contract that `PRI-1530` needs:

- `npm install @primeradianthq/streamlinear@1.1.1` works without GitHub source
  access.
- The packed package includes a runnable MCP server equivalent to current
  `mcp/dist/index.js`.
- `streamlinear` starts the MCP stdio server.
- `streamlinear-cli help` runs from a temp consumer.
- Direct `node node_modules/@primeradianthq/streamlinear/mcp/dist/index.js`
  execution works from a temp consumer.
- Runtime auth remains `LINEAR_API_TOKEN`.
- Scribble can continue mapping `LINEAR_API_KEY` to `LINEAR_API_TOKEN`.
- Consumers do not need to build TypeScript.
- Consumers do not need git or a source checkout.
- Consumers do not get git hook lifecycle side effects.

After this publish, `PRI-1530` can add `@primeradianthq/streamlinear` to
Scribble, stop passing a `streamlinear` BuildKit context, and copy or invoke the
packaged MCP entrypoint while preserving `/app/lib/streamlinear-mcp.js` as the
Docker-internal path if that keeps the Scribble change smaller.

Expected `PRI-1530` handoff:

- Add `@primeradianthq/streamlinear` to Scribble package metadata and lockfile.
- Choose either copying the packaged MCP entrypoint to
  `/app/lib/streamlinear-mcp.js` or invoking the package bin directly.
- Remove the Docker BuildKit `streamlinear` named context and streamlinear
  builder stage.
- Remove the Compose bridge context.
- Remove or retire `docs/bridge-refs.json` and `npm run check:bridge`.
- Update README, AGENTS, CLAUDE, CONTRIBUTING, and deploy docs that mention the
  temporary source bridge.
- Remove `sen-deploy`'s Scribble `streamlinear_ref` input and checkout path.

## Verification

The implementation is ready to publish when these pass:

- clean intended worktree, with no accidental local helper files in the package
- root deterministic install
- nested MCP deterministic install if the nested package remains
- build
- typecheck
- real tests
- root production audit visibility via an `audit:prod` script or equivalent
- nested MCP production audit visibility via an `audit:prod:mcp` script or
  equivalent; because dependencies are bundled into dist, this is the
  authoritative audit surface until the bundling model changes
- generated audit summary and fast-follow bug/secops ticket ID
- `npm pack --json` inspection with package lifecycle scripts enabled after
  lifecycle side effects have been removed
- `pack:verify` artifact inspection
- exact expected packed-file list check
- dist drift check after build
- dist first-line shebang checks
- executable git mode checks for both bin targets
- temp consumer install of the packed tarball
- temp consumer smoke of `streamlinear-cli help` without a token
- temp consumer smoke of `streamlinear` without `LINEAR_API_TOKEN`, expecting a
  deterministic nonzero exit and documented stderr
- optional live Linear MCP startup/search smoke gated on an explicit
  `LINEAR_API_TOKEN`, non-blocking for public CI
- `npm view @primeradianthq/streamlinear version dist-tags --json` after publish

## Follow-up ticket

Create or update a follow-up bug/secops ticket for:

- `mcp` dependency audit cleanup
- CLI auth flag leakage into search filters
- structured search filter construction
- MCP startup auth/API error shaping
- CLI/MCP validation drift
- ignored `labels` schema field
- plugin `--token-cmd` permission and documentation boundary
- plugin metadata action-count drift

These issues matter, but they should not prevent designing the normal npm
package and release path first.
