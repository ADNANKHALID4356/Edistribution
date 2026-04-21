#!/usr/bin/env python3
"""
Deploy distribution backend on VPS: git pull (repo root), npm ci in backend/, pm2 restart.

Requires environment variable VPS_SSH_PASSWORD (same password is used for sudo when prompted).

Defaults (override with env vars):
  VPS_HOST=147.93.108.205
  VPS_SSH_USER=adminops
  VPS_REPO_DIR=/var/www/distribution-system
  VPS_PM2_NAME=distribution-api

PowerShell:
  $env:VPS_SSH_PASSWORD = '(your password)'
  python scripts/vps_pull_restart.py
"""
from __future__ import annotations

import os
import sys

import paramiko

HOST = os.environ.get("VPS_HOST", "147.93.108.205")
USER = os.environ.get("VPS_SSH_USER", "adminops")
PASSWORD = os.environ.get("VPS_SSH_PASSWORD")
REPO_DIR = os.environ.get("VPS_REPO_DIR", "/var/www/distribution-system")
PM2_NAME = os.environ.get("VPS_PM2_NAME", "distribution-api")
# On the VPS, origin may point at a different fork; production uses master_repo → distribution_system-main
GIT_REMOTE = os.environ.get("VPS_GIT_REMOTE", "master_repo")
GIT_REF = os.environ.get("VPS_GIT_REF", "master")


def _reconfigure_stdout() -> None:
    if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def run(client: paramiko.SSHClient, cmd: str) -> tuple[str, str]:
    _, stdout, stderr = client.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err


def sudo_line(client: paramiko.SSHClient, password: str, remote_cmd: str) -> tuple[str, str]:
    """Run a single command as root via sudo -S (password on stdin)."""
    stdin, stdout, stderr = client.exec_command(
        f"sudo -S bash -lc {repr(remote_cmd)}",
        get_pty=True,
    )
    stdin.write(password + "\n")
    stdin.flush()
    stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err


def main() -> int:
    _reconfigure_stdout()
    if not PASSWORD:
        print("Set VPS_SSH_PASSWORD in the environment.", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            HOST,
            username=USER,
            password=PASSWORD,
            timeout=30,
            allow_agent=False,
            look_for_keys=False,
        )
    except Exception as e:
        print(f"SSH connect failed: {e}", file=sys.stderr)
        return 1

    steps = [
        (f"cd {REPO_DIR} && git remote -v && git status -sb", False),
        (
            f"cd {REPO_DIR} && git fetch {GIT_REMOTE} {GIT_REF} && git reset --hard {GIT_REMOTE}/{GIT_REF}",
            False,
        ),
        # node_modules may be root-owned from past deploys; install + pm2 as root
        (
            f"cd {REPO_DIR}/backend && npm ci --omit=dev && pm2 restart {PM2_NAME} && pm2 show {PM2_NAME} | head -35",
            True,
        ),
    ]

    try:
        for cmd, as_root in steps:
            print(f"\n=== {'sudo: ' if as_root else ''}{cmd}\n")
            if as_root:
                out, err = sudo_line(client, PASSWORD, cmd)
            else:
                out, err = run(client, cmd)
            if out.strip():
                print(out)
            if err.strip():
                print(err, file=sys.stderr)
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
