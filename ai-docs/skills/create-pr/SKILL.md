---
name: create-pr
description: Prepare and open a GitHub pull request for the current branch in Recruitment Gorilla, following the project's PR template, verification checklist, and golden rules. Use when the user wants to create, open, raise, or draft a PR — or asks for PR details, title, or description for a branch.
---

# Create a Pull Request

Produce a well-formed PR for the current feature/fix branch, filled from the
project's template and checked against the `AGENTS.md` golden rules and the
`ai-docs/feature-playbook.md` verification checklist.

The PR body template lives in [pr-template.md](pr-template.md) — read it and fill
every section. The same file can be copied to `.github/PULL_REQUEST_TEMPLATE.md`
if the team wants GitHub to pre-fill it (offer this, don't assume).

## Steps

1. **Gather context** (read-only):
   ```bash
   git branch --show-current
   git log --oneline master..HEAD        # commits that will be in the PR
   git diff --stat master..HEAD          # scope of change
   git status --short                    # confirm nothing unintended is uncommitted
   ```
   - The base branch is `master` unless told otherwise.
   - If the current branch **is** `master`, stop — a PR needs a feature branch.

2. **Draft the PR** from [pr-template.md](pr-template.md):
   - Title: imperative, ≤ ~72 chars, no trailing period (e.g. "Add recruitment dashboard and Active Job Openings").
   - Summarize *what* and *why*; list notable changes grouped by backend / frontend / database.
   - Fill the API table and the **Database & migrations** block from the actual diff (name any EF migration; confirm it's additive — our scaffolds can print a false "possible data loss" warning).
   - Link the relevant `ai-docs/specs/*.md` spec.
   - Leave checklist items unchecked that you can't verify; don't fake them.

3. **Confirm before pushing / opening** — pushing and opening a PR are
   outward-facing. Confirm with the user first (unless they already said to do it),
   then:
   ```bash
   git push -u origin <branch>
   # Pass the body via a temp file so it's exact (avoids shell-escaping issues):
   gh pr create --base master --head <branch> --title "<title>" --body-file <path-to-body>
   ```
   - Write the filled body to a temp file in the scratchpad, not the repo.
   - If `gh` isn't available/authenticated, output the final title + body for the
     user to paste, plus the compare URL:
     `https://github.com/<owner>/<repo>/compare/master...<branch>?expand=1`.

4. **Report** the PR URL (or the ready-to-paste details).

## Rules (from AGENTS.md)

- **Never** add Claude/Anthropic (or any AI) as commit author/co-author — this
  applies to any commits made while preparing the PR too.
- **Commit/push only when asked.** Don't create commits to "tidy up" for the PR
  unless the user requests it.
- Don't include unrelated files in the branch (e.g. pre-existing untracked files
  like `start-app.bat`) — call them out instead.
- Keep secrets out of the diff and the PR description.
- If code changed but `ai-docs/` didn't, flag it — golden rule #4 requires docs
  to stay in sync, and the template has a checkbox for it.

## Scope notes

- One logical change per PR. If a branch bundles unrelated work (e.g. a feature
  plus its docs), suggest splitting into separate PRs/branches.
- For UI changes, remind the author to attach screenshots in **both** light and
  dark themes (the app flips via `data-bs-theme`).
