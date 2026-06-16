---
name: pr
description: Creates a pull request with auto-generated title and description following Churrasco conventions. Use when creating a PR from the current branch. Generates structured PR descriptions, and handles remote push if needed.
disable-model-invocation: true
argument-hint: "[base-branch]"
---

# PR

Creates a pull request for the current branch with an auto-generated title and description following MM-Monorepo conventions.

## Required information

- **Base branch**: target branch for the PR (default: `master`). Use `$ARGUMENTS` if provided; otherwise detect automatically.
- **Commits**: there must be at least one commit ahead of the base. If not, exit with an error.

## Rules

- All output (questions, PR title, PR description, messages to the user) must be in English.
- PR title format: `<type>(<scope>): <description>` (Conventional Commits).
- Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Title description: 50-72 characters, concise.
- Infer `type` and `scope` by analyzing the commit history since the divergence with the base branch.
- Extract the Jira code from the branch name with regex `[A-Z]+-[0-9]+`. If no match, ask the user in plain text.
- All checkboxes in the description template must remain UNCHECKED. The user fills them in.
- Show the generated title and full description to the user and wait for plain-text confirmation before creating the PR.
- Create the PR as **draft** (`--draft`) by default, unless the user explicitly asks for "ready for review".
- Set the user as the PR assignee.
- If a PR already exists, show the existing URL and exit.
- If `gh` CLI is not installed, show installation instructions and exit.
- If there are no commits ahead of the base branch, exit with an error.
- If the branch has no upstream, push before creating the PR.
- Use `references/git-gh-commands.md` for all exact git and gh CLI commands.

## Objective

Analyze the current branch, generate a Conventional Commits title and a complete description using `templates/pr-description.md`, confirm with the user, push if needed, create the PR as draft using GitHub CLI, and return the PR URL to the user.

## References

- **[PR description template](templates/pr-description.md)** — Template with placeholders for the PR description
- **[Git & gh CLI commands](references/git-gh-commands.md)** — Exact git and gh CLI commands used in the workflow
