#!/usr/bin/env bash
#
# SessionStart hook for Claude Code on the web (claude.ai/code). Registered in
# .claude/settings.json; README.md ("Cloud environment") describes how it
# fits with scripts/cloud-setup.sh and scripts/cloud-env.
#
# The cloud runs scripts/cloud-setup.sh once, before any repository is
# checked out, and it installs Node.js 24 and pnpm under /opt/node24. That is
# all a snapshot can hold. Two things remain per session, and this hook does
# them, synchronously, before the session's first command:
#
# 1. Put /opt/node24/bin first on PATH for the session's shells. They are not
#    login shells, so the profile.d entry the setup script writes does not
#    reach them, and without this they find the base image's Node.js 22,
#    under which pnpm refuses to run (ERR_PNPM_BAD_RUNTIME_VERSION). The
#    export goes into $CLAUDE_ENV_FILE, which Claude Code sources for every
#    command it runs in the session.
# 2. Install the dependencies from the lockfile with `pnpm install`. The
#    lockfile is frozen by pnpm-workspace.yaml for every install, so the
#    `--frozen-lockfile` below changes nothing and is written out so that
#    the hook says what it does. pnpm only: never npm, npx, yarn or corepack
#    (see README.md). The install is incremental, so a rerun with
#    node_modules already in sync is a second's check.
#
# It runs only on the web ($CLAUDE_CODE_REMOTE): on a developer's machine the
# toolchain is theirs to manage, and the hook exits at once. A missing
# toolchain fails the hook with a message naming the setup script, since a
# session that cannot run pnpm cannot do anything the project asks.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

log() { printf '[session-start] %s\n' "$*"; }
die() {
  printf '[session-start] ERROR: %s\n' "$*" >&2
  exit 1
}

# The same directory scripts/cloud-setup.sh installs into.
NODE_PREFIX="/opt/node24"

[ -x "$NODE_PREFIX/bin/node" ] ||
  die "$NODE_PREFIX/bin/node is missing: the environment's setup script (scripts/cloud-setup.sh) has not run, or failed"
[ -x "$NODE_PREFIX/bin/pnpm" ] ||
  die "$NODE_PREFIX/bin/pnpm is missing: the environment's setup script (scripts/cloud-setup.sh) has not run, or failed"

export PATH="$NODE_PREFIX/bin:$PATH"
# Single quotes on purpose: the line is evaluated when the file is sourced,
# so it prepends to whatever PATH each command starts from.
echo 'export PATH="/opt/node24/bin:$PATH"' >>"${CLAUDE_ENV_FILE:?CLAUDE_ENV_FILE is not set}"
log "node $(node --version), pnpm $(pnpm --version), from $NODE_PREFIX/bin (exported to the session's PATH)"

cd "${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR is not set}"
log "pnpm install --frozen-lockfile in $PWD"
pnpm install --frozen-lockfile
log "done"
