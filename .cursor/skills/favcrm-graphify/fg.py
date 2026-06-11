#!/usr/bin/env python3
"""Bootstrap fg.py — forwards to monorepo favcrm-graphify CLI."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def find_root() -> Path:
    env = __import__("os").environ.get("FAVCRM_ROOT")
    if env:
        return Path(env).expanduser().resolve()

    for origin in [Path.cwd().resolve(), Path(__file__).resolve().parent]:
        for candidate in [origin, *origin.parents]:
            fg = candidate / ".cursor" / "skills" / "favcrm-graphify" / "scripts" / "fg.py"
            if fg.exists() and (candidate / "v2" / "api").is_dir():
                return candidate

    raise SystemExit(
        "FavCRM monorepo root not found. cd into the monorepo or set FAVCRM_ROOT."
    )


def main() -> None:
    root = find_root()
    fg = root / ".cursor" / "skills" / "favcrm-graphify" / "scripts" / "fg.py"
    # Preserve caller cwd so `fg.py here` detects the sub-repo correctly.
    raise SystemExit(subprocess.call([sys.executable, str(fg), *sys.argv[1:]]))


if __name__ == "__main__":
    main()
