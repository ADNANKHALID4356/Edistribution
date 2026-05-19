#!/usr/bin/env python3
"""Quick VPS PM2 status check (env-based credentials)."""
from __future__ import annotations

import os
import sys

import paramiko

HOST = os.environ.get("VPS_HOST", "147.93.108.205")
USER = os.environ.get("VPS_SSH_USER", "adminops")
PASSWORD = os.environ.get("VPS_SSH_PASSWORD")


def main() -> int:
    if not PASSWORD:
        print("Set VPS_SSH_PASSWORD in the environment.", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print("Connecting to VPS...")
        ssh.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=10)
        print("Connected.")

        for name in ("distribution-api", "backend"):
            print(f"\nRunning pm2 show {name}")
            _, stdout, _ = ssh.exec_command(f"pm2 desc {name} | grep 'script path'")
            print(stdout.read().decode("utf-8"))
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        ssh.close()


if __name__ == "__main__":
    raise SystemExit(main())
