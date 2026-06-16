---
name: catchup
description: Analyzes all git branch commits to reload context efficiently after /clear. Use when resuming work after clearing context or starting a new session on an existing branch.
disable-model-invocation: true
---

## Goal

Analyze all commits in the current branch (diverged from master) plus any uncommitted changes, and load a concise understanding of what is being worked on into the current context.

## Branch index

**Current branch:**
!`git rev-parse --abbrev-ref HEAD`

**Commits in this branch:**
!`git log master..HEAD --oneline`

## Rules

- **Never read the full diff in the main context.** Always delegate git diff reading to subagents (Task tool, subagent_type="general-purpose") to keep the main context clean.
- **Batch commits in groups of 10.** If the branch has ≤10 commits, use one subagent. If >10, spawn one subagent per batch of 10 in parallel, then one consolidation subagent.
- **Each analysis subagent** must run `git show <hashes>` for its batch. Only the consolidation subagent (or the single subagent) handles uncommitted changes via `git diff; git diff --cached; git ls-files --others --exclude-standard`.
- **Output from subagents** must be a concise summary of what was changed and why — no line-by-line descriptions, no full diffs.
- **Confirm to the user** with a single line once context is loaded: `Context recovered: [N] commits analyzed on [branch-name]`. Nothing more.
