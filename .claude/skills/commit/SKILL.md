---
name: commit
description: Create a git commit with a well-formed message
disable-model-invocation: true
---

Commit the current changes. Follow these steps:

1. Run these in parallel:
   - `git status` to see all changed/untracked files
   - `git diff` and `git diff --staged` to see what changed
   - `git log --oneline -10` to match the repo's commit message style

2. Analyze the changes and draft a commit message:
   - Summarize the nature: new feature, bug fix, refactor, docs, etc.
   - Keep it to 1-2 concise sentences focused on the "why"
   - Match the style of recent commits in the log
   - Do NOT commit files that look like secrets (.env, credentials, keys)

3. Stage the relevant files by name (never use `git add -A` or `git add .`) and create the commit:
   - Use a HEREDOC for the message
   - End with: Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

4. Run `git status` after to verify success.

If there are no changes to commit, say so and stop.
