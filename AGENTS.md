# Agent workflow

GitHub issues are the only work queue. Nothing important lives in a chat window or a local TODO file. Product and clinical rules are in `PRODUCT.md`, `PROJECT_CONTEXT.md` and `ORTHODONTIC_CASE_PRESENTATION_TOOL_SPEC.md`; architecture decisions are in `docs/DECISIONS.md`.

## Labels

| Label             | Meaning                                                 | Who acts  |
| ----------------- | ------------------------------------------------------- | --------- |
| `ready-to-build`  | Spec is clear; an agent may build it                    | Agent     |
| `blocked`         | Waiting on another issue (named in the issue)           | Nobody    |
| `needs-owner`     | Waiting on a decision or manual check by the owner      | Owner     |
| `needs-clinician` | Waiting on clinician input (assets, wording, positions) | Clinician |
| `refactor`        | No behaviour change allowed                             | Agent     |

Only the owner moves an issue to `ready-to-build`.

## Developer agent cycle

1. Take the issue the owner names, or else the oldest open `ready-to-build` issue that is not `blocked`.
2. One issue = one branch (`issue-<n>-<short-slug>`) = one PR whose description says `Closes #<n>`. Use a separate git worktree when working on issues in parallel.
3. Stay inside the issue's scope. Anything else you notice goes in a new issue, not in this PR.
4. Verify before opening the PR: `pnpm ci:verify`, plus `pnpm test:electron` when the main process, preload or IPC contract changed.
5. Fill in the PR template. If slide output changed, attach before/after renders of the affected slides made from synthetic fixtures.
6. If you need a decision, comment on the issue with one concrete question and the options, switch its label to `needs-owner` or `needs-clinician`, and stop work on that issue.
7. Loop guard: after two rounds of requested changes on the same PR, label the issue `needs-owner` and stop.

## Never

- Merge PRs, push to `main`, or create releases. The owner merges.
- Read, copy, commit or upload anything under `resources/`, real patient decks, images, names or local paths. Use `packages/test-fixtures` only. The one exception is the empty template `resources/vaka_template.pptx`, and only when the issue explicitly allows it.
- Edit committed goldens without the owner asking in the issue.

## Owner inbox

`pnpm inbox` lists everything waiting on the owner: PRs to review, `needs-owner` issues, `needs-clinician` questions to batch for the clinician, and queue counts. Requires the GitHub CLI (`gh`) signed in.
