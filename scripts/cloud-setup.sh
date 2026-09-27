#!/usr/bin/env bash
#
# Claude Code cloud environment setup script for pwa-units.
#
# KEEP IN SYNC: the cloud environment's "Setup script" field (claude.ai/code,
# environment settings) holds a pasted copy of this file. It is not read from
# the repository. When this file changes, paste the new contents there too,
# and vice versa. Bump the versions below when the repo files they mirror
# change (each pin names its source file). The environment's variables are
# kept the same way, in scripts/cloud-env, and the per-session work is the
# SessionStart hook in .claude/hooks/session-start.sh, which the repository
# itself supplies; README.md ("Cloud environment") describes the three.
#
# How the cloud runs it: once, as root, on Ubuntu 24.04, before Claude Code
# starts, with no repository checked out. The filesystem is then snapshotted
# and reused by later sessions, so this script only installs toolchain files.
# Per-session work (putting the toolchain on PATH for the session's shells,
# and pnpm install from the lockfile) is .claude/hooks/session-start.sh, not
# this script: the shells a session runs commands in are not login shells,
# so the profile.d entry written below does not reach them.
#
# What it does: installs the Node.js and pnpm the project requires under
# /opt/node24 (the base image ships Node 20/21/22 under /opt/nodeNN with 22 on
# PATH, and pnpm 10) and adds a profile.d entry that puts /opt/node24/bin
# first on PATH for login shells. Every step is idempotent: a rerun with the
# right versions already present downloads nothing.
#
# Exit status: 0 when the toolchain is in place. A failed *critical* step
# (Node.js or pnpm) exits 1, which fails the session start, because a session
# without Node 24 cannot run any project command (pnpm refuses with
# ERR_PNPM_BAD_RUNTIME_VERSION under the project's engine settings).
# Non-critical steps log and continue.
#
# No top-level `set -e` on purpose: every failure is handled explicitly.
set -u -o pipefail

# ---------------------------------------------------------------------------
# Pinned versions. Each comment names the repository file it mirrors.
# ---------------------------------------------------------------------------

# package.json "engines.node" and "devEngines.runtime" require >=24;
# README.md "Prerequisites" says Node.js 24 (the current LTS line). The repo
# pins no exact patch release, so this is the newest 24.x at the time of
# writing; bump it freely within the 24.x line.
NODE_VERSION="24.21.0"

# package.json "packageManager" and "devEngines.packageManager", and
# pnpm-lock.yaml "packageManagerDependencies". Must match exactly: pnpm
# refuses to run, or re-downloads itself, under any other version.
PNPM_VERSION="12.3.4"
# pnpm 12 is a native binary published as @pnpm/exe.<platform>; the "pnpm"
# npm package is only a wrapper around it. The integrity strings are copied
# from pnpm-lock.yaml, `packages: '@pnpm/exe.linux-x64@12.3.4'` and
# `'@pnpm/exe.linux-arm64@12.3.4'`. Update both when PNPM_VERSION changes.
PNPM_INTEGRITY_X64="sha512-2ZqOlSPkfwX1h5cR+FPiWf8+F+2hZT/3TvhUK5sigHqwaQCIiq8R7CGxhndKs63JtcLi2a1Qpo+wX/EoyfjyJQ=="
PNPM_INTEGRITY_ARM64="sha512-t71AVA7LRqiKTyZ5xMYaZc2n5DfdpMbfokZuiIOXHBOM03ECnF0t4iYwaBDqJgVjlKYUOwaF/bRQajGNA4cJ4w=="

# Where the toolchain lives. Follows the base image's /opt/nodeNN layout; the
# pnpm binary goes into the same bin directory so one PATH entry covers both.
# .claude/hooks/session-start.sh names the same directory.
NODE_PREFIX="/opt/node24"
# Sourced by login shells after the image's /etc/profile.d/nodejs.sh (which
# prepends /opt/node22/bin); "zz-" sorts it last so /opt/node24/bin wins.
PROFILE_FILE="/etc/profile.d/zz-pwa-units-node.sh"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { printf '[cloud-setup] %s\n' "$*"; }
err() { printf '[cloud-setup] ERROR: %s\n' "$*" >&2; }

FAILED=0
fail_critical() { err "$*"; FAILED=1; }

WORK="$(mktemp -d /tmp/cloud-setup.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

fetch() { # fetch <url> <dest>
  curl -fsSL --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 300 -o "$2" "$1"
}

case "$(uname -m)" in
  x86_64)
    NODE_ARCH="x64"
    PNPM_INTEGRITY="$PNPM_INTEGRITY_X64"
    ;;
  aarch64 | arm64)
    NODE_ARCH="arm64"
    PNPM_INTEGRITY="$PNPM_INTEGRITY_ARM64"
    ;;
  *)
    NODE_ARCH=""
    PNPM_INTEGRITY=""
    ;;
esac

# ---------------------------------------------------------------------------
# Decide what is missing (idempotency checks)
# ---------------------------------------------------------------------------
NEED_NODE=1
if [ -x "$NODE_PREFIX/bin/node" ] &&
  [ "$("$NODE_PREFIX/bin/node" --version 2>/dev/null)" = "v$NODE_VERSION" ]; then
  NEED_NODE=0
  log "Node.js v$NODE_VERSION already installed at $NODE_PREFIX"
fi

NEED_PNPM=1
if [ -x "$NODE_PREFIX/bin/pnpm" ] &&
  [ "$("$NODE_PREFIX/bin/pnpm" --version 2>/dev/null)" = "$PNPM_VERSION" ]; then
  NEED_PNPM=0
  log "pnpm $PNPM_VERSION already installed at $NODE_PREFIX/bin/pnpm"
fi

# ---------------------------------------------------------------------------
# Downloads (independent, run in parallel, each verified against the
# checksum its publisher provides)
# ---------------------------------------------------------------------------
NODE_TARBALL="node-v$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
NODE_BASE_URL="https://nodejs.org/dist/v$NODE_VERSION"
PNPM_URL="https://registry.npmjs.org/@pnpm/exe.linux-$NODE_ARCH/-/exe.linux-$NODE_ARCH-$PNPM_VERSION.tgz"

download_node() {
  log "Downloading Node.js v$NODE_VERSION ($NODE_ARCH) from nodejs.org"
  fetch "$NODE_BASE_URL/SHASUMS256.txt" "$WORK/SHASUMS256.txt" || {
    err "download failed: $NODE_BASE_URL/SHASUMS256.txt (is nodejs.org allowed?)"
    return 1
  }
  fetch "$NODE_BASE_URL/$NODE_TARBALL" "$WORK/$NODE_TARBALL" || {
    err "download failed: $NODE_BASE_URL/$NODE_TARBALL (is nodejs.org allowed?)"
    return 1
  }
  # SHASUMS256.txt is the checksum list Node.js publishes with each release.
  (cd "$WORK" && grep " $NODE_TARBALL\$" SHASUMS256.txt | sha256sum -c --quiet -) || {
    err "sha256 mismatch for $NODE_TARBALL"
    return 1
  }
  log "Node.js tarball checksum verified"
}

download_pnpm() {
  log "Downloading pnpm $PNPM_VERSION ($NODE_ARCH) from registry.npmjs.org"
  fetch "$PNPM_URL" "$WORK/pnpm.tgz" || {
    err "download failed: $PNPM_URL (is registry.npmjs.org allowed?)"
    return 1
  }
  # The registry's sha512 integrity for this tarball, as recorded in
  # pnpm-lock.yaml (the same value `pnpm install` itself checks).
  local actual
  actual="sha512-$(openssl dgst -sha512 -binary "$WORK/pnpm.tgz" | base64 -w0)"
  if [ "$actual" != "$PNPM_INTEGRITY" ]; then
    err "sha512 mismatch for pnpm $PNPM_VERSION tarball: got $actual"
    return 1
  fi
  log "pnpm tarball checksum verified"
}

NODE_DL_STATUS=0
PNPM_DL_STATUS=0
if [ -z "$NODE_ARCH" ]; then
  fail_critical "unsupported architecture $(uname -m)"
  NEED_NODE=0
  NEED_PNPM=0
fi
if [ "$NEED_NODE" -eq 1 ]; then download_node & NODE_DL_PID=$!; fi
if [ "$NEED_PNPM" -eq 1 ]; then download_pnpm & PNPM_DL_PID=$!; fi
if [ "$NEED_NODE" -eq 1 ]; then wait "$NODE_DL_PID" || NODE_DL_STATUS=$?; fi
if [ "$NEED_PNPM" -eq 1 ]; then wait "$PNPM_DL_PID" || PNPM_DL_STATUS=$?; fi

# ---------------------------------------------------------------------------
# Node.js (critical)
# ---------------------------------------------------------------------------
if [ "$NEED_NODE" -eq 1 ]; then
  if [ "$NODE_DL_STATUS" -ne 0 ]; then
    fail_critical "Node.js v$NODE_VERSION download failed; see messages above"
  else
    log "Installing Node.js v$NODE_VERSION to $NODE_PREFIX"
    # Keep the pnpm binary (if any) across a Node reinstall: it lives in the
    # same bin directory but is installed separately below.
    OLD_PNPM=""
    if [ -x "$NODE_PREFIX/bin/pnpm" ]; then
      cp "$NODE_PREFIX/bin/pnpm" "$WORK/pnpm.keep" && OLD_PNPM="$WORK/pnpm.keep"
    fi
    rm -rf "$NODE_PREFIX.tmp" &&
      mkdir -p "$NODE_PREFIX.tmp" &&
      tar -xJf "$WORK/$NODE_TARBALL" --strip-components=1 -C "$NODE_PREFIX.tmp" &&
      rm -rf "$NODE_PREFIX" &&
      mv "$NODE_PREFIX.tmp" "$NODE_PREFIX" ||
      fail_critical "extracting Node.js into $NODE_PREFIX failed"
    if [ -n "$OLD_PNPM" ] && [ "$NEED_PNPM" -eq 0 ]; then
      cp "$OLD_PNPM" "$NODE_PREFIX/bin/pnpm" && chmod 755 "$NODE_PREFIX/bin/pnpm" ||
        NEED_PNPM=1
    fi
    if [ "$("$NODE_PREFIX/bin/node" --version 2>/dev/null)" != "v$NODE_VERSION" ]; then
      fail_critical "$NODE_PREFIX/bin/node does not report v$NODE_VERSION"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# pnpm (critical). The tarball holds a single static binary at package/pnpm.
# It finds Node.js on PATH at run time, so it needs no install step beyond
# being placed next to node.
# ---------------------------------------------------------------------------
if [ "$NEED_PNPM" -eq 1 ]; then
  if [ "$PNPM_DL_STATUS" -ne 0 ]; then
    fail_critical "pnpm $PNPM_VERSION download failed; see messages above"
  elif [ ! -d "$NODE_PREFIX/bin" ]; then
    fail_critical "skipping pnpm install because $NODE_PREFIX/bin does not exist"
  else
    log "Installing pnpm $PNPM_VERSION to $NODE_PREFIX/bin/pnpm"
    tar -xzf "$WORK/pnpm.tgz" -C "$WORK" package/pnpm &&
      install -m 755 "$WORK/package/pnpm" "$NODE_PREFIX/bin/pnpm.tmp" &&
      mv -f "$NODE_PREFIX/bin/pnpm.tmp" "$NODE_PREFIX/bin/pnpm" ||
      fail_critical "placing the pnpm binary failed"
    if [ "$("$NODE_PREFIX/bin/pnpm" --version 2>/dev/null)" != "$PNPM_VERSION" ]; then
      fail_critical "$NODE_PREFIX/bin/pnpm does not report $PNPM_VERSION"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# PATH for login shells (non-critical: the SessionStart hook exports it for
# the session's own shells, which are not login shells)
# ---------------------------------------------------------------------------
PROFILE_CONTENT="# Written by scripts/cloud-setup.sh (pwa-units). Puts the project's Node.js
# and pnpm ahead of the base image's /opt/node22/bin set by nodejs.sh.
export PATH=\"$NODE_PREFIX/bin:\$PATH\"
"
if [ "$(cat "$PROFILE_FILE" 2>/dev/null)" = "$(printf '%s' "$PROFILE_CONTENT")" ]; then
  log "$PROFILE_FILE already up to date"
else
  printf '%s' "$PROFILE_CONTENT" >"$PROFILE_FILE" && chmod 644 "$PROFILE_FILE" &&
    log "wrote $PROFILE_FILE" ||
    err "could not write $PROFILE_FILE (continuing)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log "---- installed versions ----"
log "node: $("$NODE_PREFIX/bin/node" --version 2>/dev/null || echo MISSING)  ($NODE_PREFIX/bin/node)"
log "npm:  $("$NODE_PREFIX/bin/npm" --version 2>/dev/null || echo MISSING)"
log "pnpm: $("$NODE_PREFIX/bin/pnpm" --version 2>/dev/null || echo MISSING)  ($NODE_PREFIX/bin/pnpm)"
log "PATH entry: $PROFILE_FILE"

if [ "$FAILED" -ne 0 ]; then
  err "setup FAILED: the project toolchain is incomplete (see errors above)"
  exit 1
fi
log "setup complete"
exit 0
