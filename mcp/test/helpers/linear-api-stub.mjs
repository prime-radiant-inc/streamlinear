// Stub for the Linear GraphQL API, used by the test suite. It is loaded into
// spawned server/CLI processes via `node --import` so their `fetch` calls are
// answered locally with canned responses. Every request is appended as a JSON
// line to the file named by LINEAR_STUB_LOG so tests can assert on the exact
// mutations the server sent.

import { appendFileSync } from "node:fs";

const logFile = process.env.LINEAR_STUB_LOG;

const TEAMS = [
  {
    id: "team-dev",
    key: "DEV",
    name: "Development",
    states: {
      nodes: [
        { id: "state-todo", name: "Todo", type: "started" },
        { id: "state-done", name: "Done", type: "completed" },
      ],
    },
  },
];

const USERS = [
  {
    id: "user-ada",
    email: "ada@example.com",
    name: "Ada Lovelace",
    url: "https://linear.app/test/profiles/ada",
  },
  {
    id: "user-viewer",
    email: "viewer@example.com",
    name: "Viewer",
    url: "https://linear.app/test/profiles/viewer",
  },
  {
    id: "user-chris-a",
    email: "chris.a@example.com",
    name: "Chris A",
    url: "https://linear.app/test/profiles/chris-a",
  },
  {
    id: "user-chris-b",
    email: "chris.b@example.com",
    name: "Chris B",
    url: "https://linear.app/test/profiles/chris-b",
  },
];

const LABELS = [
  { id: "label-bug", name: "bug" },
  { id: "label-urgent", name: "urgent" },
  { id: "label-docs", name: "docs" },
];

const labelsById = new Map(LABELS.map((label) => [label.id, label]));

function labelNodes(labelIds) {
  return (labelIds || []).map((id) => labelsById.get(id)).filter(Boolean);
}

function respond(body) {
  return { ok: true, status: 200, json: async () => body };
}

globalThis.fetch = async (_url, init) => {
  const { query = "", variables = {} } = JSON.parse(init.body);

  if (logFile) {
    appendFileSync(logFile, `${JSON.stringify({ query, variables })}\n`);
  }

  if (query.includes("viewer {")) {
    return respond({
      data: {
        viewer: { id: "user-viewer", name: "Viewer", email: "viewer@example.com" },
      },
    });
  }

  if (query.includes("teams {")) {
    return respond({ data: { teams: { nodes: TEAMS } } });
  }

  if (query.includes("users")) {
    return respond({ data: { users: { nodes: USERS } } });
  }

  if (query.includes("searchIssues")) {
    return respond({ data: { searchIssues: { nodes: [] } } });
  }

  if (query.includes("issueLabels")) {
    return respond({ data: { issueLabels: { nodes: LABELS } } });
  }

  if (query.includes("issueCreate")) {
    const input = variables.input || {};
    return respond({
      data: {
        issueCreate: {
          success: true,
          issue: {
            identifier: "DEV-1",
            title: input.title || "Untitled",
            url: "https://linear.app/test/issue/DEV-1",
          },
        },
      },
    });
  }

  if (query.includes("issueUpdate")) {
    const input = variables.input || {};
    return respond({
      data: {
        issueUpdate: {
          success: true,
          issue: {
            identifier: "DEV-1",
            title: "Updated issue",
            state: { name: "Done" },
            priority: 2,
            assignee: { name: "Ada Lovelace" },
            labels: { nodes: labelNodes(input.labelIds) },
          },
        },
      },
    });
  }

  if (query.includes("commentCreate")) {
    return respond({ data: { commentCreate: { success: true } } });
  }

  if (query.includes("issue(")) {
    return respond({
      data: {
        issue: {
          id: variables.id,
          identifier: "DEV-1",
          title: "Test issue",
          description: "A test issue",
          state: { name: "Todo" },
          priority: 2,
          assignee: { name: "Ada Lovelace", email: "ada@example.com" },
          labels: { nodes: [{ name: "bug" }] },
          dueDate: null,
          url: "https://linear.app/test/issue/DEV-1",
          team: { id: "team-dev", key: "DEV", name: "Development" },
          comments: {
            nodes: [
              { body: "First comment", createdAt: "2026-10-29T00:00:00Z", user: { name: "Ada" } },
            ],
          },
        },
      },
    });
  }

  return respond({ errors: [{ message: `linear-api-stub: unrecognized query: ${query}` }] });
};
