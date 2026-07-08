---
name: tdd-setup
description: Set up a project's test environment so the tdd skill can run. Use when the user asks to set up testing, when /tdd is invoked but no test runner is configured, or when tests fail because the environment is missing.
---

# TDD Setup

Bootstrap a working test environment in any project — detect the language and stack, install an idiomatic test runner, create the folder conventions, verify with a smoke test, and record everything in `CLAUDE.md` so future sessions (and the `tdd` skill) know how to run tests. This skill is language-agnostic: never assume a stack; detect it.

## Step 0 — Check if setup is even needed

Look for an existing test configuration before changing anything: test scripts/tasks in the project manifest, test config files, existing test directories, or a lockfile entry for a known test framework. If a working setup exists, don't replace it — just verify it runs (Step 4) and document it (Step 5). If the user explicitly asked to switch frameworks, confirm before removing the old one.

## Step 1 — Detect the stack

Identify the language and toolchain from project files, e.g.:

| Evidence | Stack |
|---|---|
| `package.json` (+ lockfile) | JS/TS — note the package manager (npm/yarn/pnpm/bun) and framework (Next.js, Vite, Node, ...) |
| `pyproject.toml`, `requirements.txt`, `setup.cfg` | Python — note the manager (uv/poetry/pip) |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pom.xml`, `build.gradle(.kts)` | Java/Kotlin |
| `Gemfile` | Ruby |
| `*.csproj`, `*.sln` | .NET |
| `composer.json` | PHP |
| `Package.swift`, `*.xcodeproj` | Swift |
| `mix.exs` | Elixir |

Multi-language monorepo: ask the user which package(s) to set up, or set up the one they're working in. Empty/ambiguous project: ask.

## Step 2 — Choose the test framework

Prefer what's built in, then the community default. Match the project's existing conventions (e.g. if the repo already uses Vite, choose Vitest over Jest).

- **JS/TS**: Vitest (Vite/modern projects), Jest (existing Jest ecosystem), or `node:test` for zero-dependency Node libraries. TS projects need the runner to handle TS (Vitest does natively).
- **Python**: pytest.
- **Go / Rust / Elixir**: built-in (`go test`, `cargo test`, `mix test`) — nothing to install; only conventions and docs.
- **Java/Kotlin**: JUnit 5 via the existing build tool.
- **Ruby**: RSpec (or Minitest if already present).
- **.NET**: xUnit.
- Anything else: the language's de-facto standard.

If two options are genuinely reasonable and the codebase gives no signal, briefly ask the user rather than guessing.

## Step 3 — Install and scaffold

1. Install the framework as a dev dependency **using the project's own package manager** (respect the lockfile).
2. Add minimal config only if required — prefer zero-config defaults over generated config files.
3. Wire a canonical entry point: `test` script in `package.json`, Makefile/justfile target, or note the native command (`go test ./...`). There must be **one obvious command** that runs the whole suite.
4. Create the test folder structure following the language's idiom, and the repo's existing layout if any:
   - JS/TS: colocated `*.test.ts` next to source, or `tests/` — follow existing repo convention; default to colocated.
   - Python: `tests/` mirroring the package, `test_*.py`.
   - Go: `*_test.go` next to source.
   - Rust: `#[cfg(test)]` modules + `tests/` for integration.
   - Java/Kotlin: `src/test/{java,kotlin}/...`.
5. Keep the footprint minimal: no coverage tooling, watch daemons, or CI config unless asked.

## Step 4 — Verify with a smoke test

Write one trivial test (e.g. asserting a known truth against real project code if a pure function exists, otherwise a standalone sanity assertion), run the canonical command, and confirm it passes. If it fails, fix the environment before proceeding — this skill is not done until the suite runs green. Delete the placeholder smoke test afterwards **only if** it tests nothing real; keep it if it exercises actual project code.

## Step 5 — Record in CLAUDE.md

Append (or update — don't duplicate) a `## Testing` section in the project's `CLAUDE.md` (create the file if absent) covering:

- Test framework and version.
- The exact command to run all tests, and to run a single test file.
- Where tests live and the naming convention.
- Any setup caveats (env vars, required services, fixtures).

Example:

```markdown
## Testing

- Framework: Vitest
- Run all: `pnpm test` / single file: `pnpm test src/foo.test.ts`
- Tests are colocated with source as `*.test.ts`
- No external services required
```

## Step 6 — Wire TDD into existing implementation skills

Check the project's skill directories (`.claude/skills/` in the repo, plus any nested package-level ones) for skills whose job is implementing features — names like `implement`, `implementation`, `build`, `feature`, `develop`, or a description saying it drives feature implementation. Skip skills that merely touch code incidentally (commit, review, design, docs).

For each match, add a directive to its `SKILL.md` (skip if an equivalent instruction already exists) telling it to always implement via TDD, e.g.:

```markdown
## Methodology

Always implement using test-driven development: invoke the `tdd` skill before writing any implementation code, and follow its red → green loop for every slice of work.
```

Place it where the skill's flow starts (near the top or as a prerequisite section), matching the file's existing tone and heading style. Report which skills were updated. If none exist, skip this step silently.

## Step 7 — Report

Tell the user what was installed, the run command, the folder convention, and that `/tdd` is now ready to use.
