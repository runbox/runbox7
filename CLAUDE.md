# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace

Angular 16 workspace with two projects:

- `runbox7` — the webmail app (`src/app/`)
- `rmm6` — an Angular library

Frontend only; the Perl/MySQL backend lives elsewhere and is not in this repo.

## Commands

Non-obvious things to know:

- **Dev (mock backend, preferred):** in two terminals — `npm run mockserver` and `npm run start-use-mockserver` (serves at http://localhost:4201). Use this by default rather than `npm start`, which proxies to the real Runbox backend.
- **Pre-PR gate:** `npm run ci-tests` runs lint → policy → unit → e2e → build, the same as CI. Run this locally before opening a PR — don't substitute partial runs.
- **Unit tests use FirefoxHeadless**, not Chrome. `npm test` is interactive; for one-shot use `ng test --watch=false --progress=false --browsers=FirefoxHeadless`.
- **Do not run `npm run build` casually.** It mutates `src/app/changelog/changes.ts` as a side effect; only run when actually preparing a release. See README for the changelog-exclusion commit format.
- **Lint:** `npm run lint` (Angular ESLint). There is no Prettier — ESLint is the source of truth for style.
- **Policy tests:** `npm run policy` runs custom validators in `policy-tests/`.

## Commit messages

Conventional commits with **mandatory scope**, enforced by `.github/workflows/commit-lint.yml` on PRs to master. The literal regex used to reject commits is:

```
^(build|ci|docs|feat|feature|fix|perf|refactor|revert|style|test)\([\w-]+\): 
```

So: `feat(calendar): add timezone picker` — yes. `feat: add timezone picker` — rejected (no scope). Keep the subject ≤100 chars. See CONTRIBUTING.md for the full convention.

## PR requirements

- **AI-use disclosure is mandatory.** If AI was used to write any part of the PR, the PR description must state which agent(s) and where (CONTRIBUTING.md §Coding Rules, §Use of AI). When drafting a PR description, always include this block.
- Branch from `master`. Tests should be in separate cherry-pickable commits where possible.
- All `npm run ci-tests` checks must pass locally before opening the PR.

## Code style

ESLint-enforced (Angular + TypeScript ESLint):

- Single quotes in TypeScript; semicolons required.
- Component selectors: `app-*` (kebab-case); directive selectors: `appCamelCase`.
- No variable shadowing. Unused vars must be prefixed with `_`.

## Environment

- Node 16.x (matches CI).
- `RUNBOX7_ANGULAR_BACKEND_HOST` overrides the dev proxy target (defaults to https://runbox.com).
- `SENTRY_DSN` optional, used by the build.
