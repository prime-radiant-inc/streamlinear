# streamlinear

> A lightweight Linear MCP server for Claude Code that exposes one tool with action dispatch using ~500 tokens instead of the standard MCP's ~17,000.

**Family:** agent-libs · **Type:** tool · **Lifecycle:** production · **Owner:** obra

## What it does
streamlinear is a Model Context Protocol server for Claude Code that wraps the Linear API. Rather than 23 separate tools, it exposes a single tool with action dispatch (search, get, update, comment, create, graphql, help), cutting tool-definition token cost from ~17,000 to ~500. It is published to npm as `@primeradianthq/streamlinear` and run via `npx`.

## How it fits
- Depends on: — (no internal prime-radiant-inc deps in package.json)
- Used by: — (consumed by Claude Code / any MCP client via `.mcp.json`)
- External: Linear API (GraphQL, `LINEAR_API_TOKEN`); npm registry (distribution)

## Runtime & data
- Runs: MCP server (stdio) launched via `npx @primeradianthq/streamlinear`
- Data in: MCP tool calls, `LINEAR_API_TOKEN`
- Data out: Linear issue data, mutations (state/priority/assignee/comments/create)

<!-- Maintained by the maintaining-project-map skill. Do not hand-edit; regenerated. -->
