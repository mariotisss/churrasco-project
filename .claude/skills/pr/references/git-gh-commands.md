# Git & gh CLI Commands Reference

## Detect base branch

```bash
git remote show origin | grep 'HEAD branch' | awk '{print $NF}'
```

## Find merge base

```bash
git merge-base HEAD origin/$BASE
```

## List commits since divergence

```bash
git log $MERGE_BASE..HEAD --oneline --no-merges
```

## Changed files stats

```bash
git diff --stat $MERGE_BASE..HEAD
```

## Working tree status

```bash
git status --short
```

## Current branch name

```bash
git branch --show-current
```

## Check if branch has upstream

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

## Push with upstream

```bash
git push -u origin $(git branch --show-current)
```

## Check if PR already exists

```bash
gh pr view --json url -q '.url' 2>/dev/null
```

## Create PR (draft — default)

```bash
gh pr create \
  --title "<generated-title>" \
  --body "$(cat <<'EOF'
<generated-description>
EOF
)" \
  --base <base-branch> \
  --draft \
  --assignee "@me"
```

## Create PR (ready for review — only if user explicitly requests it)

```bash
gh pr create \
  --title "<generated-title>" \
  --body "$(cat <<'EOF'
<generated-description>
EOF
)" \
  --base <base-branch> \
  --assignee "@me"
```
