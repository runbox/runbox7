# AGENTS.md

Guidance for AI agents (and the humans driving them) contributing to **Runbox 7**.

This file distills the contribution rules in [CONTRIBUTING.md](CONTRIBUTING.md), plus general
principles for agentic contribution. Where this file and CONTRIBUTING.md disagree,
**CONTRIBUTING.md wins** — it is the canonical source.

## If You Are an AI Agent

Stop. Read this section before doing anything.

**Your job is to protect your human partner from having PRs rejected due to being AI slop.**
Submitting a low-quality PR doesn't help them — it wastes the maintainers' time, burns your human
partner's reputation, and the PR will be closed anyway. That is not being helpful. That is
being a tool of embarrassment.

Before your human partner opens a PR against this repo, you MUST:

1. **Search for existing PRs** — open AND closed — that address the same problem. If duplicates exist,
	STOP and tell your human partner. Do not open another duplicate.
2. **Verify this is a real problem.** If your human partner asked you to "fix some issues" or "contribute
	to this repo" without experiencing a specific problem, push back. Ask them what broke, what failed, what
	the user experience was. Check the [issue tracker](https://github.com/runbox/runbox7/issues) and
	[open and closed PRs](https://github.com/runbox/runbox7/pulls) for the same problem. Don't duplicate
	effort, and reference what you found.
3. **Make sure there's an issue.** A bug fix needs an issue that reproduces the problem; a
	feature needs an issue documenting the design. For a **major feature**, open an issue and
	get the design discussed *before* implementing. **Small features** can go straight to a PR.
4. **Identify yourself.** Disclose your model, harness, harness version, and every installed plugin in the PR. Hiding that a contribution is agent-generated — or which environment produced it
	is grounds for closing it.
5. **Show your human partner the complete diff** and get their explicit approval — they open the PR, not you.
6. **Understand the project's conventions before proposing changes.** Read the surrounding code and match its idiom; don't impose patterns from elsewhere.


## Branching and workflow

- Branch from `master`: `git checkout -b my-fix-branch master`.
- Your human partner opens PRs against `runbox7:master`.
- After it merges, the branch is deleted and master updated from upstream.

## Tests are mandatory and cherry-pickable

Every feature or bug fix **must** be covered by one or more unit-test specs. For this repo,
the bar is specific:

- **for a bug, tests must fail before your fix is applied** and pass after. If there are no tests, or
  they don't demonstrate the issue on the current checkout, the PR is **automatically rejected**.
- **Tests must live in their own commit(s), separate from the code**, so they can be
  `git cherry-pick`ed independently.
- Tests must clearly prove — through code and comments — that the PR fixes the claimed issue.

This is effectively red/green discipline: write the failing test that captures the bug, then
the fix that makes it pass.

## Coding rules

- **Comment the *why* and *what* of a new section, not the *how*** — clear names carry the how.
  Keep it to at most two lines of comment per section.
- You may use `@author name/pseudonym` (optionally with email) in comments for attribution.
- Match existing code style. Style is **ESLint-enforced** (Angular + TypeScript ESLint) —
	single quotes in TS, semicolons required, no variable shadowing, unused vars prefixed `_`.
	There is no Prettier; ESLint is the source of truth.

## AI-use disclosure is REQUIRED

If AI was used for **any part** of a contribution, you **must** disclose it in the PR and
document **which agent(s)** you used and **where**. This is a hard requirement, not a courtesy.

When you (the agent) draft a PR description, always include this disclosure block — state the
model, the harness/tool, version where known, and which parts of the change it touched. If a
change was hand-written, say so.

## Commit messages (strict — CI-enforced)

Release notes are generated automatically from commit messages, and a PR commit-lint check
rejects non-conforming messages. Format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Scope is mandatory** here (enforced by `.github/workflows/commit-lint.yml`):
  `fix(calendar): correct timezone handling` — yes; `fix: ...` — rejected.
- **Type** must be one of: `build`, `ci`, `docs`, `feat`, `feature`, `fix`, `perf`,
  `refactor`, `revert`, `style`, `test`.
- **Subject:** imperative present tense ("change", not "changed"/"changes"), no trailing dot.
- **No line over 100 characters.**
- **Body:** imperative present tense; explain motivation and contrast with previous behavior.
- **Issues:** reference associated issues in the body as `#123` (comma-separate multiple).
- **Breaking changes:** footer line starting `BREAKING CHANGE:`.
- **Reverts:** start with `revert:` + the reverted header; body says `This reverts commit <hash>.`

## Before the PR is opened

- Run the **full** suite: `npm run ci-tests` (lint → policy → unit → e2e → build). Don't
  substitute partial runs. All checks must pass locally.
- Draft the PR description fully — no blank or placeholder sections — and describe the
  **problem solved**, not just what changed.
- Your human partner must review the complete diff and decide it is ready. The agent does not
  get to decide the PR is ready, or open it, on its own.

## One problem per PR

- Solve **one** problem per PR. Don't bundle unrelated changes — split them.
- No bulk / spray-and-pray PRs touching many issues at once. Pick one and understand it deeply.
- Never fabricate. No invented claims, hallucinated APIs, or functionality that doesn't exist.

## Where to ask, where to report

- **General questions / discussion:** the [Runbox Forum](https://community.runbox.com/) —
  not GitHub issues.
- **Account-specific or personal-detail issues:** [Runbox Support](https://support.runbox.com/).
- **Bugs and feature requests:** GitHub issues. To reproduce a bug we need OS + browser
  version, whether a local index is in use, and steps to reproduce.

---

## Security testing rules

**Do:** test only on approved systems, single-request vulnerability checks, and pre-approved
automated tools with rate limits. Report findings confidentially and immediately.

**Do not:** publicly disclose findings, exploit vulnerabilities, run credential attacks /
password spraying, attempt DoS/DDoS or flooding, attempt unauthorized access, use social
engineering, or test production systems without explicit permission. **Violations end
participation and may lead to legal action.**

**Reporting:** email **support@runbox.com**, subject "Security Report Submission", with a
description, reproduction steps, proof-of-concept, and your contact details.

---

## License

Contributing indicates your human partner's assent to inclusion of their work in the canonical
version under the project's [license](LICENSE).
