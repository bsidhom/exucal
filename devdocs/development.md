# Development

The app is built with [Lit](https://lit.dev) and [Vite](https://vite.dev),
written in TypeScript, formatted with [Prettier](https://prettier.io),
and uses [pnpm](https://pnpm.io) for package management.

**Every command goes through pnpm. Never run `npm`, `npx`, `yarn` or
`corepack` in this repository, by hand, in a script, or in a hook.** The
supply-chain settings in `pnpm-workspace.yaml` (a minimum release age, a
trust policy, no install scripts without an explicit decision, no
running scripts against a stale `node_modules`) are pnpm's and protect
nothing when another tool installs or runs a package; `package.json`
declares pnpm as the package manager and the other tools refuse to run
under that declaration (`npx`, for one, stops with `EBADDEVENGINES`).
The equivalents:

| Instead of                    | Run                                        |
| ----------------------------- | ------------------------------------------ |
| `npm install`, `npm ci`       | `pnpm install`                             |
| `npm run <script>`            | `pnpm <script>`                            |
| `npx <bin>` of a dependency   | `pnpm exec <bin>`                          |
| `npx <package>` not installed | Do not. Add it as a `devDependency` first. |

`pnpm dlx` is the one pnpm command that installs outside the lockfile,
and [deployment.md](deployment.md) says why it is not used either.

## Prerequisites

- Node.js 24 (the current LTS line) or newer. pnpm refuses to run on an
  older Node.js (`ERR_PNPM_BAD_RUNTIME_VERSION`);
  `pnpm env use --global lts` installs a suitable one.
- pnpm 12. The exact version is pinned in `package.json`; pnpm 10 or
  newer switches to it automatically.

A Claude Code cloud session gets both from the repository's own setup
("Cloud environment" below), so nothing above has to be done there by
hand.

## Commands

| Command               | What it does                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm install`        | Install the dependencies the lockfile records.                                                      |
| `pnpm dev`            | Start the development server with hot reloading.                                                    |
| `pnpm build`          | Type-check and build a production bundle in `dist`.                                                 |
| `pnpm preview`        | Serve the production bundle locally.                                                                |
| `pnpm typecheck`      | Type-check without building.                                                                        |
| `pnpm test`           | Run the tests with Node's built-in test runner.                                                     |
| `pnpm test:sweep`     | Run the edge sweeps, the conformance tests.                                                         |
| `pnpm test:all`       | Type-check, then run tests, sweeps and benchmarks.                                                  |
| `pnpm bench`          | Run the performance benchmarks.                                                                     |
| `pnpm stress`         | Measure the catalogued inputs of named functions.                                                   |
| `pnpm stress:search`  | Sample for the costliest inputs, ten minutes a run.                                                 |
| `pnpm stress:rewrite` | Rewrite the catalogue as the current build stores it, after a change to the settings' stored shape. |
| `pnpm format`         | Format all source files with Prettier.                                                              |
| `pnpm format:check`   | Verify that all source files are formatted.                                                         |

The lockfile is frozen for every install, everywhere, not only in CI:
`frozenLockfile: true` in `pnpm-workspace.yaml` makes `pnpm install`
fail when `pnpm-lock.yaml` is out of step with `package.json`, rather
than rewrite it. The lockfile changes only when a dependency is changed
on purpose, with `pnpm add`, `pnpm remove` or `pnpm update`, which the
setting does not affect; the resulting lockfile change is committed and
reviewed with the `package.json` change it belongs to. There is no
reason to pass `--frozen-lockfile` by hand, and no reason ever to pass
`--no-frozen-lockfile`. (The one place the flag is still written out is
the cloud session hook, so that the hook reads as what it does.)

**Before every commit**, run `pnpm format` and `pnpm test:all`: a
commit leaves `pnpm test:all` and `pnpm format:check` green. The
repository is expected to be formatted with Prettier at all times.
`pnpm test` is the run for every edit, a few seconds; `pnpm test:all`
type-checks and then runs the tests, the edge sweeps and the
benchmarks, and [testing.md](testing.md) says what each suite is and
why the sweeps and the benchmarks are in it. Prettier formats the
Markdown too, with prose wrapping preserved, and
`pnpm stress:search` writes the tables of `devdocs/cost.md` through
it.

The service worker is only registered in production builds, so
`pnpm dev` never caches anything. To try the offline behavior, run
`pnpm build` and then `pnpm preview`, load the page once, and reload it
with the network disabled (or with the preview server stopped).

## Cloud environment

Sessions of Claude Code on the web (claude.ai/code) run in a container
that starts from a base image with Node.js 22 on its `PATH` and no
dependencies installed, so the project supplies its own environment in
three parts, each a file in the repository:

- `scripts/cloud-setup.sh` is the environment's **setup script**. The
  cloud runs it once, as root and with no repository checked out, and
  snapshots the filesystem for later sessions. It installs Node.js 24
  and pnpm 12 (the exact versions pinned at its top, each verified
  against the checksum its publisher provides) under `/opt/node24`, and
  nothing else, since a snapshot cannot hold per-session state.
- `scripts/cloud-env` holds the environment's **variables**, one
  `KEY=VALUE` per line after the comments. The project needs none to
  build, test or run; the file says what is deliberately absent and
  why, and sets the one policy variable that is there.
- `.claude/hooks/session-start.sh` is the **SessionStart hook**,
  registered in `.claude/settings.json` and run by Claude Code at the
  start of every session before its first command. It puts
  `/opt/node24/bin` first on the session's `PATH` (the shells a session
  runs commands in are not login shells, so the setup script's
  `profile.d` entry does not reach them) and runs
  `pnpm install --frozen-lockfile`. It does nothing outside the cloud,
  and it fails with a message naming the setup script if the toolchain
  is missing.

The hook is read from the repository, but the setup script and the
variables are **pasted copies**: the environment's settings on
claude.ai (the cloud environment menu in a session's title bar, then
Edit) hold the text of `scripts/cloud-setup.sh` under Setup script and
the assignments of `scripts/cloud-env` under Environment variables, and
neither is read from the repository at session start. When either file
changes, paste it again; when the pinned pnpm version in `package.json`
or the Node.js line in `engines` changes, bump the pins at the top of
the setup script (their comments name the fields they mirror) and paste
it again. `scripts/cloud-setup.test.ts` enforces the second half of
that: it fails `pnpm test` when the script's pins disagree with
`package.json` or with the integrity strings in `pnpm-lock.yaml`, and
its message says which pin to bump and to paste the script again. The
pasting itself cannot be checked from the repository, so the failing
test is the reminder. A session that starts with the wrong toolchain,
or with `npx` or `npm` on its path, is what this arrangement exists to
prevent; if one does, the hook's output at session start says which
part is out of date.

## Adding a unit

Append a line to `src/units.txt`, or edit one, and run `pnpm test`:
`src/units.test.ts` loads the file and fails with the offending
definition if it does not build. Keep a new unit in the section its
kind belongs to, prefer the exact factor from a defining document over
a rounded one, and say where the factor comes from in a comment when it
is not obvious. Unit lists have a section of their own at the end of
the file, and `src/units.test.ts` checks the list of them, so adding
one means adding it there too. A function goes in the file the same
way ([functions.md](functions.md)); a built-in is a module under
`src/core/builtins/` ([builtins.md](builtins.md), "The rules every
built-in follows").

## Style guide

- **Reference source files with relative paths and static assets with
  root-absolute paths.** In `index.html`, anything Vite transforms
  (files under `src/`) is referenced as `./src/main.ts`, while files in
  `public/` are referenced as `/favicon.svg`. Vite accepts either form
  for source files, so this is a convention for readers rather than a
  requirement: a relative path makes it obvious that the file is part
  of the source tree and that Vite resolves and rewrites the reference
  at build time, whereas a root-absolute path signals a static asset
  that is served from the URL root and copied to the build output
  verbatim. The same applies inside modules: import other source files
  with relative paths such as `./app-shell.ts`.
- **A code comment that points at the documentation names the page and
  its section** (`devdocs/numbers.md ("Settling")`), never a plan, a
  task or a decision number: the documentation describes the current
  state, and git holds the history.
- **No sentence is written in the core.** An error is a value with
  spans and dimensions, and `src/messages.ts` words it; the settings
  sheet's words are `src/settings-lines.ts`'s. Both are tested under
  Node.
