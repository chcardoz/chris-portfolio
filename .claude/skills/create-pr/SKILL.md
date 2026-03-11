---
name: create-pr
description: Push the current branch and create a pull request
disable-model-invocation: true
---

Create a pull request for the current branch. Follow these steps:

1. Run these in parallel:
   - `git status` to check for uncommitted changes (warn the user if any exist)
   - `git log --oneline origin/main..HEAD` to see all commits in this branch
   - `git diff origin/main...HEAD` to review the full PR diff

2. Push the current branch to origin:
   - `git push -u origin HEAD`

3. Analyze the diff and draft a PR title and description:
   - Title must be under 80 characters
   - Description should be under 5 sentences unless the user says otherwise
   - Describe ALL changes in the diff, not just the latest commit

4. Create the PR:
   - Use `gh pr create --base main` with `--title` and `--body` flags
   - Use a HEREDOC for the body

5. Return the PR URL to the user.

If any step fails, ask the user for help.
