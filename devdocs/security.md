# Security

The project's security stance is mostly about its supply chain: what
code runs, at install time, at build time and in the page, who wrote
it, and how it changes. Each rule names where it is enforced, so that a
change that weakens one has a file to touch and a reviewer to convince.

The day-to-day steps these rules point to, pnpm and the lockfile, the
cloud environment and deployment, are in
[development.md](development.md) and [deployment.md](deployment.md).

## Dependencies

- **Few, and each a decision.** The page has one third-party
  dependency, Lit. The tools are five development dependencies:
  TypeScript and Node's types, Vite, Prettier, and wrangler for
  deploying (package.json). Nothing else is pulled in for convenience:
  the tests run on `node:test`, the benchmarks time with their own
  `bestOf`, the random source is the project's own
  (`src/testing/random.ts`), and the icons are rasterized without a
  library (`rasterize-svg.ts`). A new dependency is a decision to
  justify in review, not a shortcut.
- **Exact versions, and a frozen lockfile.** `saveExact` records exact
  versions in package.json, and `frozenLockfile: true` makes every
  `pnpm install`, on every machine and in every flow, fail rather than
  rewrite `pnpm-lock.yaml` when the two disagree. The lockfile changes
  only when a dependency is changed on purpose, with `pnpm add`,
  `remove` or `update`, and the change is reviewed with the
  package.json change it belongs to ([development.md](development.md),
  "Commands"). `verifyDepsBeforeRun: error` refuses to run a script
  against a `node_modules` out of step with the lockfile.
- **Limits on what can be resolved** (pnpm-workspace.yaml):
  `minimumReleaseAge` refuses any version published less than 24 hours
  ago, since a malicious release is usually yanked within hours;
  `trustPolicy: no-downgrade` refuses a version published with weaker
  provenance or trust than an earlier one, the signature of a
  compromised publisher or a downgrade attack; `blockExoticSubdeps`
  refuses a transitive dependency resolved from a git repository or a
  tarball URL rather than the registry; and `engineStrict` refuses a
  package that does not support the Node.js in use.
- **No install scripts.** `strictDepBuilds` fails an install that meets
  a package with a lifecycle script not decided under `allowBuilds`, so
  no third-party code runs at install time by default, and every
  exception is an entry with a comment saying why. The two packages
  that ship scripts, `esbuild` and `workerd` (both through wrangler),
  are denied: neither script is needed.
- **pnpm only.** The settings above are pnpm's and protect nothing when
  another tool installs or runs a package, so no command in the
  repository uses `npm`, `npx`, `yarn` or `corepack`; package.json
  declares pnpm (`packageManager`, `devEngines`), and the other tools
  refuse to run under that declaration ([development.md](development.md)
  has the equivalents). Deploying uses the pinned wrangler, never
  `pnpm dlx`, which would install the newest one outside the lockfile
  ([deployment.md](deployment.md)).

## Toolchain and secrets

- **A pinned, verified toolchain in the cloud.** `scripts/cloud-setup.sh`
  installs exact versions of Node.js and pnpm, Node.js checked against
  its publisher's checksums and pnpm against the sha512 integrity that
  `pnpm-lock.yaml` records; `scripts/cloud-setup.test.ts` fails
  `pnpm test` when the pins drift from package.json or the lockfile.
  The session hook installs from the frozen lockfile
  ([development.md](development.md), "Cloud environment").
- **No secrets in the repository or the environment.** `.env` is
  committed and holds none (a secret would belong in the ignored
  `.env.local`); `scripts/cloud-env` sets no token, and says so; and
  nothing the project builds, tests or runs needs one, a deploy being
  made from a developer's machine. Telemetry is off where a tool offers
  it (`DO_NOT_TRACK`, and `WRANGLER_SEND_METRICS=false` in `.env`).

## Code that runs commands

The tests and plugins that call git or tsc, and the shell scripts in
`scripts/` and `.claude/hooks/`, follow these rules, and new code does
too:

- **No shell between Node.js and a command.** A command runs through
  `execFileSync` or `execFile` with its arguments as an array, never a
  command string, so nothing in a path or an argument is read by a
  shell.
- **Lists of paths are NUL-separated where the tool allows it.** Read
  git's lists with `-z`, which separates paths with NUL, the one byte
  no path can hold, and writes them unquoted (without it, git quotes
  and escapes any path outside ASCII). Where a tool can only write a
  path per line, as `tsc --listFilesOnly` does, the paths compared
  against its output are first checked for control characters, and one
  that has any is refused rather than split
  (`tsconfig-coverage.test.ts`).
- **Shell scripts run strict.** Each sets `-u` and `-o pipefail`, and
  `-e` unless it handles every failure itself, as
  `scripts/cloud-setup.sh` does and says; every expansion is quoted;
  and a list of paths passed between commands is NUL-separated (`-z`,
  `-print0`, `xargs -0`), never split on spaces or newlines.

## The page

- **Nothing loaded from elsewhere.** The page is the app's own bundle
  and the definitions file, both from its origin and served from the
  precache once installed ([offline.md](offline.md)); it calls no
  third-party service and sends nothing anywhere. Its only third-party
  code is Lit, bundled at build time.
- **No markup from data.** The components render through Lit's
  templates, which escape every value they interpolate, and nothing
  sets `innerHTML` or uses `unsafeHTML`, so text the user types, and
  the messages that quote it, can only ever be shown as text.
- **Generated code is checked, not trusted.** The precache manifest
  the build prepends to the service worker is serialized with
  `JSON.stringify`, every URL in it validated against a conservative
  character set, and the result parsed and rejected unless it is one
  `const` of plain literals ([offline.md](offline.md), "Offline
  behavior").
