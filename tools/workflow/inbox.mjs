#!/usr/bin/env node
// Owner inbox: everything waiting on the owner, in the order to handle it.
// Uses the GitHub REST API through `gh api` so it also works where GraphQL is unavailable.
import { execFileSync } from "node:child_process";

function gh(path) {
  try {
    const out = execFileSync("gh", ["api", "--paginate", "--slurp", path], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(out).flat();
  } catch (error) {
    console.error("GitHub CLI call failed. Install `gh` and run `gh auth login`.");
    console.error(error.stderr?.toString() || error.message);
    process.exit(1);
  }
}

const repo = "repos/{owner}/{repo}";
const issues = (label) =>
  gh(`${repo}/issues?state=open&per_page=100&labels=${label}`).filter((item) => !item.pull_request);

const byOldest = (a, b) => new Date(a.updated_at) - new Date(b.updated_at);
const days = (date) => Math.floor((Date.now() - new Date(date)) / 86_400_000);

const prs = gh(`${repo}/pulls?state=open&per_page=100`)
  .filter((pr) => !pr.draft)
  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
const owner = issues("needs-owner").sort(byOldest);
const clinician = issues("needs-clinician").sort(byOldest);
const ready = issues("ready-to-build");
const blocked = issues("blocked");

function section(title, items, line) {
  console.log(`\n${title} (${items.length})`);
  if (items.length === 0) console.log("  nothing");
  for (const item of items) console.log(`  ${line(item)}`);
}

section("1. PRs to review", prs, (pr) => `#${pr.number} ${pr.title} (${days(pr.created_at)}d)`);
section("2. Owner decisions", owner, (i) => `#${i.number} ${i.title} (${days(i.updated_at)}d)`);
section("3. Ask the clinician (batch these)", clinician, (i) => `#${i.number} ${i.title}`);
console.log(`\nQueue: ${ready.length} ready-to-build, ${blocked.length} blocked`);
