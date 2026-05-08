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
