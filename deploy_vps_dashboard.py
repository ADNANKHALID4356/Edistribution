#!/usr/bin/env python3
"""
Legacy wrapper for VPS backend deploy.
Use scripts/vps_pull_restart.py instead (env-based, no hardcoded secrets).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    script = Path(__file__).resolve().parent / "scripts" / "vps_pull_restart.py"
    print("Redirecting to scripts/vps_pull_restart.py")
    print("Set VPS_SSH_PASSWORD before running.")
    return subprocess.call([sys.executable, str(script)])


if __name__ == "__main__":
    raise SystemExit(main())
