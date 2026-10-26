# Code style

Rules for how code in this repository looks and is organised. They apply to humans and AI agents alike. When a rule is wrong or missing, change this file in the same change that needs it.

## Language

- Everything in the repository is written in **English**: identifiers, comments, docstrings, documentation, test names, commit messages.
- Private study notes live outside the repository (separate notes vault). Do not add Obsidian files, wikilinks or editor state here.

## Principles

1. **Readability over cleverness.** Prefer the obvious solution a new reader follows without help.
2. **Smallest sufficient change.** Reuse existing code, the standard library or an installed dependency before adding something new. A new dependency needs a concrete reason stated in the change.
3. **Explicit boundaries.** Pure computation in the middle, I/O (files, environment, network) at the edges. Pass inputs in as arguments; do not read global state inside algorithms.
4. **Fail fast, fail clearly.** Validate at module boundaries and raise a specific error with an actionable message. Never swallow exceptions or return a silent default for missing required input.
5. **Reproducible by default.** Anything random takes an explicit `seed`. Outputs record the parameters and versions that produced them.
6. **No machine-specific values in code.** No absolute paths, usernames or drive letters. Configuration comes from the environment (see `docs/patterns.md`, *Environment configuration*).
7. **Name things instead of commenting them.** Replace magic numbers with named constants or parameters.
8. **Comments explain why, not what.** A comment that restates the next line is noise; a comment that records a constraint, a trade-off or a non-obvious fact is valuable. Keep docstrings short.
9. **No dead code.** Delete unused functions, commented-out code and stale TODOs. A `TODO` must name what is missing and where the decision is recorded.
10. **Do not claim what is not verified.** Tests, lint and type checks are the evidence. If something was not run, say so.

## Python (`pipeline/`)

- Python 3.12, managed with `uv`. Formatting and linting: `ruff` (`uv run ruff check .`, `uv run ruff format .`). Line length 88.
- Layout: `src/music_atlas/`, one module per pipeline stage. Tests in `pipeline/tests/`, named `test_<module>.py`.
- Type hints on every function signature, including return types. Use built-in generics (`list[int]`, `X | None`) and `type` aliases.
- Docstrings: one imperative summary line (`"""Return neighbour indices and distances."""`). Add `Args`/`Returns` only when a parameter's meaning or unit is not obvious from its name and type.
- Naming: `snake_case` functions and variables, `PascalCase` classes, `UPPER_SNAKE` constants. Matrix names follow the maths of the docs: `X` for the feature matrix, `Z` for the PCA-reduced matrix, `Y` for the 2D map.
- Use `pathlib.Path`, never string concatenation for paths.
- Value objects (specs, parameter bundles) are frozen dataclasses. Do not pass loose dictionaries of parameters between stages.
- Stages are functions of their inputs. No module-level mutable state, no hidden global random generator: create `numpy.random.default_rng(seed)` where needed.
- Prefer vectorised NumPy/pandas over Python loops for per-track work; show a measured reason before optimising further.

## TypeScript / React (`frontend/`)

- `strict` TypeScript. No `any`; use `unknown` and narrow. No non-null assertions without a comment explaining why they are safe.
- Formatting follows the existing files: 2 spaces, single quotes, no semicolons. ESLint (`npm run lint`) is the enforcer.
- One React component per file, file named like the component (`AtlasMap.tsx`). Hooks are named `useThing`.
- Data contract types mirror the exported JSON exactly (`snake_case` fields) and live in `src/data/types.ts`. Convert to UI-friendly shapes in one place, at the loader, not scattered through components.
- State lives in one place (`src/state/`). Components read derived values; they do not recompute them from raw data on every render.
- Tests are co-located: `thing.test.ts` next to `thing.ts`. Test behaviour, not implementation details.
- No network calls at runtime other than loading the static atlas files.

## Tests

- A change is not done until its tests exist and pass. Prefer a small test of behaviour over a large snapshot.
- Tests are deterministic and offline: fixed seeds, tiny synthetic data, no downloads.
- Name tests by the behaviour they pin (`test_knn_excludes_self`), not by the function name.

## Git

- Commit messages: English, imperative, Conventional Commits prefix (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). One logical change per commit.
- Nobody (human or agent) pushes, force-pushes or rewrites history without an explicit decision for that action.
- Large or derived data, audio and secrets are never committed (see `.gitignore`).

## Definition of done

- `cd pipeline && uv run pytest && uv run ruff check .`
- `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build`
- Docs updated if behaviour, structure or a documented pattern changed.
- New recurring solution recorded in `docs/patterns.md`.
