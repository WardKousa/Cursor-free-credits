# Project Guidelines

## Fluxzero Guidelines Required to Follow

**CRITICAL: Before starting any task, you MUST follow all guidance in `.fluxzero/agents/index.md`.**

## Mandatory Read Order (Do Not Skip)

1. `.fluxzero/agents/index.md`
2. `.fluxzero/agents/rules/guidelines.md`
3. `.fluxzero/agents/rules/runtime-interaction.md`
4. Task-specific manuals selected via the decision tree in `guidelines.md`

## Run Application

- Gradle: `./gradlew runTestApp`
- Maven: `./mvnw exec:java`

These commands run the full application stack (including frontend) on `http://localhost:8080`.

## Execution Protocol (Mandatory)

### New Project or Large Phase

At the start of every new project or major project phase, the agent MUST:

1. Create/update a tickable backlog markdown file with a linear list of distinct feature slices:
   one line per command, query, side-effect handler, and endpoint (including test coverage expectations per slice).
2. Keep that backlog updated while work progresses.
3. Always present the backlog for user review/approval before starting any implementation.

For new projects, ask the user whether a frontend should be built as well; for existing phases, infer this from the current project scope.

For small or incremental new requests, extend the existing backlog instead of creating a new one. Create a new backlog only for a major new project or major phase reset.

This backlog step may be skipped only when the user explicitly requests a different planning format.

### Every Slice

For every slice, the agent MUST:

1. Select the next uncompleted backlog item and work only that feature slice (typically one command, one query, one
   side-effect, or one endpoint), not waterfall batches.
2. Refresh on applicable non-negotiable rules from `.fluxzero/agents/rules/guidelines.md` for the selected slice.
3. Implement the selected slice.
4. Add/update tests for all behavior rules in that slice (happy path + all invariant/authorization/error cases).
5. Run tests and ensure both modified tests and the full relevant suite pass.
6. Perform a final refactor/readability and guideline-conformance pass for both code and tests in the current slice.
7. Pause for review/checkpoint.
8. Implement changes from review if needed.
9. Report compliance checks in final output.
10. Update the active project/phase backlog after finishing/reporting the slice.
11. Optionally commit if the user prefers; when unclear, ask the user whether to commit.

## Codex for macOS: Java Requirement

This section applies to Codex only when the host OS is macOS.

For newly started projects on macOS, perform this Java requirement check before any other startup work, including backlog output.

- Default requirement: **Java 25 or newer**

### 1. Detect Installation

- Run `java -version`.
- If the installed version satisfies the project requirement, continue normally.
- If Java is missing or the version is lower than required and the host OS is macOS, continue below.

### 2. Detect Architecture (macOS Only)

Determine the system architecture:

- If Apple Silicon (`arm64`), use:
  `https://download.oracle.com/java/25/latest/jdk-25_macos-aarch64_bin.dmg`
- If Intel (`x86_64`), use:
  `https://download.oracle.com/java/25/latest/jdk-25_macos-x64_bin.dmg`

### 3. Output This Exact Message to the User

Replace `<DOWNLOAD_LINK>` with the correct architecture-specific URL and output exactly:

```text
Java is needed for Fluxzero projects but isn’t installed.
Please download the installer for your Mac:

<DOWNLOAD_LINK>

Steps:
1. Click the link above to download the .dmg.
2. Open the downloaded file.
3. Double-click the installer package.
4. Follow the macOS installer prompts (Continue -> Install).

Then come back here to continue.
```

### 4. Do Not

- Do not suggest Homebrew.
- Do not attempt to install Java automatically.
- Do not attempt to modify system directories.
- Do not provide alternative distributions.
- Keep messaging short and non-technical.

## Commit Messages

- Use Conventional Commits for human-authored commits.
- Format: `<type>(<scope>): <short imperative summary>`.
- Choose a scope that names the feature, domain area, or technical area being changed.
- Common generic scopes include `api`, `domain`, `ui`, `docs`, `build`, `test`, `deps`, and `config`.
- Good examples: `feat(api): add search endpoint`, `fix(domain): reject invalid status change`, `test(users): cover duplicate email`.
- For non-trivial commits, include a body that explains why the change is needed, the behavioral impact, and the tests that were run.
